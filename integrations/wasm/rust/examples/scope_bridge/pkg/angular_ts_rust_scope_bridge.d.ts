/* tslint:disable */
/* eslint-disable */
export function __ng_manifest(): string;
export function __ng_component_ScopeProbe_fieldBridgeMetadata(): string;
export function __ng_component_ScopeProbe_bridgeMetadata(): string;
/**
 * Rust facade for a host-owned AngularTS `WasmScope` ABI handle.
 */
export class WasmScope {
  free(): void;
  /**
   * Creates a Rust wrapper for one host-owned AngularTS scope handle.
   */
  constructor(handle: number, prefix: string);
  /**
   * Creates a Rust wrapper for one stable AngularTS scope name.
   */
  static named(name: string, prefix: string): WasmScope;
}
export class __ng_component_ScopeProbe {
  free(): void;
  constructor(_scope: WasmScope);
  increment(): void;
  applyCountFromScope(value: any): void;
  count: number;
  seenCount: number;
  source: string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __ng_manifest: (a: number) => void;
  readonly __wbg___ng_component_scopeprobe_free: (a: number, b: number) => void;
  readonly __wbg_get___ng_component_scopeprobe_count: (a: number) => number;
  readonly __wbg_set___ng_component_scopeprobe_count: (a: number, b: number) => void;
  readonly __wbg_get___ng_component_scopeprobe_seenCount: (a: number) => number;
  readonly __wbg_set___ng_component_scopeprobe_seenCount: (a: number, b: number) => void;
  readonly __wbg_get___ng_component_scopeprobe_source: (a: number, b: number) => void;
  readonly __wbg_set___ng_component_scopeprobe_source: (a: number, b: number, c: number) => void;
  readonly __ng_component_ScopeProbe_fieldBridgeMetadata: (a: number) => void;
  readonly __ng_component_scopeprobe_new: (a: number) => number;
  readonly __ng_component_scopeprobe_increment: (a: number) => void;
  readonly __ng_component_scopeprobe_applyCountFromScope: (a: number, b: number) => void;
  readonly __ng_component_ScopeProbe_bridgeMetadata: (a: number) => void;
  readonly ng_abi_alloc: (a: number) => number;
  readonly ng_abi_free: (a: number, b: number) => void;
  readonly ng_scope_on_update: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly __wbg_wasmscope_free: (a: number, b: number) => void;
  readonly wasmscope_new: (a: number, b: number, c: number) => number;
  readonly wasmscope_named: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
