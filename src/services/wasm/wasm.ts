import { instantiateWasm } from "../../shared/utils.ts";

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

export interface WasmInstantiationResult {
  instance: WebAssembly.Instance;
  exports: WebAssembly.Exports;
  module: WebAssembly.Module;
}

export type WasmService = (
  src: string,
  imports?: WebAssembly.Imports,
  opts?: WasmOptions,
) => Promise<WebAssembly.Exports | WasmInstantiationResult>;

export class WasmProvider {
  $get = (): WasmService => {
    return async (
      src: string,
      imports: WebAssembly.Imports = {},
      opts: WasmOptions = {},
    ) => {
      const result = await instantiateWasm(src, imports);

      return opts.raw ? result : result.exports;
    };
  };
}
