import { instantiateWasm, deleteProperty } from '../../shared/utils.js';

const WASM_SCOPE_IMPORT_NAMESPACE = "angular_ts";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
/**
 * Host-side wrapper around one AngularTS scope exposed to Wasm clients.
 *
 * The wrapper mutates the real AngularTS scope. It does not use event bus,
 * scope-sync, DOM hydration, or object merging.
 */
class WasmScope {
    /**
     * Creates a host-side Wasm wrapper around an AngularTS scope.
     *
     * Prefer `WasmScopeAbi.createScope()` so the wrapper is registered with an
     * ABI handle table immediately.
     */
    constructor(abi, scope, handle, options = {}) {
        this.abi = abi;
        this.scope = scope;
        this.handle = handle;
        this.name = options.name ?? scope.$scopename ?? String(scope.$id ?? handle);
        this._bindings = [];
        this._flushCallbacks = [];
        this._flushScheduled = false;
        this._destroyed = false;
        this._bindings.push(scope.$on("$destroy", () => {
            this.dispose();
        }));
    }
    /** Returns whether the wrapper has been disposed. */
    isDisposed() {
        return this._destroyed;
    }
    /** Reads a dot-separated path from the wrapped AngularTS scope. */
    get(path) {
        return readScopePath(this.scope, path);
    }
    /** Writes a dot-separated path into the wrapped AngularTS scope. */
    set(path, value) {
        return writeScopePath(this.scope, path, value);
    }
    /** Deletes a dot-separated path from the wrapped AngularTS scope. */
    delete(path) {
        return deleteScopePath(this.scope, path);
    }
    /** Runs queued Wasm bridge callbacks for this scope. */
    flush() {
        this._scheduleFlushCallbacks();
    }
    /** @internal */
    _scheduleFlushCallbacks() {
        if (this._flushScheduled || this._flushCallbacks.length === 0) {
            return;
        }
        this._flushScheduled = true;
        queueMicrotask(() => {
            if (this._destroyed) {
                return;
            }
            this._flushScheduled = false;
            const callbacks = this._flushCallbacks.slice();
            for (let i = 0, l = callbacks.length; i < l; i++) {
                callbacks[i]();
            }
        });
    }
    /**
     * Registers a callback that runs before this scope flushes.
     *
     * Generated Wasm bridges use this to sync Rust-owned public fields back onto
     * AngularTS controller wrappers when Rust async code calls `WasmScope::flush`.
     */
    onFlush(callback) {
        if (this._destroyed) {
            return () => { };
        }
        this._flushCallbacks.push(callback);
        return () => {
            const index = this._flushCallbacks.indexOf(callback);
            if (index >= 0) {
                this._flushCallbacks.splice(index, 1);
            }
        };
    }
    /**
     * Watches one scope path and calls `callback` when AngularTS observes a change.
     *
     * The returned function removes only this watch registration.
     */
    watch(path, callback, options = {}) {
        const dispose = this.scope.$watch(path, (value) => {
            if (this._destroyed) {
                return;
            }
            callback({
                scopeHandle: this.handle,
                scopeName: this.name,
                path,
                value,
            });
        }, !options.initial);
        if (!dispose) {
            return () => false;
        }
        return dispose;
    }
    /**
     * Binds this scope to Wasm lifecycle exports and optional watched paths.
     *
     * This is the host-to-guest side of the ABI: AngularTS allocates guest memory
     * for callback payloads, invokes the exported callback, and frees memory after
     * the callback returns.
     */
    bindExports(exports$1, options = {}) {
        this.abi.attach(exports$1);
        this.abi.notifyBind(this);
        const disposers = (options.watch ?? []).map((path) => this.watch(path, (update) => {
            this.abi.notifyUpdate(update);
        }, { initial: options.initial }));
        let disposed = false;
        const dispose = () => {
            if (disposed) {
                return;
            }
            disposed = true;
            for (let i = 0, l = disposers.length; i < l; i++) {
                disposers[i]();
            }
            this.abi.notifyUnbind(this);
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
        this._flushCallbacks.length = 0;
        this._flushScheduled = false;
        this.abi.unregisterScope(this.handle);
    }
}
/**
 * Language-neutral AngularTS scope ABI for raw Wasm clients.
 *
 * The ABI exchanges strings and JSON-compatible values through guest linear
 * memory. Guest modules provide `ng_abi_alloc` and `ng_abi_free`; AngularTS uses
 * those exports whenever it needs to place callback or return payloads in guest
 * memory.
 */
class WasmScopeAbi {
    /** Creates a scope ABI and optionally attaches guest exports immediately. */
    constructor(exports$1) {
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
        this._exports = exports$1;
        this.imports = {
            [WASM_SCOPE_IMPORT_NAMESPACE]: {
                scope_resolve: (namePtr, nameLen) => this._scopeResolve(namePtr, nameLen),
                scope_get: (scopeHandle, pathPtr, pathLen) => this._scopeGet(scopeHandle, pathPtr, pathLen),
                scope_get_named: (namePtr, nameLen, pathPtr, pathLen) => this._scopeGetNamed(namePtr, nameLen, pathPtr, pathLen),
                scope_set: (scopeHandle, pathPtr, pathLen, valuePtr, valueLen) => this._scopeSet(scopeHandle, pathPtr, pathLen, valuePtr, valueLen),
                scope_set_named: (namePtr, nameLen, pathPtr, pathLen, valuePtr, valueLen) => this._scopeSetNamed(namePtr, nameLen, pathPtr, pathLen, valuePtr, valueLen),
                scope_delete: (scopeHandle, pathPtr, pathLen) => this._scopeDelete(scopeHandle, pathPtr, pathLen),
                scope_delete_named: (namePtr, nameLen, pathPtr, pathLen) => this._scopeDeleteNamed(namePtr, nameLen, pathPtr, pathLen),
                scope_flush: (scopeHandle) => this._scopeFlush(scopeHandle),
                scope_flush_named: (namePtr, nameLen) => this._scopeFlushNamed(namePtr, nameLen),
                scope_watch: (scopeHandle, pathPtr, pathLen) => this._scopeWatch(scopeHandle, pathPtr, pathLen),
                scope_watch_named: (namePtr, nameLen, pathPtr, pathLen) => this._scopeWatchNamed(namePtr, nameLen, pathPtr, pathLen),
                scope_unwatch: (watchHandle) => this._scopeUnwatch(watchHandle),
                scope_unbind: (scopeHandle) => this._scopeUnbind(scopeHandle),
                scope_unbind_named: (namePtr, nameLen) => this._scopeUnbindNamed(namePtr, nameLen),
                buffer_ptr: (bufferHandle) => this._buffers.get(bufferHandle)?._ptr ?? 0,
                buffer_len: (bufferHandle) => this._buffers.get(bufferHandle)?._len ?? 0,
                buffer_free: (bufferHandle) => {
                    this.freeBuffer(bufferHandle);
                },
            },
        };
    }
    /** Attaches guest exports after instantiation. */
    attach(exports$1) {
        this._exports = exports$1;
    }
    /** Creates and registers a scope wrapper. */
    createScope(scope, options = {}) {
        const handle = this._nextScopeHandle++;
        const wasmScope = new WasmScope(this, scope, handle, options);
        this._scopes.set(handle, wasmScope);
        this._scopesByName.set(wasmScope.name, wasmScope);
        return wasmScope;
    }
    /** Returns a previously registered scope wrapper. */
    getScope(reference) {
        return this._resolveScope(reference);
    }
    /** Unregisters a scope wrapper without destroying the AngularTS scope. */
    unregisterScope(handle) {
        const scope = this._scopes.get(handle);
        if (!scope) {
            return false;
        }
        if (scope && this._scopesByName.get(scope.name) === scope) {
            this._scopesByName.delete(scope.name);
        }
        for (const [watchHandle, watch] of this._watches) {
            if (watch._scope === scope) {
                watch._dispose();
                this._watches.delete(watchHandle);
            }
        }
        return this._scopes.delete(handle);
    }
    /** Invokes the optional guest bind callback for a scope. */
    notifyBind(scope) {
        const exports$1 = this._requireExports();
        if (!exports$1.ng_scope_on_bind) {
            return;
        }
        this._withGuestString(scope.name, (namePtr, nameLen) => {
            exports$1.ng_scope_on_bind?.(scope.handle, namePtr, nameLen);
        });
    }
    /** Invokes the optional guest update callback for a watched scope path. */
    notifyUpdate(update) {
        const exports$1 = this._requireExports();
        if (!exports$1.ng_scope_on_update) {
            return;
        }
        this._withGuestString(update.path, (pathPtr, pathLen) => {
            this._withGuestJson(update.value, (valuePtr, valueLen) => {
                exports$1.ng_scope_on_update?.(update.scopeHandle, pathPtr, pathLen, valuePtr, valueLen);
            });
        });
    }
    /** Invokes the optional guest unbind callback for a scope. */
    notifyUnbind(scope) {
        this._exports?.ng_scope_on_unbind?.(scope.handle);
    }
    /** Releases one result buffer created by `scope_get`. */
    freeBuffer(bufferHandle) {
        const buffer = this._buffers.get(bufferHandle);
        if (!buffer) {
            return;
        }
        this._buffers.delete(bufferHandle);
        this._requireExports().ng_abi_free(buffer._ptr, buffer._len);
    }
    /** @internal */
    _scopeResolve(namePtr, nameLen) {
        return (this._resolveScope(this._readGuestString(namePtr, nameLen))?.handle ?? 0);
    }
    /** @internal */
    _scopeGet(scopeReference, pathPtr, pathLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope) {
            return 0;
        }
        const path = this._readGuestString(pathPtr, pathLen);
        return this._createResultBuffer(scope.get(path));
    }
    /** @internal */
    _scopeGetNamed(namePtr, nameLen, pathPtr, pathLen) {
        return this._scopeGet(this._readGuestString(namePtr, nameLen), pathPtr, pathLen);
    }
    /** @internal */
    _scopeSet(scopeReference, pathPtr, pathLen, valuePtr, valueLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope) {
            return 0;
        }
        const path = this._readGuestString(pathPtr, pathLen);
        const value = this._readGuestJson(valuePtr, valueLen);
        return scope.set(path, value) ? 1 : 0;
    }
    /** @internal */
    _scopeSetNamed(namePtr, nameLen, pathPtr, pathLen, valuePtr, valueLen) {
        return this._scopeSet(this._readGuestString(namePtr, nameLen), pathPtr, pathLen, valuePtr, valueLen);
    }
    /** @internal */
    _scopeDelete(scopeReference, pathPtr, pathLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope) {
            return 0;
        }
        return scope.delete(this._readGuestString(pathPtr, pathLen)) ? 1 : 0;
    }
    /** @internal */
    _scopeDeleteNamed(namePtr, nameLen, pathPtr, pathLen) {
        return this._scopeDelete(this._readGuestString(namePtr, nameLen), pathPtr, pathLen);
    }
    /** @internal */
    _scopeFlush(scopeReference) {
        const scope = this._resolveScope(scopeReference);
        if (!scope) {
            return 0;
        }
        scope.flush();
        return 1;
    }
    /** @internal */
    _scopeFlushNamed(namePtr, nameLen) {
        return this._scopeFlush(this._readGuestString(namePtr, nameLen));
    }
    /** @internal */
    _scopeWatch(scopeReference, pathPtr, pathLen) {
        const scope = this._resolveScope(scopeReference);
        if (!scope) {
            return 0;
        }
        const path = this._readGuestString(pathPtr, pathLen);
        const watchHandle = this._nextWatchHandle++;
        const dispose = scope.watch(path, (update) => {
            this.notifyUpdate(update);
        });
        this._watches.set(watchHandle, {
            _scope: scope,
            _dispose: dispose,
        });
        return watchHandle;
    }
    /** @internal */
    _scopeWatchNamed(namePtr, nameLen, pathPtr, pathLen) {
        return this._scopeWatch(this._readGuestString(namePtr, nameLen), pathPtr, pathLen);
    }
    /** @internal */
    _scopeUnwatch(watchHandle) {
        const watch = this._watches.get(watchHandle);
        if (!watch) {
            return 0;
        }
        this._watches.delete(watchHandle);
        watch._dispose();
        return 1;
    }
    /** @internal */
    _scopeUnbind(scopeReference) {
        const scope = this._resolveScope(scopeReference);
        if (!scope) {
            return 0;
        }
        scope.dispose();
        return 1;
    }
    /** @internal */
    _scopeUnbindNamed(namePtr, nameLen) {
        return this._scopeUnbind(this._readGuestString(namePtr, nameLen));
    }
    /** @internal */
    _createResultBuffer(value) {
        const bufferHandle = this._nextBufferHandle++;
        const { ptr, len } = this._writeGuestJson(value);
        this._buffers.set(bufferHandle, {
            _ptr: ptr,
            _len: len,
        });
        return bufferHandle;
    }
    /** @internal */
    _readGuestString(ptr, len) {
        const memory = this._requireExports().memory;
        const bytes = new Uint8Array(memory.buffer, ptr, len);
        return textDecoder.decode(bytes);
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
        const exports$1 = this._requireExports();
        const bytes = textEncoder.encode(value);
        const ptr = exports$1.ng_abi_alloc(bytes.byteLength);
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
        return typeof reference === "number"
            ? this._scopes.get(reference)
            : this._scopesByName.get(reference);
    }
}
class WasmProvider {
    constructor() {
        this.$get = () => {
            const load = async (src, imports = {}, opts = {}) => {
                const result = await instantiateWasm(src, imports);
                return opts.raw ? result : result.exports;
            };
            return Object.assign(load, {
                scope(scope, options) {
                    return new WasmScopeAbi().createScope(scope, options);
                },
                createScopeAbi(exports$1) {
                    return new WasmScopeAbi(exports$1);
                },
            });
        };
    }
}
function readScopePath(scope, path) {
    if (!path) {
        return scope;
    }
    const keys = scopePathKeys(path);
    let current = scope;
    for (let i = 0, l = keys.length; i < l; i++) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[keys[i]];
    }
    return current;
}
function writeScopePath(scope, path, value) {
    const keys = scopePathKeys(path);
    if (keys.length === 0) {
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
        const next = {};
        current[key] = next;
        current = next;
    }
    current[keys[keys.length - 1]] = value;
    return true;
}
function deleteScopePath(scope, path) {
    const keys = scopePathKeys(path);
    if (keys.length === 0) {
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

export { WasmProvider, WasmScope, WasmScopeAbi };
