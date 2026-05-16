import { deleteProperty, instantiateWasm } from "../../shared/utils.ts";

const WASM_SCOPE_IMPORT_NAMESPACE = "angular_ts";

const textEncoder = new TextEncoder();

const textDecoder = new TextDecoder();

/** Options for loading a WebAssembly module through `$wasm`. */
export interface WasmOptions {
  /**
   * When `false`, `$wasm` resolves to `instance.exports`.
   * When `true`, `$wasm` resolves to the full instantiation result.
   */
  raw?: boolean;
  /** Additional runtime-specific options. */
  [key: string]: unknown;
}

/** WebAssembly exports required by the language-neutral AngularTS ABI. */
export interface WasmAbiExports {
  /** Linear memory used for ABI string and JSON payload exchange. */
  memory: WebAssembly.Memory;
  /** Allocates `size` bytes in guest memory and returns the pointer. */
  ng_abi_alloc(size: number): number;
  /** Releases a pointer previously returned by `ng_abi_alloc`. */
  ng_abi_free(ptr: number, size: number): void;
  /** Optional callback invoked after a scope handle is bound. */
  ng_scope_on_bind?(
    scopeHandle: number,
    namePtr: number,
    nameLen: number,
  ): void;
  /** Optional callback invoked before a scope handle is unbound. */
  ng_scope_on_unbind?(scopeHandle: number): void;
  /** Optional callback invoked when a watched scope path changes. */
  ng_scope_on_update?(
    scopeHandle: number,
    pathPtr: number,
    pathLen: number,
    valuePtr: number,
    valueLen: number,
  ): void;
}

/** Options for creating an AngularTS scope wrapper for Wasm clients. */
export interface WasmScopeOptions {
  /** Stable name exposed to Wasm clients. Defaults to `$scopename` or `$id`. */
  name?: string;
}

/** Logical scope reference used by host-side helpers. */
export type WasmScopeReference = number | string;

/** Scope update delivered from AngularTS to a Wasm client callback. */
export interface WasmScopeUpdate {
  /** Host-side numeric scope handle. */
  scopeHandle: number;
  /** Stable scope name. */
  scopeName: string;
  /** Watched path that changed. */
  path: string;
  /** Current value read from the scope path. */
  value: unknown;
}

/** Options for binding an AngularTS scope to Wasm lifecycle callbacks. */
export interface WasmScopeBindingOptions extends WasmScopeOptions {
  /** Scope paths that should emit `ng_scope_on_update` callbacks. */
  watch?: string[];
  /** Emit the current value immediately when registering each watched path. */
  initial?: boolean;
}

/** Options for registering one scope watch. */
export interface WasmScopeWatchOptions {
  /** Emit the current value immediately. Defaults to `false`. */
  initial?: boolean;
}

/** Imports exposed to a language-neutral Wasm client. */
export interface WasmScopeAbiImports {
  /** Resolves a scope name to a numeric scope handle. */
  scope_resolve(namePtr: number, nameLen: number): number;
  /** Returns a host-owned result buffer handle containing JSON for a scope path. */
  scope_get(scopeHandle: number, pathPtr: number, pathLen: number): number;
  /** Name-based variant of `scope_get`. */
  scope_get_named(
    namePtr: number,
    nameLen: number,
    pathPtr: number,
    pathLen: number,
  ): number;
  /** Writes a JSON payload into a scope path. Returns `1` on success. */
  scope_set(
    scopeHandle: number,
    pathPtr: number,
    pathLen: number,
    valuePtr: number,
    valueLen: number,
  ): number;
  /** Name-based variant of `scope_set`. */
  scope_set_named(
    namePtr: number,
    nameLen: number,
    pathPtr: number,
    pathLen: number,
    valuePtr: number,
    valueLen: number,
  ): number;
  /** Deletes a scope path. Returns `1` on success. */
  scope_delete(scopeHandle: number, pathPtr: number, pathLen: number): number;
  /** Name-based variant of `scope_delete`. */
  scope_delete_named(
    namePtr: number,
    nameLen: number,
    pathPtr: number,
    pathLen: number,
  ): number;
  /** Runs queued Wasm scope bridge callbacks. Returns `1` on success. */
  scope_sync(scopeHandle: number): number;
  /** Name-based variant of `scope_sync`. */
  scope_sync_named(namePtr: number, nameLen: number): number;
  /** Watches a scope path and returns a watch handle. */
  scope_watch(scopeHandle: number, pathPtr: number, pathLen: number): number;
  /** Name-based variant of `scope_watch`. */
  scope_watch_named(
    namePtr: number,
    nameLen: number,
    pathPtr: number,
    pathLen: number,
  ): number;
  /** Removes a watch handle. Returns `1` on success. */
  scope_unwatch(watchHandle: number): number;
  /** Unbinds a scope handle without destroying the AngularTS scope. */
  scope_unbind(scopeHandle: number): number;
  /** Name-based variant of `scope_unbind`. */
  scope_unbind_named(namePtr: number, nameLen: number): number;
  /** Returns the guest pointer for a host-owned result buffer. */
  buffer_ptr(bufferHandle: number): number;
  /** Returns the byte length for a host-owned result buffer. */
  buffer_len(bufferHandle: number): number;
  /** Releases a host-owned result buffer and its guest-memory allocation. */
  buffer_free(bufferHandle: number): void;
}

/** Full import object returned by `WasmScopeAbi.imports`. */
export interface WasmScopeAbiImportObject {
  /** AngularTS scope ABI import namespace. */
  [WASM_SCOPE_IMPORT_NAMESPACE]: WasmScopeAbiImports;
}

export interface WasmInstantiationResult {
  instance: WebAssembly.Instance;
  exports: WebAssembly.Exports;
  module: WebAssembly.Module;
}

/** Callable `$wasm` service plus helpers for the scope ABI. */
export interface WasmService {
  /** Loads a WebAssembly module and returns either exports or the raw result. */
  (
    src: string,
    imports?: WebAssembly.Imports,
    opts?: WasmOptions,
  ): Promise<WebAssembly.Exports | WasmInstantiationResult>;
  /** Wraps an AngularTS scope for direct Wasm client access. */
  scope(scope: ng.Scope, options?: WasmScopeOptions): WasmScope;
  /** Creates a language-neutral host ABI for AngularTS scope handles. */
  createScopeAbi(exports?: WasmAbiExports): WasmScopeAbi;
}

type WasmLoadService = (
  src: string,
  imports?: WebAssembly.Imports,
  opts?: WasmOptions,
) => Promise<WebAssembly.Exports | WasmInstantiationResult>;

interface WasmResultBuffer {
  _ptr: number;
  _len: number;
}

interface WasmWatchRegistration {
  _scope: WasmScope;
  _dispose: () => void;
}

/**
 * Host-side wrapper around one AngularTS scope exposed to Wasm clients.
 *
 * The wrapper mutates the real AngularTS scope. It does not use event bus,
 * scope-sync, DOM hydration, or object merging.
 */
export class WasmScope {
  /** Host ABI that owns this handle. */
  readonly abi: WasmScopeAbi;
  /** Numeric host handle passed to Wasm clients. */
  readonly handle: number;
  /** Stable scope name exposed over the ABI. */
  readonly name: string;
  /** Wrapped AngularTS scope. */
  readonly scope: ng.Scope;
  /** @internal */
  private _bindings: Array<() => void>;
  /** @internal */
  private _syncCallbacks: Array<() => void>;
  /** @internal */
  private _syncScheduled: boolean;
  /** @internal */
  private _destroyed: boolean;

  /**
   * Creates a host-side Wasm wrapper around an AngularTS scope.
   *
   * Prefer `WasmScopeAbi.createScope()` so the wrapper is registered with an
   * ABI handle table immediately.
   */
  constructor(
    abi: WasmScopeAbi,
    scope: ng.Scope,
    handle: number,
    options: WasmScopeOptions = {},
  ) {
    this.abi = abi;
    this.scope = scope;
    this.handle = handle;
    this.name = options.name ?? scope.$scopename ?? String(scope.$id ?? handle);
    this._bindings = [];
    this._syncCallbacks = [];
    this._syncScheduled = false;
    this._destroyed = false;
    this._bindings.push(
      scope.$on("$destroy", () => {
        this.dispose();
      }),
    );
  }

  /** Returns whether the wrapper has been disposed. */
  isDisposed(): boolean {
    return this._destroyed;
  }

  /** Reads a dot-separated path from the wrapped AngularTS scope. */
  get(path: string): unknown {
    return readScopePath(this.scope, path);
  }

  /** Writes a dot-separated path into the wrapped AngularTS scope. */
  set(path: string, value: unknown): boolean {
    return writeScopePath(this.scope, path, value);
  }

  /** Deletes a dot-separated path from the wrapped AngularTS scope. */
  delete(path: string): boolean {
    return deleteScopePath(this.scope, path);
  }

  /** Runs queued Wasm bridge callbacks for this scope. */
  sync(): void {
    this._scheduleSyncCallbacks();
  }

  /** @internal */
  private _scheduleSyncCallbacks(): void {
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
  onSync(callback: () => void): () => void {
    if (this._destroyed) {
      return () => {};
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
  watch(
    path: string,
    callback: (update: WasmScopeUpdate) => void,
    options: WasmScopeWatchOptions = {},
  ): () => void {
    const dispose = this.scope.$watch(
      path,
      (value: unknown) => {
        if (this._destroyed) {
          return;
        }

        callback({
          scopeHandle: this.handle,
          scopeName: this.name,
          path,
          value,
        });
      },
      !options.initial,
    );

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
  bindExports(
    exports: WasmAbiExports,
    options: WasmScopeBindingOptions = {},
  ): () => void {
    this.abi.attach(exports);
    this.abi.notifyBind(this);

    const disposers = (options.watch ?? []).map((path) =>
      this.watch(
        path,
        (update) => {
          this.abi.notifyUpdate(update);
        },
        { initial: options.initial },
      ),
    );

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
  dispose(): void {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;

    const bindings = this._bindings.splice(0);

    for (let i = 0, l = bindings.length; i < l; i++) {
      bindings[i]();
    }

    this._syncCallbacks.length = 0;
    this._syncScheduled = false;
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
export class WasmScopeAbi {
  /** Import object passed to `WebAssembly.instantiate`. */
  readonly imports: WasmScopeAbiImportObject;
  /** @internal */
  private _exports?: WasmAbiExports;
  /** @internal */
  private _nextScopeHandle = 1;
  /** @internal */
  private _nextBufferHandle = 1;
  /** @internal */
  private _nextWatchHandle = 1;
  /** @internal */
  private readonly _scopes = new Map<number, WasmScope>();
  /** @internal */
  private readonly _scopesByName = new Map<string, WasmScope>();
  /** @internal */
  private readonly _buffers = new Map<number, WasmResultBuffer>();
  /** @internal */
  private readonly _watches = new Map<number, WasmWatchRegistration>();

  /** Creates a scope ABI and optionally attaches guest exports immediately. */
  constructor(exports?: WasmAbiExports) {
    this._exports = exports;
    this.imports = {
      [WASM_SCOPE_IMPORT_NAMESPACE]: {
        scope_resolve: (namePtr, nameLen) =>
          this._scopeResolve(namePtr, nameLen),
        scope_get: (scopeHandle, pathPtr, pathLen) =>
          this._scopeGet(scopeHandle, pathPtr, pathLen),
        scope_get_named: (namePtr, nameLen, pathPtr, pathLen) =>
          this._scopeGetNamed(namePtr, nameLen, pathPtr, pathLen),
        scope_set: (scopeHandle, pathPtr, pathLen, valuePtr, valueLen) =>
          this._scopeSet(scopeHandle, pathPtr, pathLen, valuePtr, valueLen),
        scope_set_named: (
          namePtr,
          nameLen,
          pathPtr,
          pathLen,
          valuePtr,
          valueLen,
        ) =>
          this._scopeSetNamed(
            namePtr,
            nameLen,
            pathPtr,
            pathLen,
            valuePtr,
            valueLen,
          ),
        scope_delete: (scopeHandle, pathPtr, pathLen) =>
          this._scopeDelete(scopeHandle, pathPtr, pathLen),
        scope_delete_named: (namePtr, nameLen, pathPtr, pathLen) =>
          this._scopeDeleteNamed(namePtr, nameLen, pathPtr, pathLen),
        scope_sync: (scopeHandle) => this._scopeSync(scopeHandle),
        scope_sync_named: (namePtr, nameLen) =>
          this._scopeSyncNamed(namePtr, nameLen),
        scope_watch: (scopeHandle, pathPtr, pathLen) =>
          this._scopeWatch(scopeHandle, pathPtr, pathLen),
        scope_watch_named: (namePtr, nameLen, pathPtr, pathLen) =>
          this._scopeWatchNamed(namePtr, nameLen, pathPtr, pathLen),
        scope_unwatch: (watchHandle) => this._scopeUnwatch(watchHandle),
        scope_unbind: (scopeHandle) => this._scopeUnbind(scopeHandle),
        scope_unbind_named: (namePtr, nameLen) =>
          this._scopeUnbindNamed(namePtr, nameLen),
        buffer_ptr: (bufferHandle) =>
          this._buffers.get(bufferHandle)?._ptr ?? 0,
        buffer_len: (bufferHandle) =>
          this._buffers.get(bufferHandle)?._len ?? 0,
        buffer_free: (bufferHandle) => {
          this.freeBuffer(bufferHandle);
        },
      },
    };
  }

  /** Attaches guest exports after instantiation. */
  attach(exports: WasmAbiExports): void {
    this._exports = exports;
  }

  /** Creates and registers a scope wrapper. */
  createScope(scope: ng.Scope, options: WasmScopeOptions = {}): WasmScope {
    const handle = this._nextScopeHandle++;
    const wasmScope = new WasmScope(this, scope, handle, options);

    this._scopes.set(handle, wasmScope);
    this._scopesByName.set(wasmScope.name, wasmScope);

    return wasmScope;
  }

  /** Returns a previously registered scope wrapper. */
  getScope(reference: WasmScopeReference): WasmScope | undefined {
    return this._resolveScope(reference);
  }

  /** Unregisters a scope wrapper without destroying the AngularTS scope. */
  unregisterScope(handle: number): boolean {
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
  notifyBind(scope: WasmScope): void {
    const exports = this._requireExports();

    if (!exports.ng_scope_on_bind) {
      return;
    }

    this._withGuestString(scope.name, (namePtr, nameLen) => {
      exports.ng_scope_on_bind?.(scope.handle, namePtr, nameLen);
    });
  }

  /** Invokes the optional guest update callback for a watched scope path. */
  notifyUpdate(update: WasmScopeUpdate): void {
    const exports = this._requireExports();

    if (!exports.ng_scope_on_update) {
      return;
    }

    this._withGuestString(update.path, (pathPtr, pathLen) => {
      this._withGuestJson(update.value, (valuePtr, valueLen) => {
        exports.ng_scope_on_update?.(
          update.scopeHandle,
          pathPtr,
          pathLen,
          valuePtr,
          valueLen,
        );
      });
    });
  }

  /** Invokes the optional guest unbind callback for a scope. */
  notifyUnbind(scope: WasmScope): void {
    this._exports?.ng_scope_on_unbind?.(scope.handle);
  }

  /** Releases one result buffer created by `scope_get`. */
  freeBuffer(bufferHandle: number): void {
    const buffer = this._buffers.get(bufferHandle);

    if (!buffer) {
      return;
    }

    this._buffers.delete(bufferHandle);
    this._requireExports().ng_abi_free(buffer._ptr, buffer._len);
  }

  /** @internal */
  private _scopeResolve(namePtr: number, nameLen: number): number {
    return (
      this._resolveScope(this._readGuestString(namePtr, nameLen))?.handle ?? 0
    );
  }

  /** @internal */
  private _scopeGet(
    scopeReference: WasmScopeReference,
    pathPtr: number,
    pathLen: number,
  ) {
    const scope = this._resolveScope(scopeReference);

    if (!scope) {
      return 0;
    }

    const path = this._readGuestString(pathPtr, pathLen);

    return this._createResultBuffer(scope.get(path));
  }

  /** @internal */
  private _scopeGetNamed(
    namePtr: number,
    nameLen: number,
    pathPtr: number,
    pathLen: number,
  ): number {
    return this._scopeGet(
      this._readGuestString(namePtr, nameLen),
      pathPtr,
      pathLen,
    );
  }

  /** @internal */
  private _scopeSet(
    scopeReference: WasmScopeReference,
    pathPtr: number,
    pathLen: number,
    valuePtr: number,
    valueLen: number,
  ): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) {
      return 0;
    }

    const path = this._readGuestString(pathPtr, pathLen);
    const value = this._readGuestJson(valuePtr, valueLen);

    return scope.set(path, value) ? 1 : 0;
  }

  /** @internal */
  private _scopeSetNamed(
    namePtr: number,
    nameLen: number,
    pathPtr: number,
    pathLen: number,
    valuePtr: number,
    valueLen: number,
  ): number {
    return this._scopeSet(
      this._readGuestString(namePtr, nameLen),
      pathPtr,
      pathLen,
      valuePtr,
      valueLen,
    );
  }

  /** @internal */
  private _scopeDelete(
    scopeReference: WasmScopeReference,
    pathPtr: number,
    pathLen: number,
  ): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) {
      return 0;
    }

    return scope.delete(this._readGuestString(pathPtr, pathLen)) ? 1 : 0;
  }

  /** @internal */
  private _scopeDeleteNamed(
    namePtr: number,
    nameLen: number,
    pathPtr: number,
    pathLen: number,
  ): number {
    return this._scopeDelete(
      this._readGuestString(namePtr, nameLen),
      pathPtr,
      pathLen,
    );
  }

  /** @internal */
  private _scopeSync(scopeReference: WasmScopeReference): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) {
      return 0;
    }

    scope.sync();

    return 1;
  }

  /** @internal */
  private _scopeSyncNamed(namePtr: number, nameLen: number): number {
    return this._scopeSync(this._readGuestString(namePtr, nameLen));
  }

  /** @internal */
  private _scopeWatch(
    scopeReference: WasmScopeReference,
    pathPtr: number,
    pathLen: number,
  ): number {
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
  private _scopeWatchNamed(
    namePtr: number,
    nameLen: number,
    pathPtr: number,
    pathLen: number,
  ): number {
    return this._scopeWatch(
      this._readGuestString(namePtr, nameLen),
      pathPtr,
      pathLen,
    );
  }

  /** @internal */
  private _scopeUnwatch(watchHandle: number): number {
    const watch = this._watches.get(watchHandle);

    if (!watch) {
      return 0;
    }

    this._watches.delete(watchHandle);
    watch._dispose();

    return 1;
  }

  /** @internal */
  private _scopeUnbind(scopeReference: WasmScopeReference): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) {
      return 0;
    }

    scope.dispose();

    return 1;
  }

  /** @internal */
  private _scopeUnbindNamed(namePtr: number, nameLen: number): number {
    return this._scopeUnbind(this._readGuestString(namePtr, nameLen));
  }

  /** @internal */
  private _createResultBuffer(value: unknown): number {
    const bufferHandle = this._nextBufferHandle++;
    const { ptr, len } = this._writeGuestJson(value);

    this._buffers.set(bufferHandle, {
      _ptr: ptr,
      _len: len,
    });

    return bufferHandle;
  }

  /** @internal */
  private _readGuestString(ptr: number, len: number): string {
    const memory = this._requireExports().memory;
    const bytes = new Uint8Array(memory.buffer, ptr, len);

    return textDecoder.decode(bytes);
  }

  /** @internal */
  private _readGuestJson(ptr: number, len: number): unknown {
    return JSON.parse(this._readGuestString(ptr, len)) as unknown;
  }

  /** @internal */
  private _writeGuestJson(value: unknown): { ptr: number; len: number } {
    return this._writeGuestString(JSON.stringify(value ?? null));
  }

  /** @internal */
  private _writeGuestString(value: string): { ptr: number; len: number } {
    const exports = this._requireExports();
    const bytes = textEncoder.encode(value);
    const ptr = exports.ng_abi_alloc(bytes.byteLength);

    new Uint8Array(exports.memory.buffer, ptr, bytes.byteLength).set(bytes);

    return { ptr, len: bytes.byteLength };
  }

  /** @internal */
  private _withGuestJson(
    value: unknown,
    callback: (ptr: number, len: number) => void,
  ): void {
    const { ptr, len } = this._writeGuestJson(value);

    try {
      callback(ptr, len);
    } finally {
      this._requireExports().ng_abi_free(ptr, len);
    }
  }

  /** @internal */
  private _withGuestString(
    value: string,
    callback: (ptr: number, len: number) => void,
  ): void {
    const { ptr, len } = this._writeGuestString(value);

    try {
      callback(ptr, len);
    } finally {
      this._requireExports().ng_abi_free(ptr, len);
    }
  }

  /** @internal */
  private _requireExports(): WasmAbiExports {
    if (!this._exports) {
      throw new Error("AngularTS Wasm scope ABI exports are not attached");
    }

    return this._exports;
  }

  /** @internal */
  private _resolveScope(reference: WasmScopeReference): WasmScope | undefined {
    return typeof reference === "number"
      ? this._scopes.get(reference)
      : this._scopesByName.get(reference);
  }
}

export class WasmProvider {
  $get = (): WasmService => {
    const load: WasmLoadService = async (
      src: string,
      imports: WebAssembly.Imports = {},
      opts: WasmOptions = {},
    ) => {
      const result = await instantiateWasm(src, imports);

      return opts.raw ? result : result.exports;
    };

    return Object.assign(load, {
      scope(scope: ng.Scope, options?: WasmScopeOptions): WasmScope {
        return new WasmScopeAbi().createScope(scope, options);
      },
      createScopeAbi(exports?: WasmAbiExports): WasmScopeAbi {
        return new WasmScopeAbi(exports);
      },
    });
  };
}

function readScopePath(scope: ng.Scope, path: string): unknown {
  if (!path) {
    return scope;
  }

  const keys = scopePathKeys(path);
  let current: unknown = scope;

  for (let i = 0, l = keys.length; i < l; i++) {
    if (current === null || current === undefined) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[keys[i]];
  }

  return current;
}

function writeScopePath(
  scope: ng.Scope,
  path: string,
  value: unknown,
): boolean {
  const keys = scopePathKeys(path);

  if (keys.length === 0) {
    return false;
  }

  let current = scope as Record<string, unknown>;

  for (let i = 0, l = keys.length - 1; i < l; i++) {
    const key = keys[i];
    const existing = current[key];

    if (existing && typeof existing === "object") {
      current = existing as Record<string, unknown>;
      continue;
    }

    const next: Record<string, unknown> = {};

    current[key] = next;
    current = next;
  }

  current[keys[keys.length - 1]] = value;

  return true;
}

function deleteScopePath(scope: ng.Scope, path: string): boolean {
  const keys = scopePathKeys(path);

  if (keys.length === 0) {
    return false;
  }

  let current = scope as Record<string, unknown>;

  for (let i = 0, l = keys.length - 1; i < l; i++) {
    const next = current[keys[i]];

    if (!next || typeof next !== "object") {
      return false;
    }

    current = next as Record<string, unknown>;
  }

  return deleteProperty(current, keys[keys.length - 1]);
}

function scopePathKeys(path: string): string[] {
  return path.split(".").filter(Boolean);
}
