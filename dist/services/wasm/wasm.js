import { deleteProperty, isNumber, compileWasm, shouldHandleViewRetentionPause, isProxy } from '../../shared/utils.js';
import { SCOPE_PROXY_BIND } from '../../core/scope/scope.js';

const WASM_SCOPE_IMPORT_NAMESPACE = "angular_ts";
const WASM_ABI_VERSION = 3;
const WASM_SCOPE_DEFAULT_ORIGIN = "wasm";
const MAX_WASM_ABI_PATH_BYTES = 16 * 1024;
const MAX_WASM_ABI_PAYLOAD_BYTES = 16 * 1024 * 1024;
const MAX_WASM_ABI_SCOPES = 1024;
const MAX_WASM_ABI_WATCHES = 4096;
const MAX_WASM_ABI_RESULT_BUFFERS = 1024;
const MAX_WASM_ABI_BUFFER_BYTES = 64 * 1024 * 1024;
const MAX_WASM_GUEST_CALLBACK_DEPTH = 32;
const MAX_WASM_MODULE_CACHE_ENTRIES = 64;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const UNSAFE_SCOPE_PATH_KEYS = new Set([
    "__proto__",
    "constructor",
    "prototype",
]);
/** Structured error raised by the high-level WebAssembly host. */
class WasmError extends Error {
    constructor(code, message, options = {}) {
        super(message, { cause: options.cause });
        this.name = "WasmError";
        this.code = code;
        this.source = options.source;
        this.stage = options.stage;
    }
}
/** Machine-readable failures available to guests through `error_code`. */
const WasmAbiError = Object.freeze({
    none: 0,
    disposed: 1,
    invalidHandle: 2,
    invalidPointer: 3,
    invalidLength: 4,
    invalidJson: 5,
    unsafePath: 6,
    limitExceeded: 7,
    invalidTransaction: 8,
    unsupportedValue: 9,
    operationFailed: 10,
});
const wasmScopeRetentionStates = new WeakMap();
function resolveWasmScopeName(scope, requestedName) {
    return requestedName ?? scope.$scopename ?? String(scope.$id);
}
/** @internal */
class WasmScopeImpl {
    /**
     * Creates a host-side Wasm wrapper around an AngularTS scope.
     *
     * Prefer `WasmScopeAbi.createScope()` so the wrapper is registered with an
     * ABI handle table immediately.
     */
    /** @internal */
    constructor(abi, scope, handle, options = {}) {
        /** @internal */
        this._pendingWrites = new Map();
        /** @internal */
        this._watchedPaths = new Map();
        this._abi = abi;
        this._scope = scope;
        this.handle = handle;
        this.name = resolveWasmScopeName(scope, options.name);
        this._bindings = [];
        this._syncCallbacks = [];
        this._syncScheduled = false;
        this._destroyed = false;
        this._retentionState = getWasmScopeRetentionState(scope);
        this._bindings.push(scope.$on("$destroy", () => {
            this.dispose();
        }));
    }
    /** Whether this wrapper has been disposed. */
    get disposed() {
        return this._destroyed;
    }
    /** Reads a dot-separated path from the wrapped AngularTS scope. */
    get(path) {
        return readScopePath(this._scope, path);
    }
    /** Writes a dot-separated path into the wrapped AngularTS scope. */
    set(path, value, options = {}) {
        const rollback = this._trackWrite(path, value, options, false);
        const written = writeScopePath(this._scope, path, value);
        if (!written)
            rollback();
        return written;
    }
    /** Deletes a dot-separated path from the wrapped AngularTS scope. */
    delete(path, options = {}) {
        const rollback = this._trackWrite(path, undefined, options, true);
        const deleted = deleteScopePath(this._scope, path);
        if (!deleted)
            rollback();
        return deleted;
    }
    /** Applies one atomic set/delete transaction. */
    apply(transaction, options = {}) {
        const normalized = normalizeWasmScopeTransaction(transaction);
        const model = this._scope;
        const rollbacks = [
            ...Object.entries(normalized.set).map(([path, value]) => this._trackWrite(path, value, options, false)),
            ...normalized.delete.map((path) => this._trackWrite(path, undefined, options, true)),
        ];
        try {
            if (typeof model.$snapshot === "function" &&
                typeof model.$restore === "function") {
                const snapshot = model.$snapshot();
                applyWasmScopeTransaction(snapshot, normalized);
                model.$restore(snapshot, {
                    origin: options.origin,
                    mode: "replace",
                });
            }
            else {
                this._scope.$batch(() => {
                    applyWasmScopeTransaction(this._scope, normalized);
                });
            }
        }
        catch (error) {
            for (let index = rollbacks.length - 1; index >= 0; index--) {
                rollbacks[index]();
            }
            throw error;
        }
        return true;
    }
    /** Reads a scope path as an owned byte array. */
    getBinary(path) {
        return copyWasmBinaryValue(this.get(path));
    }
    /** Writes an owned copy of a byte sequence into a scope path. */
    setBinary(path, value, options = {}) {
        const bytes = copyWasmBinaryValue(value);
        if (!bytes) {
            return false;
        }
        return this.set(path, bytes, options);
    }
    /** Runs queued Wasm bridge callbacks for this scope. */
    sync() {
        this._scheduleSyncCallbacks();
    }
    /** @internal */
    _scheduleSyncCallbacks() {
        if (this._syncScheduled || this._syncCallbacks.length === 0) {
            return;
        }
        this._syncScheduled = true;
        queueMicrotask(() => {
            if (this._destroyed) {
                return;
            }
            this._syncScheduled = false;
            const callbacks = this._syncCallbacks.slice();
            for (let i = 0, l = callbacks.length; i < l; i++) {
                callbacks[i]();
            }
        });
    }
    /**
     * Registers a callback that runs before this scope syncs.
     *
     * Generated Wasm bridges use this to sync Rust-owned public fields back onto
     * AngularTS controller wrappers when Rust async code calls `WasmScope::sync`.
     */
    onSync(callback) {
        if (this._destroyed) {
            return () => undefined;
        }
        this._syncCallbacks.push(callback);
        return () => {
            const index = this._syncCallbacks.indexOf(callback);
            if (index >= 0) {
                this._syncCallbacks.splice(index, 1);
            }
        };
    }
    /**
     * Watches one scope path and calls `callback` when AngularTS observes a change.
     *
     * The returned function removes only this watch registration.
     */
    watch(path, callback, options = {}) {
        this._watchedPaths.set(path, (this._watchedPaths.get(path) ?? 0) + 1);
        const dispose = this._scope.$watch(path, (value) => {
            if (this._destroyed) {
                return;
            }
            const pendingWrites = this._pendingWrites.get(path);
            const deleted = !hasScopePath(this._scope, path);
            let origin;
            if (pendingWrites) {
                const pending = pendingWrites.shift();
                if (pendingWrites.length === 0)
                    this._pendingWrites.delete(path);
                origin = pending?._origin;
                if (pending && !pending._echo) {
                    return;
                }
            }
            queueScopeAwareWasmCallback(this._scope, this._retentionState, `${String(this.handle)}:${path}`, () => {
                callback({
                    scopeHandle: this.handle,
                    scopeName: this.name,
                    path,
                    value,
                    deleted,
                    origin,
                });
            });
        }, !options.initial);
        let disposed = false;
        return () => {
            if (disposed)
                return;
            disposed = true;
            dispose?.();
            const count = (this._watchedPaths.get(path) ?? 1) - 1;
            if (count > 0) {
                this._watchedPaths.set(path, count);
            }
            else {
                this._watchedPaths.delete(path);
                this._pendingWrites.delete(path);
            }
        };
    }
    /** @internal */
    _trackWrite(path, value, options, deleted) {
        if (!this._watchedPaths.has(path)) {
            return () => undefined;
        }
        if (deleted
            ? !hasScopePath(this._scope, path)
            : hasScopePath(this._scope, path) &&
                Object.is(readScopePath(this._scope, path), value)) {
            return () => undefined;
        }
        const previous = this._pendingWrites.get(path)?.slice();
        const pendingWrites = this._pendingWrites.get(path) ?? [];
        pendingWrites.push({
            _deleted: deleted,
            _echo: options.echo ?? true,
            _origin: options.origin,
            _value: value,
        });
        this._pendingWrites.set(path, pendingWrites);
        return () => {
            if (previous)
                this._pendingWrites.set(path, previous);
            else
                this._pendingWrites.delete(path);
        };
    }
    /** Binds this scope to its ABI's guest callbacks and watched paths. */
    bind(options = {}) {
        this._abi._notifyBind(this);
        const disposers = (options.watch ?? []).map((path) => this.watch(path, (update) => {
            this._abi._queueUpdate(update);
        }, { initial: options.initial ?? true }));
        let disposed = false;
        const dispose = () => {
            if (disposed) {
                return;
            }
            disposed = true;
            for (let i = 0, l = disposers.length; i < l; i++) {
                disposers[i]();
            }
            this._abi._notifyUnbind(this);
        };
        this._bindings.push(dispose);
        return dispose;
    }
    /** Disposes ABI bindings without destroying the underlying AngularTS scope. */
    dispose() {
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;
        const bindings = this._bindings.splice(0);
        for (let i = 0, l = bindings.length; i < l; i++) {
            bindings[i]();
        }
        this._syncCallbacks.length = 0;
        this._pendingWrites.clear();
        this._watchedPaths.clear();
        this._syncScheduled = false;
        this._abi._unregisterScope(this.handle);
    }
}
/** @internal */
class WasmScopeAbiImpl {
    /** Creates a detached scope ABI whose imports are ready for instantiation. */
    constructor(reportGuestFault = rethrowWasmFault, diagnostics = false, diagnosticSource) {
        /** @internal */
        this._nextScopeHandle = 1;
        /** @internal */
        this._nextBufferHandle = 1;
        /** @internal */
        this._nextWatchHandle = 1;
        /** @internal */
        this._scopes = new Map();
        /** @internal */
        this._scopesByName = new Map();
        /** @internal */
        this._buffers = new Map();
        /** @internal */
        this._watches = new Map();
        /** @internal */
        this._pendingGuestTransactions = new Map();
        /** @internal */
        this._guestTransactionScheduled = false;
        /** @internal */
        this._bufferBytes = 0;
        /** @internal */
        this._guestCallbackDepth = 0;
        /** @internal */
        this._lastError = WasmAbiError.none;
        /** @internal */
        this._disposed = false;
        this._reportGuestFault = reportGuestFault;
        this._diagnostics = diagnostics;
        this._diagnosticSource = diagnosticSource;
        this.imports = {
            [WASM_SCOPE_IMPORT_NAMESPACE]: {
                scope_resolve: (namePtr, nameLen) => this._guardGuestCall("scope_resolve", () => this._scopeResolve(namePtr, nameLen), 0),
                scope_get: (scopeHandle, pathPtr, pathLen) => this._guardGuestCall("scope_get", () => this._scopeGet(scopeHandle, pathPtr, pathLen), 0),
                scope_set: (scopeHandle, pathPtr, pathLen, valuePtr, valueLen) => this._guardGuestCall("scope_set", () => this._scopeSet(scopeHandle, pathPtr, pathLen, valuePtr, valueLen), 0),
                scope_apply: (scopeHandle, transactionPtr, transactionLen) => this._guardGuestCall("scope_apply", () => this._scopeApply(scopeHandle, transactionPtr, transactionLen), 0),
                scope_get_binary: (scopeHandle, pathPtr, pathLen) => this._guardGuestCall("scope_get_binary", () => this._scopeGetBinary(scopeHandle, pathPtr, pathLen), 0),
                scope_set_binary: (scopeHandle, pathPtr, pathLen, valuePtr, valueLen, optionsPtr, optionsLen) => this._guardGuestCall("scope_set_binary", () => this._scopeSetBinary(scopeHandle, pathPtr, pathLen, valuePtr, valueLen, optionsPtr, optionsLen), 0),
                scope_delete: (scopeHandle, pathPtr, pathLen) => this._guardGuestCall("scope_delete", () => this._scopeDelete(scopeHandle, pathPtr, pathLen), 0),
                scope_sync: (scopeHandle) => this._guardGuestCall("scope_sync", () => this._scopeSync(scopeHandle), 0),
                scope_watch: (scopeHandle, pathPtr, pathLen) => this._guardGuestCall("scope_watch", () => this._scopeWatch(scopeHandle, pathPtr, pathLen), 0),
                scope_unwatch: (watchHandle) => this._guardGuestCall("scope_unwatch", () => this._scopeUnwatch(watchHandle), 0),
                scope_unbind: (scopeHandle) => this._guardGuestCall("scope_unbind", () => this._scopeUnbind(scopeHandle), 0),
                buffer_ptr: (bufferHandle) => this._guardGuestCall("buffer_ptr", () => this._requireBuffer(bufferHandle)._ptr, 0),
                buffer_len: (bufferHandle) => this._guardGuestCall("buffer_len", () => this._requireBuffer(bufferHandle)._len, 0),
                buffer_free: (bufferHandle) => {
                    this._guardGuestCall("buffer_free", () => {
                        this._freeBuffer(bufferHandle);
                    }, undefined);
                },
                error_code: () => this._lastError,
                error_clear: () => {
                    this._lastError = WasmAbiError.none;
                },
            },
        };
    }
    /** True after this ABI and all of its bindings have been disposed. */
    get disposed() {
        return this._disposed;
    }
    /** Attaches and validates guest exports after instantiation. */
    attach(exports$1) {
        if (this._disposed) {
            throw new Error("Cannot attach exports to a disposed Wasm scope ABI");
        }
        if (!hasWasmAbiCoreExports(exports$1)) {
            throw new Error("WebAssembly module does not export the AngularTS reactive ABI");
        }
        const version = readWasmAbiVersion(exports$1);
        if (version !== WASM_ABI_VERSION) {
            throw new WasmAbiVersionError(version);
        }
        if (this._exports && this._exports !== exports$1) {
            throw new Error("Wasm scope ABI exports are already attached");
        }
        this._exports = exports$1;
    }
    /** Creates and registers a scope wrapper. */
    createScope(scope, options = {}) {
        if (this._disposed) {
            throw new Error("Cannot create a scope from a disposed Wasm scope ABI");
        }
        if (scope.$handler._destroyed) {
            throw new Error("Cannot bind a destroyed AngularTS reactive target");
        }
        const name = resolveWasmScopeName(scope, options.name);
        if (name.trim().length === 0) {
            throw new Error("Wasm scope name must not be empty");
        }
        if (this._scopesByName.has(name)) {
            throw new Error(`Wasm scope name '${name}' is already bound`);
        }
        if (this._scopes.size >= MAX_WASM_ABI_SCOPES) {
            throw new Error("AngularTS Wasm ABI scope limit exceeded");
        }
        const handle = this._nextScopeHandle++;
        const wasmScope = new WasmScopeImpl(this, scope, handle, {
            ...options,
            name,
        });
        this._scopes.set(handle, wasmScope);
        this._scopesByName.set(wasmScope.name, wasmScope);
        return wasmScope;
    }
    /** Returns a previously registered scope wrapper. */
    getScope(reference) {
        return this._resolveScope(reference);
    }
    /** @internal */
    _unregisterScope(handle) {
        const scope = this._scopes.get(handle);
        if (!scope) {
            return false;
        }
        if (this._scopesByName.get(scope.name) === scope) {
            this._scopesByName.delete(scope.name);
        }
        for (const [watchHandle, watch] of this._watches) {
            if (watch._scope === scope) {
                watch._dispose();
                this._watches.delete(watchHandle);
            }
        }
        this._pendingGuestTransactions.delete(handle);
        return this._scopes.delete(handle);
    }
    /** @internal */
    _notifyBind(scope) {
        const exports$1 = this._requireExports();
        if (!exports$1.ng_scope_on_bind) {
            return;
        }
        this._withGuestString(scope.name, (namePtr, nameLen) => {
            this._runGuestCallback("bind", () => {
                exports$1.ng_scope_on_bind?.(scope.handle, namePtr, nameLen);
            });
        });
    }
    /** @internal */
    _queueUpdate(update) {
        let pending = this._pendingGuestTransactions.get(update.scopeHandle);
        if (!pending) {
            pending = {
                _scopeName: update.scopeName,
                _set: Object.create(null),
                _delete: new Set(),
                _origins: new Set(),
            };
            this._pendingGuestTransactions.set(update.scopeHandle, pending);
        }
        if (update.deleted) {
            deleteProperty(pending._set, update.path);
            pending._delete.add(update.path);
        }
        else {
            pending._delete.delete(update.path);
            pending._set[update.path] = update.value;
        }
        pending._origins.add(update.origin);
        if (this._guestTransactionScheduled) {
            return;
        }
        this._guestTransactionScheduled = true;
        queueMicrotask(() => {
            this._guestTransactionScheduled = false;
            if (this._disposed) {
                return;
            }
            const transactions = Array.from(this._pendingGuestTransactions);
            this._pendingGuestTransactions.clear();
            for (const [scopeHandle, transaction] of transactions) {
                this._notifyTransaction(scopeHandle, transaction);
            }
        });
    }
    /** @internal */
    _notifyTransaction(scopeHandle, pending) {
        const exports$1 = this._requireExports();
        if (!exports$1.ng_scope_on_transaction) {
            return;
        }
        const origins = Array.from(pending._origins);
        const origin = origins.length === 1 ? origins[0] : undefined;
        const transaction = {
            set: pending._set,
            delete: Array.from(pending._delete),
            ...(origin === undefined ? {} : { origin }),
        };
        try {
            this._withGuestJson(transaction, (transactionPtr, transactionLen) => {
                this._runGuestCallback("transaction", () => {
                    exports$1.ng_scope_on_transaction?.(scopeHandle, transactionPtr, transactionLen);
                });
            });
        }
        catch (error) {
            const scope = this._scopes.get(scopeHandle);
            scope?.dispose();
            this._reportGuestFault(error);
        }
    }
    /** @internal */
    _notifyUnbind(scope) {
        try {
            this._runGuestCallback("unbind", () => {
                this._exports?.ng_scope_on_unbind?.(scope.handle);
            });
        }
        catch (error) {
            queueMicrotask(() => {
                this._reportGuestFault(error);
            });
        }
    }
    /** @internal */
    _freeBuffer(bufferHandle) {
        const buffer = this._buffers.get(bufferHandle);
        if (!buffer)
            throw createWasmGuestError("invalidHandle");
        this._buffers.delete(bufferHandle);
        this._bufferBytes -= buffer._len;
        this._requireExports().ng_abi_free(buffer._ptr, buffer._len);
    }
    /**
     * Dispose every scope, watch, and result buffer owned by this ABI.
     *
     * The underlying AngularTS scopes remain alive; only their Wasm bindings are
     * released.
     */
    dispose() {
        if (this._disposed)
            return;
        this._disposed = true;
        for (const scope of Array.from(this._scopes.values()))
            scope.dispose();
        for (const bufferHandle of Array.from(this._buffers.keys())) {
            this._freeBuffer(bufferHandle);
        }
        this._watches.clear();
        this._pendingGuestTransactions.clear();
        this._scopes.clear();
        this._scopesByName.clear();
        this._exports = undefined;
    }
    /** @internal */
    _scopeResolve(namePtr, nameLen) {
        return (this._resolveScope(this._readGuestString(namePtr, nameLen, MAX_WASM_ABI_PATH_BYTES, "scope name"))?.handle ?? 0);
    }
    /** @internal */
    _scopeGet(scopeReference, pathPtr, pathLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope)
            throw createWasmGuestError("invalidHandle");
        const path = this._readGuestString(pathPtr, pathLen, MAX_WASM_ABI_PATH_BYTES, "scope path");
        assertSafeWasmScopePath(path);
        return this._createResultBuffer(scope.get(path));
    }
    /** @internal */
    _scopeSet(scopeReference, pathPtr, pathLen, valuePtr, valueLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope)
            throw createWasmGuestError("invalidHandle");
        const path = this._readGuestString(pathPtr, pathLen, MAX_WASM_ABI_PATH_BYTES, "scope path");
        assertSafeWasmScopePath(path);
        const value = this._readGuestJson(valuePtr, valueLen);
        const options = normalizeWasmScopeWriteOptions(undefined, false);
        scope.set(path, value, options);
        return 1;
    }
    /** @internal */
    _scopeApply(scopeReference, transactionPtr, transactionLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope)
            throw createWasmGuestError("invalidHandle");
        const request = this._readGuestJson(transactionPtr, transactionLen);
        const options = normalizeWasmScopeWriteOptions(request, false);
        scope.apply(request, options);
        return 1;
    }
    /** @internal */
    _scopeGetBinary(scopeReference, pathPtr, pathLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope)
            throw createWasmGuestError("invalidHandle");
        const path = this._readGuestString(pathPtr, pathLen, MAX_WASM_ABI_PATH_BYTES, "scope path");
        assertSafeWasmScopePath(path);
        const bytes = scope.getBinary(path);
        if (!bytes)
            throw createWasmGuestError("unsupportedValue");
        return this._createResultBytes(bytes);
    }
    /** @internal */
    _scopeSetBinary(scopeReference, pathPtr, pathLen, valuePtr, valueLen, optionsPtr, optionsLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope)
            throw createWasmGuestError("invalidHandle");
        const path = this._readGuestString(pathPtr, pathLen, MAX_WASM_ABI_PATH_BYTES, "scope path");
        assertSafeWasmScopePath(path);
        const value = this._readGuestBytes(valuePtr, valueLen).slice();
        const options = normalizeWasmScopeWriteOptions(optionsLen === 0
            ? undefined
            : this._readGuestJson(optionsPtr, optionsLen), false);
        scope.set(path, value, options);
        return 1;
    }
    /** @internal */
    _scopeDelete(scopeReference, pathPtr, pathLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope)
            throw createWasmGuestError("invalidHandle");
        const path = this._readGuestString(pathPtr, pathLen, MAX_WASM_ABI_PATH_BYTES, "scope path");
        assertSafeWasmScopePath(path);
        const options = normalizeWasmScopeWriteOptions(undefined, false);
        if (!scope.delete(path, options)) {
            throw createWasmGuestError("operationFailed");
        }
        return 1;
    }
    /** @internal */
    _scopeSync(scopeReference) {
        const scope = this._resolveScope(scopeReference);
        if (!scope)
            throw createWasmGuestError("invalidHandle");
        scope.sync();
        return 1;
    }
    /** @internal */
    _scopeWatch(scopeReference, pathPtr, pathLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope)
            throw createWasmGuestError("invalidHandle");
        if (this._watches.size >= MAX_WASM_ABI_WATCHES) {
            throw createWasmGuestError("limitExceeded");
        }
        const path = this._readGuestString(pathPtr, pathLen, MAX_WASM_ABI_PATH_BYTES, "scope path");
        assertSafeWasmScopePath(path);
        const watchHandle = this._nextWatchHandle++;
        const dispose = scope.watch(path, (update) => {
            this._queueUpdate(update);
        });
        this._watches.set(watchHandle, {
            _scope: scope,
            _dispose: dispose,
        });
        return watchHandle;
    }
    /** @internal */
    _scopeUnwatch(watchHandle) {
        const watch = this._watches.get(watchHandle);
        if (!watch)
            throw createWasmGuestError("invalidHandle");
        this._watches.delete(watchHandle);
        watch._dispose();
        return 1;
    }
    /** @internal */
    _scopeUnbind(scopeReference) {
        const scope = this._resolveScope(scopeReference);
        if (!scope)
            throw createWasmGuestError("invalidHandle");
        scope.dispose();
        return 1;
    }
    /** @internal */
    _createResultBuffer(value) {
        return this._createResultBytes(textEncoder.encode(JSON.stringify(value ?? null)));
    }
    /** @internal */
    _createResultBytes(bytes) {
        if (this._buffers.size >= MAX_WASM_ABI_RESULT_BUFFERS) {
            throw createWasmGuestError("limitExceeded");
        }
        if (this._bufferBytes + bytes.byteLength > MAX_WASM_ABI_BUFFER_BYTES) {
            throw createWasmGuestError("limitExceeded");
        }
        const bufferHandle = this._nextBufferHandle++;
        const { ptr, len } = this._writeGuestBytes(bytes);
        this._buffers.set(bufferHandle, {
            _ptr: ptr,
            _len: len,
        });
        this._bufferBytes += len;
        return bufferHandle;
    }
    /** @internal */
    _readGuestString(ptr, len, maximum = MAX_WASM_ABI_PAYLOAD_BYTES, label = "payload") {
        const bytes = this._readGuestBytes(ptr, len, maximum, label);
        return textDecoder.decode(bytes);
    }
    /** @internal */
    _readGuestBytes(ptr, len, maximum = MAX_WASM_ABI_PAYLOAD_BYTES, label = "payload") {
        const { memory } = this._requireExports();
        assertWasmMemoryRange(memory, ptr, len, maximum, label);
        return new Uint8Array(memory.buffer, ptr, len);
    }
    /** @internal */
    _readGuestJson(ptr, len) {
        return JSON.parse(this._readGuestString(ptr, len));
    }
    /** @internal */
    _writeGuestJson(value) {
        return this._writeGuestString(JSON.stringify(value ?? null));
    }
    /** @internal */
    _writeGuestString(value) {
        return this._writeGuestBytes(textEncoder.encode(value));
    }
    /** @internal */
    _writeGuestBytes(bytes) {
        const exports$1 = this._requireExports();
        if (bytes.byteLength > MAX_WASM_ABI_PAYLOAD_BYTES) {
            throw new Error(`AngularTS Wasm ABI payload exceeds ${String(MAX_WASM_ABI_PAYLOAD_BYTES)} bytes`);
        }
        const ptr = exports$1.ng_abi_alloc(bytes.byteLength);
        assertWasmMemoryRange(exports$1.memory, ptr, bytes.byteLength, MAX_WASM_ABI_PAYLOAD_BYTES, "guest allocation");
        new Uint8Array(exports$1.memory.buffer, ptr, bytes.byteLength).set(bytes);
        return { ptr, len: bytes.byteLength };
    }
    /** @internal */
    _withGuestJson(value, callback) {
        const { ptr, len } = this._writeGuestJson(value);
        try {
            callback(ptr, len);
        }
        finally {
            this._requireExports().ng_abi_free(ptr, len);
        }
    }
    /** @internal */
    _withGuestString(value, callback) {
        const { ptr, len } = this._writeGuestString(value);
        try {
            callback(ptr, len);
        }
        finally {
            this._requireExports().ng_abi_free(ptr, len);
        }
    }
    /** @internal */
    _requireExports() {
        if (!this._exports) {
            throw new Error("AngularTS Wasm scope ABI exports are not attached");
        }
        return this._exports;
    }
    /** @internal */
    _resolveScope(reference) {
        return isNumber(reference)
            ? this._scopes.get(reference)
            : this._scopesByName.get(reference);
    }
    /** @internal */
    _guardGuestCall(_operation, callback, fallback) {
        this._lastError = WasmAbiError.none;
        if (this._disposed) {
            this._lastError = WasmAbiError.disposed;
            return fallback;
        }
        try {
            return callback();
        }
        catch (error) {
            this._lastError = classifyWasmGuestError(error);
            return fallback;
        }
    }
    /** @internal */
    _requireBuffer(bufferHandle) {
        const buffer = this._buffers.get(bufferHandle);
        if (!buffer)
            throw createWasmGuestError("invalidHandle");
        return buffer;
    }
    /** @internal */
    _runGuestCallback(callbackName, callback) {
        if (this._guestCallbackDepth >= MAX_WASM_GUEST_CALLBACK_DEPTH) {
            throw new Error("AngularTS Wasm ABI guest callback depth exceeded");
        }
        this._guestCallbackDepth++;
        try {
            if (!this._diagnostics || !this._diagnosticSource) {
                callback();
                return;
            }
            const startedAt = nowWasmPerformance();
            try {
                callback();
            }
            finally {
                measureWasmPerformance("guest-callback", startedAt, true, this._diagnosticSource, { callback: callbackName });
            }
        }
        finally {
            this._guestCallbackDepth--;
        }
    }
}
/**
 * Runtime Wasm ABI namespace for language and runtime binding authors.
 *
 * Ordinary AngularTS applications should inject `$wasm` and use app-owned
 * models for durable state. This object keeps low-level ABI creation grouped
 * under the `@angular-wave/angular.ts/services/wasm` subpath so the
 * ambient `ng` namespace exposes only ordinary app-facing Wasm types. Type-only
 * ABI contracts remain direct exports from this subpath.
 */
const WasmAbi = Object.freeze({
    /** AngularTS reactive ABI version expected from guest modules. */
    version: WASM_ABI_VERSION,
    /** Creates a detached ABI whose imports are ready for guest instantiation. */
    create() {
        return new WasmScopeAbiImpl();
    },
});
class WasmBindingImpl {
    constructor(scope, target, onDispose) {
        /** @internal */
        this._disposed = false;
        this._scope = scope;
        this.target = target;
        this.name = scope.name;
        this._onDispose = onDispose;
    }
    get disposed() {
        return this._disposed || this._scope.disposed;
    }
    dispose() {
        if (this._disposed)
            return;
        this._disposed = true;
        this._scope.dispose();
        this._onDispose();
    }
}
class WasmResourceImpl {
    constructor(options, abi, lifecycle, compilation, onDispose) {
        /** @internal */
        this._abortController = new AbortController();
        /** @internal */
        this._bindings = new Set();
        /** @internal */
        this._scopeBindings = new Map();
        /** @internal */
        this._status = "loading";
        this.source = options.source;
        this._abi = abi;
        this._lifecycle = lifecycle;
        this._compilation = compilation;
        this._diagnostics = options.diagnostics === true;
        this._onDispose = onDispose;
        this.ready = this._load(options);
        void this.ready.catch(() => undefined);
    }
    get status() {
        if (!this._lifecycle.$handler._destroyed) {
            void this._lifecycle.status;
        }
        return this._status;
    }
    get error() {
        if (!this._lifecycle.$handler._destroyed) {
            void this._lifecycle.status;
        }
        return this._error;
    }
    get instance() {
        return this._requireResult().instance;
    }
    get module() {
        return this._requireResult().module;
    }
    get exports() {
        return this._requireResult().exports;
    }
    get disposed() {
        return this._status === "disposed";
    }
    /** @internal */
    [SCOPE_PROXY_BIND](handler) {
        if (!handler._destroyed) {
            this._scopeBindings.set(handler.$id, handler);
        }
    }
    async bind(target, options = {}) {
        const startedAt = nowWasmPerformance();
        if (this.disposed) {
            throw this._disposedError("Cannot bind a disposed WebAssembly resource");
        }
        if (target.$handler._destroyed) {
            throw new WasmError("binding", "Cannot bind a destroyed AngularTS reactive target", { source: this.source, stage: "bind" });
        }
        if (options.name?.trim().length === 0) {
            throw new WasmError("binding", "Wasm scope name must not be empty", {
                source: this.source,
                stage: "bind",
            });
        }
        let removeDestroyListener;
        const targetDestroyed = new Promise((_resolve, reject) => {
            removeDestroyListener = target.$on("$destroy", () => {
                reject(new WasmError("binding", "Cannot bind a destroyed AngularTS reactive target", { source: this.source, stage: "bind" }));
            });
        });
        try {
            return await Promise.race([
                this.ready.then(() => this._bindReadyTarget(target, options)),
                targetDestroyed,
            ]);
        }
        finally {
            removeDestroyListener();
            measureWasmPerformance("bind", startedAt, this._diagnostics, this.source);
        }
    }
    dispose() {
        if (this.disposed)
            return;
        this._setStatus("disposed");
        this._abortController.abort();
        this._compilation.release();
        for (const binding of Array.from(this._bindings))
            binding.dispose();
        this._bindings.clear();
        this._scheduleLifecycleBindings(["disposed", "status"]);
        this._scopeBindings.clear();
        this._abi.dispose();
        this._result = undefined;
        this._onDispose();
    }
    /** @internal */
    async _load(options) {
        const loadStartedAt = nowWasmPerformance();
        let stage = "compile";
        try {
            const compileStartedAt = nowWasmPerformance();
            const module = await waitForWasmCompilation(this._compilation.module, this._abortController.signal);
            measureWasmPerformance("compile", compileStartedAt, this._diagnostics, this.source, { cacheStatus: this._compilation.cacheStatus });
            stage = "link";
            const instantiateStartedAt = nowWasmPerformance();
            const instance = await WebAssembly.instantiate(module, mergeWasmImports(options.imports, this._abi.imports));
            measureWasmPerformance("instantiate", instantiateStartedAt, this._diagnostics, this.source);
            if (this.disposed) {
                throw this._disposedError("WebAssembly resource was disposed while loading");
            }
            const exports$1 = instance.exports;
            this._result = { instance, module, exports: exports$1 };
            if (hasWasmAbiCoreExports(instance.exports)) {
                this._abi.attach(instance.exports);
            }
            this._setStatus("ready");
            measureWasmPerformance("load", loadStartedAt, this._diagnostics, this.source, { status: "ready" });
            return this;
        }
        catch (cause) {
            if (this.disposed) {
                throw cause instanceof WasmError
                    ? cause
                    : this._disposedError("WebAssembly resource was disposed while loading", cause);
            }
            const error = cause instanceof WasmError
                ? cause
                : cause instanceof WasmAbiVersionError
                    ? new WasmError("unsupported-abi", cause.message, {
                        cause,
                        source: options.source,
                    })
                    : createWasmLoadError(cause, stage, options.source);
            this._setError(error);
            this._setStatus("error");
            this._abi.dispose();
            measureWasmPerformance("load", loadStartedAt, this._diagnostics, this.source, { status: "error" });
            throw error;
        }
        finally {
            this._compilation.release();
        }
    }
    /** @internal */
    _bindReadyTarget(target, options) {
        if (this.disposed) {
            throw this._disposedError("Cannot bind a disposed WebAssembly resource");
        }
        if (!isWasmAbiExports(this.exports)) {
            throw new WasmError("unsupported-abi", "WebAssembly module does not export the AngularTS reactive ABI", { source: this.source, stage: "bind" });
        }
        let scope;
        try {
            scope = this._abi.createScope(target, { name: options.name });
            scope.bind({
                watch: options.watch,
                initial: options.initial,
            });
            const binding = new WasmBindingImpl(scope, target, () => {
                this._bindings.delete(binding);
            });
            this._bindings.add(binding);
            return binding;
        }
        catch (cause) {
            scope?.dispose();
            if (cause instanceof WasmError)
                throw cause;
            throw new WasmError("binding", cause instanceof Error
                ? cause.message
                : "WebAssembly target binding failed", {
                cause,
                source: this.source,
                stage: "bind",
            });
        }
    }
    /** @internal */
    _requireResult() {
        if (this._result)
            return this._result;
        if (this.disposed) {
            throw this._disposedError("WebAssembly resource has been disposed");
        }
        throw (this._error ??
            new WasmError("load", "WebAssembly resource is still loading", {
                source: this.source,
            }));
    }
    /** @internal */
    _disposedError(message, cause) {
        return new WasmError("disposed", message, {
            cause,
            source: this.source,
        });
    }
    /** @internal */
    _setStatus(status) {
        this._status = status;
        if (!this._lifecycle.$handler._destroyed) {
            this._lifecycle.status = status;
        }
        this._scheduleLifecycleBindings(["status", "disposed"]);
    }
    /** @internal */
    _setError(error) {
        this._error = error;
        this._scheduleLifecycleBindings(["error"]);
    }
    /** @internal */
    _scheduleLifecycleBindings(keys) {
        for (const [scopeId, handler] of this._scopeBindings) {
            if (handler._destroyed) {
                this._scopeBindings.delete(scopeId);
                continue;
            }
            handler._scheduleWatchKeys(keys);
        }
    }
}
/** @internal */
function createWasmRuntimeState(appContext) {
    return {
        appContext,
        resources: new Set(),
        moduleCache: new Map(),
        objectModuleCache: new WeakMap(),
        moduleEntries: new Set(),
        destroyed: false,
    };
}
/** @internal */
function destroyWasmRuntimeState(state) {
    if (state.destroyed)
        return;
    state.destroyed = true;
    for (const resource of Array.from(state.resources))
        resource.dispose();
    for (const entry of state.moduleEntries) {
        if (!entry._settled)
            entry._controller.abort();
    }
    state.resources.clear();
    state.moduleEntries.clear();
    state.moduleCache.clear();
}
/** @internal */
function createWasmService(state) {
    const assertActive = () => {
        if (state.destroyed) {
            throw new WasmError("disposed", "Cannot use $wasm after runtime teardown");
        }
    };
    return {
        load(options) {
            assertActive();
            const abi = new WasmScopeAbiImpl((error) => {
                state.appContext._reportModelException(error);
            }, options.diagnostics === true, options.source);
            const lifecycle = state.appContext.createReactive({
                status: "loading",
            });
            const compilation = acquireWasmCompilation(state, options);
            const resource = new WasmResourceImpl(options, abi, lifecycle, compilation, () => {
                state.resources.delete(resource);
                state.appContext._releaseReactive(lifecycle);
            });
            state.resources.add(resource);
            return resource;
        },
    };
}
function acquireWasmCompilation(state, options) {
    const compileOptions = snapshotWasmCompileOptions(options.compile);
    const location = getWasmModuleCacheLocation(state, options.source, compileOptions);
    const existing = location?.get();
    if (existing) {
        existing._references++;
        return createWasmCompilationLease(existing, existing._settled ? "hit" : "shared-pending");
    }
    const controller = new AbortController();
    const promise = compileWasm(options.source, controller.signal, compileOptions);
    const entry = {
        _controller: controller,
        _promise: promise,
        _references: 1,
        _settled: false,
        _remove: () => {
            location?.delete(entry);
            state.moduleEntries.delete(entry);
        },
    };
    state.moduleEntries.add(entry);
    location?.set(entry);
    void promise.then(() => {
        entry._settled = true;
        state.moduleEntries.delete(entry);
        trimWasmModuleCache(state);
        return undefined;
    }, () => {
        entry._settled = true;
        entry._remove();
        return undefined;
    });
    return createWasmCompilationLease(entry, "miss");
}
function createWasmCompilationLease(entry, cacheStatus) {
    let released = false;
    return {
        cacheStatus,
        module: entry._promise,
        release() {
            if (released)
                return;
            released = true;
            entry._references--;
            if (entry._references === 0 && !entry._settled) {
                entry._remove();
                entry._controller.abort();
            }
        },
    };
}
function getWasmModuleCacheLocation(state, source, compileOptions) {
    const compileKey = serializeWasmCompileOptions(compileOptions);
    if (typeof source === "string" || source instanceof URL) {
        const sourceKey = normalizeWasmSourceUrl(source);
        const key = `${sourceKey}\u0000${compileKey}`;
        return {
            get: () => {
                const entry = state.moduleCache.get(key);
                if (entry?._settled) {
                    state.moduleCache.delete(key);
                    state.moduleCache.set(key, entry);
                }
                return entry;
            },
            set: (entry) => {
                state.moduleCache.set(key, entry);
                trimWasmModuleCache(state);
            },
            delete: (entry) => {
                if (state.moduleCache.get(key) === entry)
                    state.moduleCache.delete(key);
            },
        };
    }
    if ((source instanceof Request &&
        source.cache !== "no-store" &&
        source.cache !== "reload") ||
        source instanceof Response) {
        let bucket = state.objectModuleCache.get(source);
        if (!bucket) {
            bucket = new Map();
            state.objectModuleCache.set(source, bucket);
        }
        return {
            get: () => bucket.get(compileKey),
            set: (entry) => bucket.set(compileKey, entry),
            delete: (entry) => {
                if (bucket.get(compileKey) === entry)
                    bucket.delete(compileKey);
            },
        };
    }
    return undefined;
}
function trimWasmModuleCache(state) {
    if (state.moduleCache.size <= MAX_WASM_MODULE_CACHE_ENTRIES)
        return;
    for (const [key, entry] of state.moduleCache) {
        if (state.moduleCache.size <= MAX_WASM_MODULE_CACHE_ENTRIES)
            return;
        if (!entry._settled)
            continue;
        state.moduleCache.delete(key);
    }
}
function normalizeWasmSourceUrl(source) {
    try {
        return new URL(String(source), globalThis.location.href).href;
    }
    catch {
        return String(source);
    }
}
function serializeWasmCompileOptions(options) {
    if (options === undefined)
        return "default";
    return JSON.stringify({
        builtins: options.builtins ?? [],
        importedStringConstants: options.importedStringConstants ?? null,
    });
}
function snapshotWasmCompileOptions(options) {
    if (options === undefined)
        return undefined;
    const snapshot = {};
    if (options.builtins !== undefined) {
        snapshot.builtins = Object.freeze(Array.from(options.builtins));
    }
    if (options.importedStringConstants !== undefined) {
        snapshot.importedStringConstants = options.importedStringConstants;
    }
    return Object.freeze(snapshot);
}
function waitForWasmCompilation(compilation, signal) {
    return new Promise((resolve, reject) => {
        const abort = () => {
            reject(new DOMException("The operation was aborted", "AbortError"));
        };
        const settle = () => {
            signal.removeEventListener("abort", abort);
        };
        signal.addEventListener("abort", abort, { once: true });
        void compilation.then((module) => {
            settle();
            resolve(module);
            return undefined;
        }, (error) => {
            settle();
            reject(error instanceof Error
                ? error
                : new Error("WebAssembly compilation failed", { cause: error }));
            return undefined;
        });
    });
}
function nowWasmPerformance() {
    return globalThis.performance.now();
}
function measureWasmPerformance(phase, startedAt, enabled, source, detail = {}) {
    if (!enabled)
        return;
    try {
        globalThis.performance.measure(`angular.ts:wasm:${phase}`, {
            start: startedAt,
            end: nowWasmPerformance(),
            detail: {
                ...detail,
                source: describeWasmSource(source),
            },
        });
    }
    catch {
        // Performance diagnostics must never affect resource behavior.
    }
}
function describeWasmSource(source) {
    if (typeof source === "string" || source instanceof URL)
        return String(source);
    if (source instanceof Request)
        return source.url;
    if (source instanceof Response)
        return source.url || "Response";
    if (source instanceof WebAssembly.Module)
        return "WebAssembly.Module";
    return "BufferSource";
}
function mergeWasmImports(imports = {}, abiImports) {
    const angularImports = imports[WASM_SCOPE_IMPORT_NAMESPACE] ?? {};
    const reservedImports = abiImports[WASM_SCOPE_IMPORT_NAMESPACE];
    for (const name of Object.keys(reservedImports)) {
        if (Object.prototype.hasOwnProperty.call(angularImports, name)) {
            throw new Error(`WebAssembly import '${WASM_SCOPE_IMPORT_NAMESPACE}.${name}' is reserved by AngularTS`);
        }
    }
    return {
        ...imports,
        [WASM_SCOPE_IMPORT_NAMESPACE]: {
            ...angularImports,
            ...reservedImports,
        },
    };
}
function classifyWasmErrorStage(cause, stage, source) {
    if (stage === "link") {
        return cause instanceof WebAssembly.RuntimeError ? "start" : "link";
    }
    if (cause instanceof Error &&
        (cause.message.startsWith("WebAssembly fetch failed") ||
            (cause instanceof TypeError &&
                (typeof source === "string" ||
                    source instanceof URL ||
                    source instanceof Request)))) {
        return "fetch";
    }
    return "compile";
}
function createWasmLoadError(cause, stage, source) {
    const failureStage = classifyWasmErrorStage(cause, stage, source);
    const detail = cause instanceof Error ? `: ${cause.message}` : "";
    return new WasmError("load", `WebAssembly module failed during ${failureStage}${detail}`, {
        cause,
        source,
        stage: failureStage,
    });
}
function isWasmAbiExports(exports$1) {
    return (hasWasmAbiCoreExports(exports$1) &&
        readWasmAbiVersion(exports$1) === WASM_ABI_VERSION);
}
function hasWasmAbiCoreExports(exports$1) {
    return (isWasmMemoryView(exports$1.memory) &&
        typeof exports$1.ng_abi_alloc === "function" &&
        typeof exports$1.ng_abi_free === "function");
}
function readWasmAbiVersion(exports$1) {
    if (typeof exports$1.ng_abi_version !== "function") {
        return -1;
    }
    const version = exports$1.ng_abi_version();
    return Number.isSafeInteger(version) ? version : -1;
}
function assertWasmMemoryRange(memory, ptr, len, maximum, label) {
    if (!Number.isSafeInteger(ptr) || ptr < 0) {
        throw new RangeError(`Invalid AngularTS Wasm ABI ${label} pointer`);
    }
    if (!Number.isSafeInteger(len) || len < 0 || len > maximum) {
        throw new RangeError(`Invalid AngularTS Wasm ABI ${label} length`);
    }
    if (ptr === 0 && len > 0) {
        throw new RangeError(`Invalid AngularTS Wasm ABI ${label} pointer`);
    }
    if (ptr > memory.buffer.byteLength || len > memory.buffer.byteLength - ptr) {
        throw new RangeError(`AngularTS Wasm ABI ${label} exceeds guest memory`);
    }
}
function isWasmMemoryView(value) {
    try {
        const buffer = value?.buffer;
        return (buffer instanceof ArrayBuffer ||
            (typeof SharedArrayBuffer === "function" &&
                buffer instanceof SharedArrayBuffer));
    }
    catch {
        return false;
    }
}
class WasmAbiVersionError extends Error {
    constructor(version) {
        super(`Unsupported AngularTS Wasm ABI version ${String(version)}; expected ${String(WASM_ABI_VERSION)}`);
        this.name = "WasmAbiVersionError";
    }
}
class WasmGuestCallError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "WasmGuestCallError";
        this.code = code;
    }
}
function createWasmGuestError(name) {
    return new WasmGuestCallError(WasmAbiError[name], `AngularTS Wasm ABI ${name.replace(/[A-Z]/g, (value) => `-${value.toLowerCase()}`)}`);
}
function classifyWasmGuestError(error) {
    if (error instanceof WasmGuestCallError) {
        return error.code;
    }
    if (error instanceof SyntaxError) {
        return WasmAbiError.invalidJson;
    }
    if (error instanceof RangeError) {
        return error.message.includes("length")
            ? WasmAbiError.invalidLength
            : WasmAbiError.invalidPointer;
    }
    return WasmAbiError.operationFailed;
}
function normalizeWasmScopeWriteOptions(value, defaultEcho) {
    if (value === undefined) {
        return {
            origin: WASM_SCOPE_DEFAULT_ORIGIN,
            echo: defaultEcho,
        };
    }
    if (!isPlainWasmRecord(value)) {
        throw createWasmGuestError("invalidTransaction");
    }
    const origin = value.origin;
    const echo = value.echo;
    if (origin !== undefined && typeof origin !== "string") {
        throw createWasmGuestError("invalidTransaction");
    }
    if (echo !== undefined && typeof echo !== "boolean") {
        throw createWasmGuestError("invalidTransaction");
    }
    if (typeof origin === "string" &&
        textEncoder.encode(origin).byteLength > MAX_WASM_ABI_PATH_BYTES) {
        throw createWasmGuestError("invalidLength");
    }
    return {
        origin: origin ?? WASM_SCOPE_DEFAULT_ORIGIN,
        echo: echo ?? defaultEcho,
    };
}
function normalizeWasmScopeTransaction(transaction) {
    if (!isPlainWasmRecord(transaction)) {
        throw createWasmGuestError("invalidTransaction");
    }
    const inputSet = transaction.set ?? {};
    const inputDelete = transaction.delete ?? [];
    if (!isPlainWasmRecord(inputSet) || !Array.isArray(inputDelete)) {
        throw createWasmGuestError("invalidTransaction");
    }
    const set = Object.create(null);
    const deleted = new Set();
    for (const path of Object.keys(inputSet)) {
        assertSafeWasmScopePath(path);
        set[path] = inputSet[path];
    }
    for (const path of inputDelete) {
        if (typeof path !== "string") {
            throw createWasmGuestError("invalidTransaction");
        }
        assertSafeWasmScopePath(path);
        if (Object.prototype.hasOwnProperty.call(set, path) || deleted.has(path)) {
            throw createWasmGuestError("invalidTransaction");
        }
        deleted.add(path);
    }
    if (Object.keys(set).length === 0 && deleted.size === 0) {
        throw createWasmGuestError("invalidTransaction");
    }
    return { set, delete: Array.from(deleted) };
}
function applyWasmScopeTransaction(target, transaction) {
    for (const [path, value] of Object.entries(transaction.set)) {
        writeScopePath(target, path, value);
    }
    for (const path of transaction.delete) {
        deleteScopePath(target, path);
    }
}
function assertSafeWasmScopePath(path) {
    const keys = scopePathKeys(path);
    if (keys.length === 0) {
        throw createWasmGuestError("invalidTransaction");
    }
    if (!isSafeScopePath(keys)) {
        throw createWasmGuestError("unsafePath");
    }
}
function isPlainWasmRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const prototype = Reflect.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function copyWasmBinaryValue(value) {
    if (value instanceof ArrayBuffer ||
        (typeof SharedArrayBuffer === "function" &&
            value instanceof SharedArrayBuffer)) {
        return new Uint8Array(value).slice();
    }
    if (ArrayBuffer.isView(value)) {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
    }
    return undefined;
}
function rethrowWasmFault(error) {
    throw error;
}
function getWasmScopeRetentionState(scope) {
    let state = wasmScopeRetentionStates.get(scope);
    if (state)
        return state;
    state = {
        _paused: false,
        _flushing: false,
        _pending: [],
        _deregisterPause: undefined,
        _deregisterResume: undefined,
        _deregisterDestroy: undefined,
    };
    state._deregisterPause = scope.$on("$viewRetentionPause", (...args) => {
        if (!shouldHandleViewRetentionPause(args, "schedulers")) {
            return;
        }
        state._paused = true;
    });
    state._deregisterResume = scope.$on("$viewRetentionResume", (...args) => {
        if (!shouldHandleViewRetentionPause(args, "schedulers")) {
            return;
        }
        if (!state._paused) {
            return;
        }
        state._paused = false;
        flushWasmScopeQueue(state);
    });
    state._deregisterDestroy = scope.$on("$destroy", () => {
        state._pending.length = 0;
        state._flushing = false;
        state._deregisterPause?.();
        state._deregisterResume?.();
        state._deregisterDestroy?.();
        wasmScopeRetentionStates.delete(scope);
    });
    wasmScopeRetentionStates.set(scope, state);
    return state;
}
function queueScopeAwareWasmCallback(scope, state, key, callback) {
    if (state._paused) {
        const pending = {
            _key: key,
            _callback: callback,
        };
        if (key) {
            for (let i = state._pending.length - 1; i >= 0; i--) {
                if (state._pending[i]._key === key) {
                    state._pending[i] = pending;
                    flushWasmScopeQueue(state);
                    return;
                }
            }
        }
        state._pending.push(pending);
        flushWasmScopeQueue(state);
        return;
    }
    callback();
}
function flushWasmScopeQueue(state) {
    if (state._flushing || state._paused || state._pending.length === 0) {
        return;
    }
    state._flushing = true;
    queueMicrotask(() => {
        state._flushing = false;
        /* istanbul ignore if -- microtask interleaving is covered by retention behavior tests. */
        if (state._paused) {
            return;
        }
        const pending = state._pending.splice(0);
        for (let i = 0; i < pending.length; i++) {
            pending[i]._callback();
        }
    });
}
function readScopePath(scope, path) {
    if (!path) {
        return scope;
    }
    const keys = scopePathKeys(path);
    if (!isSafeScopePath(keys)) {
        return undefined;
    }
    let current = scope;
    for (let i = 0, l = keys.length; i < l; i++) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[keys[i]];
    }
    return current;
}
function hasScopePath(scope, path) {
    if (!path) {
        return true;
    }
    const keys = scopePathKeys(path);
    if (!isSafeScopePath(keys)) {
        return false;
    }
    let current = scope;
    for (const key of keys) {
        if ((typeof current !== "object" || current === null) &&
            typeof current !== "function") {
            return false;
        }
        if (!(key in current)) {
            return false;
        }
        current = current[key];
    }
    return true;
}
function writeScopePath(scope, path, value) {
    const keys = scopePathKeys(path);
    if (keys.length === 0 || !isSafeScopePath(keys)) {
        return false;
    }
    let current = scope;
    for (let i = 0, l = keys.length - 1; i < l; i++) {
        const key = keys[i];
        const existing = current[key];
        if (existing && typeof existing === "object") {
            current = existing;
            continue;
        }
        const next = Object.create(null);
        writeSafeScopeProperty(current, key, next);
        current = next;
    }
    writeSafeScopeProperty(current, keys[keys.length - 1], value);
    return true;
}
function deleteScopePath(scope, path) {
    const keys = scopePathKeys(path);
    if (keys.length === 0 || !isSafeScopePath(keys)) {
        return false;
    }
    let current = scope;
    for (let i = 0, l = keys.length - 1; i < l; i++) {
        const next = current[keys[i]];
        if (!next || typeof next !== "object") {
            return false;
        }
        current = next;
    }
    return deleteProperty(current, keys[keys.length - 1]);
}
function scopePathKeys(path) {
    return path.split(".").filter(Boolean);
}
function isSafeScopePath(keys) {
    return keys.every((key) => !isUnsafeScopePathKey(key));
}
function isUnsafeScopePathKey(key) {
    return UNSAFE_SCOPE_PATH_KEYS.has(key);
}
function writeSafeScopeProperty(target, key, value) {
    if (isProxy(target) || ("$handler" in target && "$target" in target)) {
        target[key] = value;
        return;
    }
    Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
    });
}

export { WasmAbi, WasmAbiError, WasmError, createWasmRuntimeState, createWasmService, destroyWasmRuntimeState };
