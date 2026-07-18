import {
  compileWasm,
  deleteProperty,
  isNumber,
  isProxy,
  shouldHandleViewRetentionPause,
} from "../../shared/utils.ts";
import type { AppContext, Model } from "../../core/app-context/app-context.ts";
import {
  SCOPE_PROXY_BIND,
  type Scope,
  type ScopeProxyBindable,
} from "../../core/scope/scope.ts";

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

/** Source accepted by the WebAssembly loader. */
export type WasmSource =
  | string
  | URL
  | Request
  | Response
  | BufferSource
  | WebAssembly.Module;

/** Standard WebAssembly compilation options forwarded without translation. */
export interface WasmCompileOptions {
  /** Native WebAssembly builtin modules enabled while compiling. */
  builtins?: readonly string[];
  /** Native module name used for imported global string constants. */
  importedStringConstants?: string;
}

/** Declarative options for loading one WebAssembly module. */
export interface WasmLoadOptions {
  /** URL, request, response, bytes, or compiled WebAssembly module. */
  source: WasmSource;
  /** Imports supplied in addition to the AngularTS reactive ABI. */
  imports?: WebAssembly.Imports;
  /** Standard options forwarded to WebAssembly compilation. */
  compile?: WasmCompileOptions;
  /** Publish lifecycle timing entries through the browser Performance API. */
  diagnostics?: boolean;
}

/**
 * Reactive AngularTS value that can be exposed to a WebAssembly guest.
 *
 * App-context models implement `ng.Scope`, so the same contract covers both
 * durable models and root/view scopes without a redundant model union.
 */
export type WasmTarget = ng.Scope;

/** Options for binding one reactive target to a WebAssembly guest. */
export interface WasmBindingOptions {
  /** Stable name exposed to the guest. */
  name?: string;
  /** Reactive paths delivered to the guest's update callback. */
  watch?: readonly string[];
  /** Deliver each watched path's current value when binding. Defaults to `true`. */
  initial?: boolean;
}

/** Error categories reported by the high-level WebAssembly host. */
export type WasmErrorCode = "load" | "binding" | "disposed" | "unsupported-abi";

/** Lifecycle stage at which a WebAssembly operation failed. */
export type WasmErrorStage = "fetch" | "compile" | "link" | "start" | "bind";

/** Structured error raised by the high-level WebAssembly host. */
export class WasmError extends Error {
  readonly code: WasmErrorCode;
  readonly source?: WasmSource;
  readonly stage?: WasmErrorStage;

  constructor(
    code: WasmErrorCode,
    message: string,
    options: {
      cause?: unknown;
      source?: WasmSource;
      stage?: WasmErrorStage;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "WasmError";
    this.code = code;
    this.source = options.source;
    this.stage = options.stage;
  }
}

/** Active connection between one AngularTS target and a WebAssembly guest. */
export interface WasmBinding<TTarget extends WasmTarget = WasmTarget> {
  readonly name: string;
  readonly target: TTarget;
  readonly disposed: boolean;
  dispose(): void;
}

/** Lifecycle state of a WebAssembly resource. */
export type WasmResourceStatus = "loading" | "ready" | "error" | "disposed";

/** Loaded WebAssembly module with owned reactive bindings and lifecycle. */
export interface WasmResource<
  TExports extends WebAssembly.Exports = WebAssembly.Exports,
> {
  readonly source: WasmSource;
  readonly status: WasmResourceStatus;
  readonly ready: Promise<WasmResource<TExports>>;
  readonly error: WasmError | undefined;
  readonly instance: WebAssembly.Instance;
  readonly module: WebAssembly.Module;
  readonly exports: TExports;
  readonly disposed: boolean;
  bind<TTarget extends WasmTarget>(
    target: TTarget,
    options?: WasmBindingOptions,
  ): Promise<WasmBinding<TTarget>>;
  dispose(): void;
}

/** WebAssembly exports required by the language-neutral AngularTS ABI. */
export interface WasmAbiExports {
  /** Linear memory used for ABI string and JSON payload exchange. */
  memory: Pick<WebAssembly.Memory, "buffer">;
  /** Returns the AngularTS reactive ABI version implemented by this guest. */
  ng_abi_version(): number;
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
  /** Optional callback invoked with one watched scope transaction. */
  ng_scope_on_transaction?(
    scopeHandle: number,
    transactionPtr: number,
    transactionLen: number,
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
  /** Whether the path was removed instead of assigned. */
  deleted: boolean;
  /** Origin attached to the write, when the update came through the ABI. */
  origin?: string;
}

/** Coalesced watched transaction delivered from AngularTS to a Wasm guest. */
export interface WasmScopeTransactionUpdate {
  /** Host-side numeric scope handle. */
  scopeHandle: number;
  /** Stable scope name. */
  scopeName: string;
  /** Atomic set/delete patch observed during one scheduler turn. */
  transaction: WasmScopeTransaction;
  /** Shared origin when every coalesced change has the same origin. */
  origin?: string;
}

/** Atomic set/delete patch applied to one AngularTS reactive target. */
export interface WasmScopeTransaction {
  /** Dot-separated paths and their replacement values. */
  set?: Readonly<Record<string, unknown>>;
  /** Dot-separated paths removed by the transaction. */
  delete?: readonly string[];
}

/** Origin and echo behavior for one Wasm scope write. */
export interface WasmScopeWriteOptions {
  /** Stable source identifier used to prevent synchronization loops. */
  origin?: string;
  /** Deliver this write back to guest watches. Defaults to `true` for host calls. */
  echo?: boolean;
}

/** Machine-readable failures available to guests through `error_code`. */
export const WasmAbiError = Object.freeze({
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
} as const);

/** Numeric value returned by the guest-facing `error_code` import. */
export type WasmAbiErrorCode = (typeof WasmAbiError)[keyof typeof WasmAbiError];

/** Options for binding an AngularTS scope to Wasm lifecycle callbacks. */
export interface WasmScopeBindingOptions {
  /** Scope paths included in `ng_scope_on_transaction` callbacks. */
  watch?: readonly string[];
  /** Emit the current value for each watched path. Defaults to `true`. */
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
  /** Writes a JSON payload into a scope path. Returns `1` on success. */
  scope_set(
    scopeHandle: number,
    pathPtr: number,
    pathLen: number,
    valuePtr: number,
    valueLen: number,
  ): number;
  /** Applies an atomic JSON transaction. Returns `1` on success. */
  scope_apply(
    scopeHandle: number,
    transactionPtr: number,
    transactionLen: number,
  ): number;
  /** Returns a host-owned result buffer containing raw bytes for a scope path. */
  scope_get_binary(
    scopeHandle: number,
    pathPtr: number,
    pathLen: number,
  ): number;
  /** Writes raw bytes and JSON-encoded write options into a scope path. */
  scope_set_binary(
    scopeHandle: number,
    pathPtr: number,
    pathLen: number,
    valuePtr: number,
    valueLen: number,
    optionsPtr: number,
    optionsLen: number,
  ): number;
  /** Deletes a scope path. Returns `1` on success. */
  scope_delete(scopeHandle: number, pathPtr: number, pathLen: number): number;
  /** Runs queued Wasm scope bridge callbacks. Returns `1` on success. */
  scope_sync(scopeHandle: number): number;
  /** Watches a scope path and returns a watch handle. */
  scope_watch(scopeHandle: number, pathPtr: number, pathLen: number): number;
  /** Removes a watch handle. Returns `1` on success. */
  scope_unwatch(watchHandle: number): number;
  /** Unbinds a scope handle without destroying the AngularTS scope. */
  scope_unbind(scopeHandle: number): number;
  /** Returns the guest pointer for a host-owned result buffer. */
  buffer_ptr(bufferHandle: number): number;
  /** Returns the byte length for a host-owned result buffer. */
  buffer_len(bufferHandle: number): number;
  /** Releases a host-owned result buffer and its guest-memory allocation. */
  buffer_free(bufferHandle: number): void;
  /** Returns the last machine-readable guest-call failure. */
  error_code(): WasmAbiErrorCode;
  /** Clears the last guest-call failure. */
  error_clear(): void;
}

/** Full import object returned by `WasmScopeAbi.imports`. */
export interface WasmScopeAbiImportObject {
  /** AngularTS scope ABI import namespace. */
  [WASM_SCOPE_IMPORT_NAMESPACE]: WasmScopeAbiImports;
}

/** High-level WebAssembly host service. */
export interface WasmService {
  /** Loads one module and returns its owned resource. */
  load<TExports extends WebAssembly.Exports = WebAssembly.Exports>(
    options: WasmLoadOptions,
  ): WasmResource<TExports>;
}

/** @internal */
export interface WasmRuntimeState {
  readonly appContext: AppContext;
  readonly resources: Set<WasmResource>;
  /** @internal */
  readonly moduleCache: Map<string, WasmModuleCacheEntry>;
  /** @internal */
  readonly objectModuleCache: WeakMap<
    object,
    Map<string, WasmModuleCacheEntry>
  >;
  /** @internal */
  readonly moduleEntries: Set<WasmModuleCacheEntry>;
  destroyed: boolean;
}

interface WasmModuleCacheEntry {
  _controller: AbortController;
  _promise: Promise<WebAssembly.Module>;
  _references: number;
  _settled: boolean;
  _remove(): void;
}

interface WasmCompilationLease {
  readonly cacheStatus: WasmCompilationCacheStatus;
  readonly module: Promise<WebAssembly.Module>;
  release(): void;
}

type WasmCompilationCacheStatus = "hit" | "miss" | "shared-pending";

type WasmResourceLifecycle = {
  status: WasmResourceStatus;
};

interface WasmResultBuffer {
  _ptr: number;
  _len: number;
}

interface WasmPendingScopeWrite {
  _deleted: boolean;
  _echo: boolean;
  _origin?: string;
  _value: unknown;
}

interface WasmPendingGuestTransaction {
  _scopeName: string;
  _set: Record<string, unknown>;
  _delete: Set<string>;
  _origins: Set<string | undefined>;
}

interface WasmScopeTransactionRequest extends WasmScopeTransaction {
  origin?: string;
  echo?: boolean;
}

interface WasmWatchRegistration {
  _scope: WasmScopeImpl;
  _dispose: () => void;
}

interface WasmScopeRetentionState {
  _paused: boolean;
  _flushing: boolean;
  _pending: WasmScopeQueuedCallback[];
  _deregisterPause: (() => void) | undefined;
  _deregisterResume: (() => void) | undefined;
  _deregisterDestroy: (() => void) | undefined;
}

interface WasmScopeQueuedCallback {
  _key?: string;
  _callback: () => void;
}

const wasmScopeRetentionStates = new WeakMap<
  ng.Scope,
  WasmScopeRetentionState
>();

function resolveWasmScopeName(scope: ng.Scope, requestedName?: string): string {
  return requestedName ?? scope.$scopename ?? String(scope.$id);
}

/**
 * Host-side contract for one AngularTS scope exposed to Wasm clients.
 *
 * The wrapper mutates the real AngularTS scope. It does not use event bus,
 * scope-sync, DOM hydration, or object merging.
 */
export interface WasmScope {
  /** Numeric host handle passed to Wasm clients. */
  readonly handle: number;
  /** Stable scope name exposed over the ABI. */
  readonly name: string;
  /** Whether this wrapper has been disposed. */
  readonly disposed: boolean;
  /** Reads a dot-separated path from the wrapped AngularTS scope. */
  get(path: string): unknown;
  /** Writes a dot-separated path into the wrapped AngularTS scope. */
  set(path: string, value: unknown, options?: WasmScopeWriteOptions): boolean;
  /** Deletes a dot-separated path from the wrapped AngularTS scope. */
  delete(path: string, options?: WasmScopeWriteOptions): boolean;
  /** Applies one atomic set/delete transaction. */
  apply(
    transaction: WasmScopeTransaction,
    options?: WasmScopeWriteOptions,
  ): boolean;
  /** Reads a scope path as an owned byte array. */
  getBinary(path: string): Uint8Array | undefined;
  /** Writes an owned copy of a byte sequence into a scope path. */
  setBinary(
    path: string,
    value: BufferSource,
    options?: WasmScopeWriteOptions,
  ): boolean;
  /** Runs queued Wasm bridge callbacks for this scope. */
  sync(): void;
  /** Registers a callback that runs before this scope syncs. */
  onSync(callback: () => void): () => void;
  /** Watches one scope path and returns an operation that removes the watch. */
  watch(
    path: string,
    callback: (update: WasmScopeUpdate) => void,
    options?: WasmScopeWatchOptions,
  ): () => void;
  /** Binds this scope to guest callbacks and watched paths. */
  bind(options?: WasmScopeBindingOptions): () => void;
  /** Disposes ABI bindings without destroying the underlying AngularTS scope. */
  dispose(): void;
}

/** @internal */
class WasmScopeImpl implements WasmScope {
  readonly handle: number;
  readonly name: string;
  /** @internal */
  private readonly _abi: WasmScopeAbiImpl;
  /** @internal */
  private readonly _scope: ng.Scope;
  /** @internal */
  private readonly _bindings: (() => void)[];
  /** @internal */
  private readonly _syncCallbacks: (() => void)[];
  /** @internal */
  private _syncScheduled: boolean;
  /** @internal */
  private _destroyed: boolean;
  /** @internal */
  private readonly _retentionState: WasmScopeRetentionState;
  /** @internal */
  private readonly _pendingWrites = new Map<string, WasmPendingScopeWrite[]>();
  /** @internal */
  private readonly _watchedPaths = new Map<string, number>();

  /**
   * Creates a host-side Wasm wrapper around an AngularTS scope.
   *
   * Prefer `WasmScopeAbi.createScope()` so the wrapper is registered with an
   * ABI handle table immediately.
   */
  /** @internal */
  constructor(
    abi: WasmScopeAbiImpl,
    scope: ng.Scope,
    handle: number,
    options: WasmScopeOptions = {},
  ) {
    this._abi = abi;
    this._scope = scope;
    this.handle = handle;
    this.name = resolveWasmScopeName(scope, options.name);
    this._bindings = [];
    this._syncCallbacks = [];
    this._syncScheduled = false;
    this._destroyed = false;
    this._retentionState = getWasmScopeRetentionState(scope);
    this._bindings.push(
      scope.$on("$destroy", () => {
        this.dispose();
      }),
    );
  }

  /** Whether this wrapper has been disposed. */
  get disposed(): boolean {
    return this._destroyed;
  }

  /** Reads a dot-separated path from the wrapped AngularTS scope. */
  get(path: string): unknown {
    return readScopePath(this._scope, path);
  }

  /** Writes a dot-separated path into the wrapped AngularTS scope. */
  set(
    path: string,
    value: unknown,
    options: WasmScopeWriteOptions = {},
  ): boolean {
    const rollback = this._trackWrite(path, value, options, false);
    const written = writeScopePath(
      this._scope as unknown as Record<string, unknown>,
      path,
      value,
    );

    if (!written) rollback();

    return written;
  }

  /** Deletes a dot-separated path from the wrapped AngularTS scope. */
  delete(path: string, options: WasmScopeWriteOptions = {}): boolean {
    const rollback = this._trackWrite(path, undefined, options, true);
    const deleted = deleteScopePath(
      this._scope as unknown as Record<string, unknown>,
      path,
    );

    if (!deleted) rollback();

    return deleted;
  }

  /** Applies one atomic set/delete transaction. */
  apply(
    transaction: WasmScopeTransaction,
    options: WasmScopeWriteOptions = {},
  ): boolean {
    const normalized = normalizeWasmScopeTransaction(transaction);
    const model = this._scope as Model;
    const rollbacks = [
      ...Object.entries(normalized.set).map(([path, value]) =>
        this._trackWrite(path, value, options, false),
      ),
      ...normalized.delete.map((path) =>
        this._trackWrite(path, undefined, options, true),
      ),
    ];

    try {
      if (
        typeof model.$snapshot === "function" &&
        typeof model.$restore === "function"
      ) {
        const snapshot = model.$snapshot();

        applyWasmScopeTransaction(snapshot, normalized);
        model.$restore(snapshot, {
          origin: options.origin,
          mode: "replace",
        });
      } else {
        this._scope.$batch(() => {
          applyWasmScopeTransaction(
            this._scope as unknown as Record<string, unknown>,
            normalized,
          );
        });
      }
    } catch (error) {
      for (let index = rollbacks.length - 1; index >= 0; index--) {
        rollbacks[index]();
      }
      throw error;
    }

    return true;
  }

  /** Reads a scope path as an owned byte array. */
  getBinary(path: string): Uint8Array | undefined {
    return copyWasmBinaryValue(this.get(path));
  }

  /** Writes an owned copy of a byte sequence into a scope path. */
  setBinary(
    path: string,
    value: BufferSource,
    options: WasmScopeWriteOptions = {},
  ): boolean {
    const bytes = copyWasmBinaryValue(value);

    if (!bytes) {
      return false;
    }

    return this.set(path, bytes, options);
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
  watch(
    path: string,
    callback: (update: WasmScopeUpdate) => void,
    options: WasmScopeWatchOptions = {},
  ): () => void {
    this._watchedPaths.set(path, (this._watchedPaths.get(path) ?? 0) + 1);
    const dispose = this._scope.$watch(
      path,
      (value: unknown) => {
        if (this._destroyed) {
          return;
        }

        const pendingWrites = this._pendingWrites.get(path);
        const deleted = !hasScopePath(this._scope, path);
        let origin: string | undefined;

        if (pendingWrites) {
          const pending = pendingWrites.shift();

          if (pendingWrites.length === 0) this._pendingWrites.delete(path);
          origin = pending?._origin;

          if (pending && !pending._echo) {
            return;
          }
        }

        queueScopeAwareWasmCallback(
          this._scope,
          this._retentionState,
          `${String(this.handle)}:${path}`,
          () => {
            callback({
              scopeHandle: this.handle,
              scopeName: this.name,
              path,
              value,
              deleted,
              origin,
            });
          },
        );
      },
      !options.initial,
    );

    let disposed = false;

    return () => {
      if (disposed) return;

      disposed = true;
      dispose?.();

      const count = (this._watchedPaths.get(path) ?? 1) - 1;

      if (count > 0) {
        this._watchedPaths.set(path, count);
      } else {
        this._watchedPaths.delete(path);
        this._pendingWrites.delete(path);
      }
    };
  }

  /** @internal */
  private _trackWrite(
    path: string,
    value: unknown,
    options: WasmScopeWriteOptions,
    deleted: boolean,
  ): () => void {
    if (!this._watchedPaths.has(path)) {
      return () => undefined;
    }
    if (
      deleted
        ? !hasScopePath(this._scope, path)
        : hasScopePath(this._scope, path) &&
          Object.is(readScopePath(this._scope, path), value)
    ) {
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
      if (previous) this._pendingWrites.set(path, previous);
      else this._pendingWrites.delete(path);
    };
  }

  /** Binds this scope to its ABI's guest callbacks and watched paths. */
  bind(options: WasmScopeBindingOptions = {}): () => void {
    this._abi._notifyBind(this);

    const disposers = (options.watch ?? []).map((path) =>
      this.watch(
        path,
        (update) => {
          this._abi._queueUpdate(update);
        },
        { initial: options.initial ?? true },
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
      this._abi._notifyUnbind(this);
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
    this._pendingWrites.clear();
    this._watchedPaths.clear();
    this._syncScheduled = false;
    this._abi._unregisterScope(this.handle);
  }
}

/**
 * Language-neutral AngularTS scope ABI contract for raw Wasm clients.
 *
 * The ABI exchanges strings and JSON-compatible values through guest linear
 * memory. Guest modules provide `ng_abi_alloc` and `ng_abi_free`; AngularTS uses
 * those exports whenever it needs to place callback or return payloads in guest
 * memory.
 */
export interface WasmScopeAbi {
  /** Import object passed to `WebAssembly.instantiate`. */
  readonly imports: WasmScopeAbiImportObject;
  /** True after this ABI and all of its bindings have been disposed. */
  readonly disposed: boolean;
  /** Attaches and validates guest exports after instantiation. */
  attach(exports: WebAssembly.Exports): void;
  /** Creates and registers a scope wrapper. */
  createScope(scope: ng.Scope, options?: WasmScopeOptions): WasmScope;
  /** Returns a previously registered scope wrapper. */
  getScope(reference: WasmScopeReference): WasmScope | undefined;
  /** Disposes every scope, watch, and result buffer owned by this ABI. */
  dispose(): void;
}

/** @internal */
class WasmScopeAbiImpl implements WasmScopeAbi {
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
  private readonly _scopes = new Map<number, WasmScopeImpl>();
  /** @internal */
  private readonly _scopesByName = new Map<string, WasmScopeImpl>();
  /** @internal */
  private readonly _buffers = new Map<number, WasmResultBuffer>();
  /** @internal */
  private readonly _watches = new Map<number, WasmWatchRegistration>();
  /** @internal */
  private readonly _pendingGuestTransactions = new Map<
    number,
    WasmPendingGuestTransaction
  >();
  /** @internal */
  private _guestTransactionScheduled = false;
  /** @internal */
  private _bufferBytes = 0;
  /** @internal */
  private _guestCallbackDepth = 0;
  /** @internal */
  private _lastError: WasmAbiErrorCode = WasmAbiError.none;
  /** @internal */
  private _disposed = false;

  /** @internal */
  private readonly _reportGuestFault: (error: unknown) => void;
  /** @internal */
  private readonly _diagnostics: boolean;
  /** @internal */
  private readonly _diagnosticSource: WasmSource | undefined;

  /** Creates a detached scope ABI whose imports are ready for instantiation. */
  constructor(
    reportGuestFault: (error: unknown) => void = rethrowWasmFault,
    diagnostics = false,
    diagnosticSource?: WasmSource,
  ) {
    this._reportGuestFault = reportGuestFault;
    this._diagnostics = diagnostics;
    this._diagnosticSource = diagnosticSource;
    this.imports = {
      [WASM_SCOPE_IMPORT_NAMESPACE]: {
        scope_resolve: (namePtr, nameLen) =>
          this._guardGuestCall(
            "scope_resolve",
            () => this._scopeResolve(namePtr, nameLen),
            0,
          ),
        scope_get: (scopeHandle, pathPtr, pathLen) =>
          this._guardGuestCall(
            "scope_get",
            () => this._scopeGet(scopeHandle, pathPtr, pathLen),
            0,
          ),
        scope_set: (scopeHandle, pathPtr, pathLen, valuePtr, valueLen) =>
          this._guardGuestCall(
            "scope_set",
            () =>
              this._scopeSet(scopeHandle, pathPtr, pathLen, valuePtr, valueLen),
            0,
          ),
        scope_apply: (scopeHandle, transactionPtr, transactionLen) =>
          this._guardGuestCall(
            "scope_apply",
            () => this._scopeApply(scopeHandle, transactionPtr, transactionLen),
            0,
          ),
        scope_get_binary: (scopeHandle, pathPtr, pathLen) =>
          this._guardGuestCall(
            "scope_get_binary",
            () => this._scopeGetBinary(scopeHandle, pathPtr, pathLen),
            0,
          ),
        scope_set_binary: (
          scopeHandle,
          pathPtr,
          pathLen,
          valuePtr,
          valueLen,
          optionsPtr,
          optionsLen,
        ) =>
          this._guardGuestCall(
            "scope_set_binary",
            () =>
              this._scopeSetBinary(
                scopeHandle,
                pathPtr,
                pathLen,
                valuePtr,
                valueLen,
                optionsPtr,
                optionsLen,
              ),
            0,
          ),
        scope_delete: (scopeHandle, pathPtr, pathLen) =>
          this._guardGuestCall(
            "scope_delete",
            () => this._scopeDelete(scopeHandle, pathPtr, pathLen),
            0,
          ),
        scope_sync: (scopeHandle) =>
          this._guardGuestCall(
            "scope_sync",
            () => this._scopeSync(scopeHandle),
            0,
          ),
        scope_watch: (scopeHandle, pathPtr, pathLen) =>
          this._guardGuestCall(
            "scope_watch",
            () => this._scopeWatch(scopeHandle, pathPtr, pathLen),
            0,
          ),
        scope_unwatch: (watchHandle) =>
          this._guardGuestCall(
            "scope_unwatch",
            () => this._scopeUnwatch(watchHandle),
            0,
          ),
        scope_unbind: (scopeHandle) =>
          this._guardGuestCall(
            "scope_unbind",
            () => this._scopeUnbind(scopeHandle),
            0,
          ),
        buffer_ptr: (bufferHandle) =>
          this._guardGuestCall(
            "buffer_ptr",
            () => this._requireBuffer(bufferHandle)._ptr,
            0,
          ),
        buffer_len: (bufferHandle) =>
          this._guardGuestCall(
            "buffer_len",
            () => this._requireBuffer(bufferHandle)._len,
            0,
          ),
        buffer_free: (bufferHandle) => {
          this._guardGuestCall(
            "buffer_free",
            () => {
              this._freeBuffer(bufferHandle);
            },
            undefined,
          );
        },
        error_code: () => this._lastError,
        error_clear: () => {
          this._lastError = WasmAbiError.none;
        },
      },
    };
  }

  /** True after this ABI and all of its bindings have been disposed. */
  get disposed(): boolean {
    return this._disposed;
  }

  /** Attaches and validates guest exports after instantiation. */
  attach(exports: WebAssembly.Exports): void {
    if (this._disposed) {
      throw new Error("Cannot attach exports to a disposed Wasm scope ABI");
    }

    if (!hasWasmAbiCoreExports(exports)) {
      throw new Error(
        "WebAssembly module does not export the AngularTS reactive ABI",
      );
    }

    const version = readWasmAbiVersion(exports);

    if (version !== WASM_ABI_VERSION) {
      throw new WasmAbiVersionError(version);
    }

    if (this._exports && this._exports !== exports) {
      throw new Error("Wasm scope ABI exports are already attached");
    }

    this._exports = exports as WebAssembly.Exports & WasmAbiExports;
  }

  /** Creates and registers a scope wrapper. */
  createScope(scope: ng.Scope, options: WasmScopeOptions = {}): WasmScopeImpl {
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
  getScope(reference: WasmScopeReference): WasmScopeImpl | undefined {
    return this._resolveScope(reference);
  }

  /** @internal */
  _unregisterScope(handle: number): boolean {
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
  _notifyBind(scope: WasmScopeImpl): void {
    const exports = this._requireExports();

    if (!exports.ng_scope_on_bind) {
      return;
    }

    this._withGuestString(scope.name, (namePtr, nameLen) => {
      this._runGuestCallback("bind", () => {
        exports.ng_scope_on_bind?.(scope.handle, namePtr, nameLen);
      });
    });
  }

  /** @internal */
  _queueUpdate(update: WasmScopeUpdate): void {
    let pending = this._pendingGuestTransactions.get(update.scopeHandle);

    if (!pending) {
      pending = {
        _scopeName: update.scopeName,
        _set: Object.create(null) as Record<string, unknown>,
        _delete: new Set(),
        _origins: new Set(),
      };
      this._pendingGuestTransactions.set(update.scopeHandle, pending);
    }

    if (update.deleted) {
      deleteProperty(pending._set, update.path);
      pending._delete.add(update.path);
    } else {
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
  private _notifyTransaction(
    scopeHandle: number,
    pending: WasmPendingGuestTransaction,
  ): void {
    const exports = this._requireExports();

    if (!exports.ng_scope_on_transaction) {
      return;
    }

    const origins = Array.from(pending._origins);
    const origin = origins.length === 1 ? origins[0] : undefined;
    const transaction: WasmScopeTransactionRequest = {
      set: pending._set,
      delete: Array.from(pending._delete),
      ...(origin === undefined ? {} : { origin }),
    };

    try {
      this._withGuestJson(transaction, (transactionPtr, transactionLen) => {
        this._runGuestCallback("transaction", () => {
          exports.ng_scope_on_transaction?.(
            scopeHandle,
            transactionPtr,
            transactionLen,
          );
        });
      });
    } catch (error) {
      const scope = this._scopes.get(scopeHandle);

      scope?.dispose();
      this._reportGuestFault(error);
    }
  }

  /** @internal */
  _notifyUnbind(scope: WasmScopeImpl): void {
    try {
      this._runGuestCallback("unbind", () => {
        this._exports?.ng_scope_on_unbind?.(scope.handle);
      });
    } catch (error) {
      queueMicrotask(() => {
        this._reportGuestFault(error);
      });
    }
  }

  /** @internal */
  _freeBuffer(bufferHandle: number): void {
    const buffer = this._buffers.get(bufferHandle);

    if (!buffer) throw createWasmGuestError("invalidHandle");

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
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;

    for (const scope of Array.from(this._scopes.values())) scope.dispose();
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
  private _scopeResolve(namePtr: number, nameLen: number): number {
    return (
      this._resolveScope(
        this._readGuestString(
          namePtr,
          nameLen,
          MAX_WASM_ABI_PATH_BYTES,
          "scope name",
        ),
      )?.handle ?? 0
    );
  }

  /** @internal */
  private _scopeGet(
    scopeReference: WasmScopeReference,
    pathPtr: number,
    pathLen: number,
  ) {
    const scope = this._resolveScope(scopeReference);

    if (!scope) throw createWasmGuestError("invalidHandle");

    const path = this._readGuestString(
      pathPtr,
      pathLen,
      MAX_WASM_ABI_PATH_BYTES,
      "scope path",
    );
    assertSafeWasmScopePath(path);

    return this._createResultBuffer(scope.get(path));
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

    if (!scope) throw createWasmGuestError("invalidHandle");

    const path = this._readGuestString(
      pathPtr,
      pathLen,
      MAX_WASM_ABI_PATH_BYTES,
      "scope path",
    );
    assertSafeWasmScopePath(path);
    const value = this._readGuestJson(valuePtr, valueLen);
    const options = normalizeWasmScopeWriteOptions(undefined, false);

    scope.set(path, value, options);

    return 1;
  }

  /** @internal */
  private _scopeApply(
    scopeReference: WasmScopeReference,
    transactionPtr: number,
    transactionLen: number,
  ): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) throw createWasmGuestError("invalidHandle");

    const request = this._readGuestJson(
      transactionPtr,
      transactionLen,
    ) as WasmScopeTransactionRequest;
    const options = normalizeWasmScopeWriteOptions(request, false);
    scope.apply(request, options);

    return 1;
  }

  /** @internal */
  private _scopeGetBinary(
    scopeReference: WasmScopeReference,
    pathPtr: number,
    pathLen: number,
  ): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) throw createWasmGuestError("invalidHandle");

    const path = this._readGuestString(
      pathPtr,
      pathLen,
      MAX_WASM_ABI_PATH_BYTES,
      "scope path",
    );

    assertSafeWasmScopePath(path);

    const bytes = scope.getBinary(path);

    if (!bytes) throw createWasmGuestError("unsupportedValue");

    return this._createResultBytes(bytes);
  }

  /** @internal */
  private _scopeSetBinary(
    scopeReference: WasmScopeReference,
    pathPtr: number,
    pathLen: number,
    valuePtr: number,
    valueLen: number,
    optionsPtr: number,
    optionsLen: number,
  ): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) throw createWasmGuestError("invalidHandle");

    const path = this._readGuestString(
      pathPtr,
      pathLen,
      MAX_WASM_ABI_PATH_BYTES,
      "scope path",
    );
    assertSafeWasmScopePath(path);
    const value = this._readGuestBytes(valuePtr, valueLen).slice();
    const options = normalizeWasmScopeWriteOptions(
      optionsLen === 0
        ? undefined
        : this._readGuestJson(optionsPtr, optionsLen),
      false,
    );

    scope.set(path, value, options);

    return 1;
  }

  /** @internal */
  private _scopeDelete(
    scopeReference: WasmScopeReference,
    pathPtr: number,
    pathLen: number,
  ): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) throw createWasmGuestError("invalidHandle");

    const path = this._readGuestString(
      pathPtr,
      pathLen,
      MAX_WASM_ABI_PATH_BYTES,
      "scope path",
    );

    assertSafeWasmScopePath(path);

    const options = normalizeWasmScopeWriteOptions(undefined, false);

    if (!scope.delete(path, options)) {
      throw createWasmGuestError("operationFailed");
    }

    return 1;
  }

  /** @internal */
  private _scopeSync(scopeReference: WasmScopeReference): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) throw createWasmGuestError("invalidHandle");

    scope.sync();

    return 1;
  }

  /** @internal */
  private _scopeWatch(
    scopeReference: WasmScopeReference,
    pathPtr: number,
    pathLen: number,
  ): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) throw createWasmGuestError("invalidHandle");

    if (this._watches.size >= MAX_WASM_ABI_WATCHES) {
      throw createWasmGuestError("limitExceeded");
    }

    const path = this._readGuestString(
      pathPtr,
      pathLen,
      MAX_WASM_ABI_PATH_BYTES,
      "scope path",
    );
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
  private _scopeUnwatch(watchHandle: number): number {
    const watch = this._watches.get(watchHandle);

    if (!watch) throw createWasmGuestError("invalidHandle");

    this._watches.delete(watchHandle);
    watch._dispose();

    return 1;
  }

  /** @internal */
  private _scopeUnbind(scopeReference: WasmScopeReference): number {
    const scope = this._resolveScope(scopeReference);

    if (!scope) throw createWasmGuestError("invalidHandle");

    scope.dispose();

    return 1;
  }

  /** @internal */
  private _createResultBuffer(value: unknown): number {
    return this._createResultBytes(
      textEncoder.encode(JSON.stringify(value ?? null)),
    );
  }

  /** @internal */
  private _createResultBytes(bytes: Uint8Array): number {
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
  private _readGuestString(
    ptr: number,
    len: number,
    maximum = MAX_WASM_ABI_PAYLOAD_BYTES,
    label = "payload",
  ): string {
    const bytes = this._readGuestBytes(ptr, len, maximum, label);

    return textDecoder.decode(bytes);
  }

  /** @internal */
  private _readGuestBytes(
    ptr: number,
    len: number,
    maximum = MAX_WASM_ABI_PAYLOAD_BYTES,
    label = "payload",
  ): Uint8Array {
    const { memory } = this._requireExports();

    assertWasmMemoryRange(memory, ptr, len, maximum, label);

    return new Uint8Array(memory.buffer, ptr, len);
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
    return this._writeGuestBytes(textEncoder.encode(value));
  }

  /** @internal */
  private _writeGuestBytes(bytes: Uint8Array): { ptr: number; len: number } {
    const exports = this._requireExports();

    if (bytes.byteLength > MAX_WASM_ABI_PAYLOAD_BYTES) {
      throw new Error(
        `AngularTS Wasm ABI payload exceeds ${String(MAX_WASM_ABI_PAYLOAD_BYTES)} bytes`,
      );
    }

    const ptr = exports.ng_abi_alloc(bytes.byteLength);

    assertWasmMemoryRange(
      exports.memory,
      ptr,
      bytes.byteLength,
      MAX_WASM_ABI_PAYLOAD_BYTES,
      "guest allocation",
    );

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
  private _resolveScope(
    reference: WasmScopeReference,
  ): WasmScopeImpl | undefined {
    return isNumber(reference)
      ? this._scopes.get(reference)
      : this._scopesByName.get(reference);
  }

  /** @internal */
  private _guardGuestCall<T>(
    _operation: string,
    callback: () => T,
    fallback: T,
  ): T {
    this._lastError = WasmAbiError.none;

    if (this._disposed) {
      this._lastError = WasmAbiError.disposed;

      return fallback;
    }

    try {
      return callback();
    } catch (error) {
      this._lastError = classifyWasmGuestError(error);

      return fallback;
    }
  }

  /** @internal */
  private _requireBuffer(bufferHandle: number): WasmResultBuffer {
    const buffer = this._buffers.get(bufferHandle);

    if (!buffer) throw createWasmGuestError("invalidHandle");

    return buffer;
  }

  /** @internal */
  private _runGuestCallback(
    callbackName: "bind" | "transaction" | "unbind",
    callback: () => void,
  ): void {
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
      } finally {
        measureWasmPerformance(
          "guest-callback",
          startedAt,
          true,
          this._diagnosticSource,
          { callback: callbackName },
        );
      }
    } finally {
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
export const WasmAbi = Object.freeze({
  /** AngularTS reactive ABI version expected from guest modules. */
  version: WASM_ABI_VERSION,
  /** Creates a detached ABI whose imports are ready for guest instantiation. */
  create(): WasmScopeAbi {
    return new WasmScopeAbiImpl();
  },
});

class WasmBindingImpl<
  TTarget extends WasmTarget = WasmTarget,
> implements WasmBinding<TTarget> {
  readonly name: string;
  readonly target: TTarget;
  /** @internal */
  private readonly _scope: WasmScope;
  /** @internal */
  private readonly _onDispose: () => void;
  /** @internal */
  private _disposed = false;

  constructor(scope: WasmScope, target: TTarget, onDispose: () => void) {
    this._scope = scope;
    this.target = target;
    this.name = scope.name;
    this._onDispose = onDispose;
  }

  get disposed(): boolean {
    return this._disposed || this._scope.disposed;
  }

  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;
    this._scope.dispose();
    this._onDispose();
  }
}

class WasmResourceImpl<TExports extends WebAssembly.Exports>
  implements WasmResource<TExports>, ScopeProxyBindable
{
  readonly source: WasmSource;
  readonly ready: Promise<WasmResource<TExports>>;
  /** @internal */
  private readonly _abi: WasmScopeAbi;
  /** @internal */
  private readonly _abortController = new AbortController();
  /** @internal */
  private readonly _bindings = new Set<WasmBindingImpl>();
  /** @internal */
  private readonly _scopeBindings = new Map<number, Scope>();
  /** @internal */
  private readonly _lifecycle: Model<WasmResourceLifecycle>;
  /** @internal */
  private readonly _onDispose: () => void;
  /** @internal */
  private readonly _compilation: WasmCompilationLease;
  /** @internal */
  private readonly _diagnostics: boolean;
  /** @internal */
  private _status: WasmResourceStatus = "loading";
  /** @internal */
  private _error: WasmError | undefined;
  /** @internal */
  private _result:
    | {
        instance: WebAssembly.Instance;
        module: WebAssembly.Module;
        exports: TExports;
      }
    | undefined;

  constructor(
    options: WasmLoadOptions,
    abi: WasmScopeAbi,
    lifecycle: Model<WasmResourceLifecycle>,
    compilation: WasmCompilationLease,
    onDispose: () => void,
  ) {
    this.source = options.source;
    this._abi = abi;
    this._lifecycle = lifecycle;
    this._compilation = compilation;
    this._diagnostics = options.diagnostics === true;
    this._onDispose = onDispose;
    this.ready = this._load(options);
    void this.ready.catch(() => undefined);
  }

  get status(): WasmResourceStatus {
    if (!this._lifecycle.$handler._destroyed) {
      void this._lifecycle.status;
    }

    return this._status;
  }

  get error(): WasmError | undefined {
    if (!this._lifecycle.$handler._destroyed) {
      void this._lifecycle.status;
    }

    return this._error;
  }

  get instance(): WebAssembly.Instance {
    return this._requireResult().instance;
  }

  get module(): WebAssembly.Module {
    return this._requireResult().module;
  }

  get exports(): TExports {
    return this._requireResult().exports;
  }

  get disposed(): boolean {
    return this._status === "disposed";
  }

  /** @internal */
  [SCOPE_PROXY_BIND](handler: Scope): void {
    if (!handler._destroyed) {
      this._scopeBindings.set(handler.$id, handler);
    }
  }

  async bind<TTarget extends WasmTarget>(
    target: TTarget,
    options: WasmBindingOptions = {},
  ): Promise<WasmBinding<TTarget>> {
    const startedAt = nowWasmPerformance();

    if (this.disposed) {
      throw this._disposedError("Cannot bind a disposed WebAssembly resource");
    }

    if (target.$handler._destroyed) {
      throw new WasmError(
        "binding",
        "Cannot bind a destroyed AngularTS reactive target",
        { source: this.source, stage: "bind" },
      );
    }

    if (options.name?.trim().length === 0) {
      throw new WasmError("binding", "Wasm scope name must not be empty", {
        source: this.source,
        stage: "bind",
      });
    }

    let removeDestroyListener!: () => void;
    const targetDestroyed = new Promise<never>((_resolve, reject) => {
      removeDestroyListener = target.$on("$destroy", () => {
        reject(
          new WasmError(
            "binding",
            "Cannot bind a destroyed AngularTS reactive target",
            { source: this.source, stage: "bind" },
          ),
        );
      });
    });

    try {
      return await Promise.race([
        this.ready.then(() => this._bindReadyTarget(target, options)),
        targetDestroyed,
      ]);
    } finally {
      removeDestroyListener();
      measureWasmPerformance("bind", startedAt, this._diagnostics, this.source);
    }
  }

  dispose(): void {
    if (this.disposed) return;

    this._setStatus("disposed");
    this._abortController.abort();
    this._compilation.release();

    for (const binding of Array.from(this._bindings)) binding.dispose();

    this._bindings.clear();
    this._scheduleLifecycleBindings(["disposed", "status"]);
    this._scopeBindings.clear();
    this._abi.dispose();
    this._result = undefined;
    this._onDispose();
  }

  /** @internal */
  private async _load(
    options: WasmLoadOptions,
  ): Promise<WasmResource<TExports>> {
    const loadStartedAt = nowWasmPerformance();
    let stage: WasmErrorStage = "compile";

    try {
      const compileStartedAt = nowWasmPerformance();
      const module = await waitForWasmCompilation(
        this._compilation.module,
        this._abortController.signal,
      );
      measureWasmPerformance(
        "compile",
        compileStartedAt,
        this._diagnostics,
        this.source,
        { cacheStatus: this._compilation.cacheStatus },
      );

      stage = "link";
      const instantiateStartedAt = nowWasmPerformance();
      const instance = await WebAssembly.instantiate(
        module,
        mergeWasmImports(options.imports, this._abi.imports),
      );
      measureWasmPerformance(
        "instantiate",
        instantiateStartedAt,
        this._diagnostics,
        this.source,
      );

      if (this.disposed) {
        throw this._disposedError(
          "WebAssembly resource was disposed while loading",
        );
      }

      const exports = instance.exports as TExports;

      this._result = { instance, module, exports };

      if (hasWasmAbiCoreExports(instance.exports)) {
        this._abi.attach(instance.exports);
      }

      this._setStatus("ready");
      measureWasmPerformance(
        "load",
        loadStartedAt,
        this._diagnostics,
        this.source,
        { status: "ready" },
      );

      return this;
    } catch (cause) {
      if (this.disposed) {
        throw cause instanceof WasmError
          ? cause
          : this._disposedError(
              "WebAssembly resource was disposed while loading",
              cause,
            );
      }

      const error =
        cause instanceof WasmError
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
      measureWasmPerformance(
        "load",
        loadStartedAt,
        this._diagnostics,
        this.source,
        { status: "error" },
      );

      throw error;
    } finally {
      this._compilation.release();
    }
  }

  /** @internal */
  private _bindReadyTarget<TTarget extends WasmTarget>(
    target: TTarget,
    options: WasmBindingOptions,
  ): WasmBinding<TTarget> {
    if (this.disposed) {
      throw this._disposedError("Cannot bind a disposed WebAssembly resource");
    }

    if (!isWasmAbiExports(this.exports)) {
      throw new WasmError(
        "unsupported-abi",
        "WebAssembly module does not export the AngularTS reactive ABI",
        { source: this.source, stage: "bind" },
      );
    }

    let scope: WasmScope | undefined;

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
    } catch (cause) {
      scope?.dispose();

      if (cause instanceof WasmError) throw cause;

      throw new WasmError(
        "binding",
        cause instanceof Error
          ? cause.message
          : "WebAssembly target binding failed",
        {
          cause,
          source: this.source,
          stage: "bind",
        },
      );
    }
  }

  /** @internal */
  private _requireResult(): NonNullable<WasmResourceImpl<TExports>["_result"]> {
    if (this._result) return this._result;

    if (this.disposed) {
      throw this._disposedError("WebAssembly resource has been disposed");
    }

    throw (
      this._error ??
      new WasmError("load", "WebAssembly resource is still loading", {
        source: this.source,
      })
    );
  }

  /** @internal */
  private _disposedError(message: string, cause?: unknown): WasmError {
    return new WasmError("disposed", message, {
      cause,
      source: this.source,
    });
  }

  /** @internal */
  private _setStatus(status: WasmResourceStatus): void {
    this._status = status;

    if (!this._lifecycle.$handler._destroyed) {
      this._lifecycle.status = status;
    }

    this._scheduleLifecycleBindings(["status", "disposed"]);
  }

  /** @internal */
  private _setError(error: WasmError): void {
    this._error = error;
    this._scheduleLifecycleBindings(["error"]);
  }

  /** @internal */
  private _scheduleLifecycleBindings(keys: string[]): void {
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
export function createWasmRuntimeState(
  appContext: AppContext,
): WasmRuntimeState {
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
export function destroyWasmRuntimeState(state: WasmRuntimeState): void {
  if (state.destroyed) return;

  state.destroyed = true;

  for (const resource of Array.from(state.resources)) resource.dispose();

  for (const entry of state.moduleEntries) {
    if (!entry._settled) entry._controller.abort();
  }

  state.resources.clear();
  state.moduleEntries.clear();
  state.moduleCache.clear();
}

/** @internal */
export function createWasmService(state: WasmRuntimeState): WasmService {
  const assertActive = (): void => {
    if (state.destroyed) {
      throw new WasmError(
        "disposed",
        "Cannot use $wasm after runtime teardown",
      );
    }
  };

  return {
    load<TExports extends WebAssembly.Exports = WebAssembly.Exports>(
      options: WasmLoadOptions,
    ): WasmResource<TExports> {
      assertActive();

      const abi = new WasmScopeAbiImpl(
        (error) => {
          state.appContext._reportModelException(error);
        },
        options.diagnostics === true,
        options.source,
      );
      const lifecycle = state.appContext.createReactive<WasmResourceLifecycle>({
        status: "loading",
      });
      const compilation = acquireWasmCompilation(state, options);
      const resource: WasmResource<TExports> = new WasmResourceImpl<TExports>(
        options,
        abi,
        lifecycle,
        compilation,
        () => {
          state.resources.delete(resource);
          state.appContext._releaseReactive(lifecycle);
        },
      );
      state.resources.add(resource);
      return resource;
    },
  };
}

function acquireWasmCompilation(
  state: WasmRuntimeState,
  options: WasmLoadOptions,
): WasmCompilationLease {
  const compileOptions = snapshotWasmCompileOptions(options.compile);
  const location = getWasmModuleCacheLocation(
    state,
    options.source,
    compileOptions,
  );
  const existing = location?.get();

  if (existing) {
    existing._references++;

    return createWasmCompilationLease(
      existing,
      existing._settled ? "hit" : "shared-pending",
    );
  }

  const controller = new AbortController();
  const promise = compileWasm(
    options.source,
    controller.signal,
    compileOptions,
  );
  const entry: WasmModuleCacheEntry = {
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
  void promise.then(
    () => {
      entry._settled = true;
      state.moduleEntries.delete(entry);
      trimWasmModuleCache(state);

      return undefined;
    },
    () => {
      entry._settled = true;
      entry._remove();

      return undefined;
    },
  );

  return createWasmCompilationLease(entry, "miss");
}

function createWasmCompilationLease(
  entry: WasmModuleCacheEntry,
  cacheStatus: WasmCompilationCacheStatus,
): WasmCompilationLease {
  let released = false;

  return {
    cacheStatus,
    module: entry._promise,
    release(): void {
      if (released) return;

      released = true;
      entry._references--;

      if (entry._references === 0 && !entry._settled) {
        entry._remove();
        entry._controller.abort();
      }
    },
  };
}

interface WasmModuleCacheLocation {
  delete(entry: WasmModuleCacheEntry): void;
  get(): WasmModuleCacheEntry | undefined;
  set(entry: WasmModuleCacheEntry): void;
}

function getWasmModuleCacheLocation(
  state: WasmRuntimeState,
  source: WasmSource,
  compileOptions: WasmCompileOptions | undefined,
): WasmModuleCacheLocation | undefined {
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
        if (state.moduleCache.get(key) === entry) state.moduleCache.delete(key);
      },
    };
  }

  if (
    (source instanceof Request &&
      source.cache !== "no-store" &&
      source.cache !== "reload") ||
    source instanceof Response
  ) {
    let bucket = state.objectModuleCache.get(source);

    if (!bucket) {
      bucket = new Map();
      state.objectModuleCache.set(source, bucket);
    }

    return {
      get: () => bucket.get(compileKey),
      set: (entry) => bucket.set(compileKey, entry),
      delete: (entry) => {
        if (bucket.get(compileKey) === entry) bucket.delete(compileKey);
      },
    };
  }

  return undefined;
}

function trimWasmModuleCache(state: WasmRuntimeState): void {
  if (state.moduleCache.size <= MAX_WASM_MODULE_CACHE_ENTRIES) return;

  for (const [key, entry] of state.moduleCache) {
    if (state.moduleCache.size <= MAX_WASM_MODULE_CACHE_ENTRIES) return;
    if (!entry._settled) continue;

    state.moduleCache.delete(key);
  }
}

function normalizeWasmSourceUrl(source: string | URL): string {
  try {
    return new URL(String(source), globalThis.location.href).href;
  } catch {
    return String(source);
  }
}

function serializeWasmCompileOptions(
  options: WasmCompileOptions | undefined,
): string {
  if (options === undefined) return "default";

  return JSON.stringify({
    builtins: options.builtins ?? [],
    importedStringConstants: options.importedStringConstants ?? null,
  });
}

function snapshotWasmCompileOptions(
  options: WasmCompileOptions | undefined,
): WasmCompileOptions | undefined {
  if (options === undefined) return undefined;

  const snapshot: WasmCompileOptions = {};

  if (options.builtins !== undefined) {
    snapshot.builtins = Object.freeze(Array.from(options.builtins));
  }
  if (options.importedStringConstants !== undefined) {
    snapshot.importedStringConstants = options.importedStringConstants;
  }

  return Object.freeze(snapshot);
}

function waitForWasmCompilation(
  compilation: Promise<WebAssembly.Module>,
  signal: AbortSignal,
): Promise<WebAssembly.Module> {
  return new Promise((resolve, reject) => {
    const abort = (): void => {
      reject(new DOMException("The operation was aborted", "AbortError"));
    };
    const settle = (): void => {
      signal.removeEventListener("abort", abort);
    };

    signal.addEventListener("abort", abort, { once: true });
    void compilation.then(
      (module) => {
        settle();
        resolve(module);

        return undefined;
      },
      (error: unknown) => {
        settle();
        reject(
          error instanceof Error
            ? error
            : new Error("WebAssembly compilation failed", { cause: error }),
        );

        return undefined;
      },
    );
  });
}

function nowWasmPerformance(): number {
  return globalThis.performance.now();
}

function measureWasmPerformance(
  phase: "bind" | "compile" | "guest-callback" | "instantiate" | "load",
  startedAt: number,
  enabled: boolean,
  source: WasmSource,
  detail: Record<string, unknown> = {},
): void {
  if (!enabled) return;

  try {
    globalThis.performance.measure(`angular.ts:wasm:${phase}`, {
      start: startedAt,
      end: nowWasmPerformance(),
      detail: {
        ...detail,
        source: describeWasmSource(source),
      },
    });
  } catch {
    // Performance diagnostics must never affect resource behavior.
  }
}

function describeWasmSource(source: WasmSource): string {
  if (typeof source === "string" || source instanceof URL)
    return String(source);
  if (source instanceof Request) return source.url;
  if (source instanceof Response) return source.url || "Response";
  if (source instanceof WebAssembly.Module) return "WebAssembly.Module";

  return "BufferSource";
}

function mergeWasmImports(
  imports: WebAssembly.Imports = {},
  abiImports: WasmScopeAbiImportObject,
): WebAssembly.Imports {
  const angularImports = imports[WASM_SCOPE_IMPORT_NAMESPACE] ?? {};
  const reservedImports = abiImports[WASM_SCOPE_IMPORT_NAMESPACE];

  for (const name of Object.keys(reservedImports)) {
    if (Object.prototype.hasOwnProperty.call(angularImports, name)) {
      throw new Error(
        `WebAssembly import '${WASM_SCOPE_IMPORT_NAMESPACE}.${name}' is reserved by AngularTS`,
      );
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

function classifyWasmErrorStage(
  cause: unknown,
  stage: "compile" | "link",
  source: WasmSource,
): WasmErrorStage {
  if (stage === "link") {
    return cause instanceof WebAssembly.RuntimeError ? "start" : "link";
  }

  if (
    cause instanceof Error &&
    (cause.message.startsWith("WebAssembly fetch failed") ||
      (cause instanceof TypeError &&
        (typeof source === "string" ||
          source instanceof URL ||
          source instanceof Request)))
  ) {
    return "fetch";
  }

  return "compile";
}

function createWasmLoadError(
  cause: unknown,
  stage: "compile" | "link",
  source: WasmSource,
): WasmError {
  const failureStage = classifyWasmErrorStage(cause, stage, source);
  const detail = cause instanceof Error ? `: ${cause.message}` : "";

  return new WasmError(
    "load",
    `WebAssembly module failed during ${failureStage}${detail}`,
    {
      cause,
      source,
      stage: failureStage,
    },
  );
}

function isWasmAbiExports(
  exports: WebAssembly.Exports,
): exports is WebAssembly.Exports & WasmAbiExports {
  return (
    hasWasmAbiCoreExports(exports) &&
    readWasmAbiVersion(exports) === WASM_ABI_VERSION
  );
}

function hasWasmAbiCoreExports(
  exports: WebAssembly.Exports,
): exports is WebAssembly.Exports &
  Omit<WasmAbiExports, "ng_abi_version"> &
  Partial<Pick<WasmAbiExports, "ng_abi_version">> {
  return (
    isWasmMemoryView(exports.memory) &&
    typeof exports.ng_abi_alloc === "function" &&
    typeof exports.ng_abi_free === "function"
  );
}

function readWasmAbiVersion(
  exports: Partial<Pick<WasmAbiExports, "ng_abi_version">>,
): number {
  if (typeof exports.ng_abi_version !== "function") {
    return -1;
  }

  const version = exports.ng_abi_version();

  return Number.isSafeInteger(version) ? version : -1;
}

function assertWasmMemoryRange(
  memory: Pick<WebAssembly.Memory, "buffer">,
  ptr: number,
  len: number,
  maximum: number,
  label: string,
): void {
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

function isWasmMemoryView(
  value: unknown,
): value is Pick<WebAssembly.Memory, "buffer"> {
  try {
    const buffer = (value as { buffer?: unknown } | null)?.buffer;

    return (
      buffer instanceof ArrayBuffer ||
      (typeof SharedArrayBuffer === "function" &&
        buffer instanceof SharedArrayBuffer)
    );
  } catch {
    return false;
  }
}

class WasmAbiVersionError extends Error {
  constructor(version: number) {
    super(
      `Unsupported AngularTS Wasm ABI version ${String(version)}; expected ${String(WASM_ABI_VERSION)}`,
    );
    this.name = "WasmAbiVersionError";
  }
}

class WasmGuestCallError extends Error {
  readonly code: WasmAbiErrorCode;

  constructor(code: WasmAbiErrorCode, message: string) {
    super(message);
    this.name = "WasmGuestCallError";
    this.code = code;
  }
}

function createWasmGuestError(
  name: Exclude<keyof typeof WasmAbiError, "none">,
): WasmGuestCallError {
  return new WasmGuestCallError(
    WasmAbiError[name],
    `AngularTS Wasm ABI ${name.replace(/[A-Z]/g, (value) => `-${value.toLowerCase()}`)}`,
  );
}

function classifyWasmGuestError(error: unknown): WasmAbiErrorCode {
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

function normalizeWasmScopeWriteOptions(
  value: unknown,
  defaultEcho: boolean,
): WasmScopeWriteOptions {
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
  if (
    typeof origin === "string" &&
    textEncoder.encode(origin).byteLength > MAX_WASM_ABI_PATH_BYTES
  ) {
    throw createWasmGuestError("invalidLength");
  }

  return {
    origin: origin ?? WASM_SCOPE_DEFAULT_ORIGIN,
    echo: echo ?? defaultEcho,
  };
}

function normalizeWasmScopeTransaction(transaction: WasmScopeTransaction): {
  set: Record<string, unknown>;
  delete: string[];
} {
  if (!isPlainWasmRecord(transaction)) {
    throw createWasmGuestError("invalidTransaction");
  }

  const inputSet = transaction.set ?? {};
  const inputDelete = transaction.delete ?? [];

  if (!isPlainWasmRecord(inputSet) || !Array.isArray(inputDelete)) {
    throw createWasmGuestError("invalidTransaction");
  }

  const set = Object.create(null) as Record<string, unknown>;
  const deleted = new Set<string>();

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

function applyWasmScopeTransaction(
  target: Record<string, unknown>,
  transaction: { set: Record<string, unknown>; delete: string[] },
): void {
  for (const [path, value] of Object.entries(transaction.set)) {
    writeScopePath(target, path, value);
  }

  for (const path of transaction.delete) {
    deleteScopePath(target, path);
  }
}

function assertSafeWasmScopePath(path: string): void {
  const keys = scopePathKeys(path);

  if (keys.length === 0) {
    throw createWasmGuestError("invalidTransaction");
  }
  if (!isSafeScopePath(keys)) {
    throw createWasmGuestError("unsafePath");
  }
}

function isPlainWasmRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Reflect.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function copyWasmBinaryValue(value: unknown): Uint8Array | undefined {
  if (
    value instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer === "function" &&
      value instanceof SharedArrayBuffer)
  ) {
    return new Uint8Array(value).slice();
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    ).slice();
  }

  return undefined;
}

function rethrowWasmFault(error: unknown): never {
  throw error;
}

function getWasmScopeRetentionState(scope: ng.Scope): WasmScopeRetentionState {
  let state = wasmScopeRetentionStates.get(scope);

  if (state) return state;

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

function queueScopeAwareWasmCallback(
  scope: ng.Scope,
  state: WasmScopeRetentionState,
  key: string | undefined,
  callback: () => void,
): void {
  if (state._paused) {
    const pending: WasmScopeQueuedCallback = {
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

function flushWasmScopeQueue(state: WasmScopeRetentionState): void {
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

function readScopePath(scope: ng.Scope, path: string): unknown {
  if (!path) {
    return scope;
  }

  const keys = scopePathKeys(path);

  if (!isSafeScopePath(keys)) {
    return undefined;
  }

  let current: unknown = scope;

  for (let i = 0, l = keys.length; i < l; i++) {
    if (current === null || current === undefined) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[keys[i]];
  }

  return current;
}

function hasScopePath(scope: ng.Scope, path: string): boolean {
  if (!path) {
    return true;
  }

  const keys = scopePathKeys(path);

  if (!isSafeScopePath(keys)) {
    return false;
  }

  let current: unknown = scope;

  for (const key of keys) {
    if (
      (typeof current !== "object" || current === null) &&
      typeof current !== "function"
    ) {
      return false;
    }
    if (!(key in current)) {
      return false;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return true;
}

function writeScopePath(
  scope: Record<string, unknown>,
  path: string,
  value: unknown,
): boolean {
  const keys = scopePathKeys(path);

  if (keys.length === 0 || !isSafeScopePath(keys)) {
    return false;
  }

  let current = scope;

  for (let i = 0, l = keys.length - 1; i < l; i++) {
    const key = keys[i];
    const existing = current[key];

    if (existing && typeof existing === "object") {
      current = existing as Record<string, unknown>;
      continue;
    }

    const next = Object.create(null) as Record<string, unknown>;

    writeSafeScopeProperty(current, key, next);
    current = next;
  }

  writeSafeScopeProperty(current, keys[keys.length - 1], value);

  return true;
}

function deleteScopePath(
  scope: Record<string, unknown>,
  path: string,
): boolean {
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

    current = next as Record<string, unknown>;
  }

  return deleteProperty(current, keys[keys.length - 1]);
}

function scopePathKeys(path: string): string[] {
  return path.split(".").filter(Boolean);
}

function isSafeScopePath(keys: string[]): boolean {
  return keys.every((key) => !isUnsafeScopePathKey(key));
}

function isUnsafeScopePathKey(key: string): boolean {
  return UNSAFE_SCOPE_PATH_KEYS.has(key);
}

function writeSafeScopeProperty(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
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
