import type { RuntimeModule } from "../angular-runtime.ts";
import type { RuntimeComposition } from "../core/composition/runtime-composition.ts";
import { _wasm } from "../injection-tokens.ts";
import { ngWasmDirective } from "../directive/wasm/wasm.ts";
import {
  createWasmRuntimeState,
  createWasmService,
  destroyWasmRuntimeState,
} from "../services/wasm/wasm.ts";

/**
 * Registers the `$wasm` service, `ng-wasm` directive, and runtime-owned scope
 * ABI state.
 *
 * Pass this registrar through `createAngular({ modules: [...] })` when a
 * custom runtime needs WebAssembly loading or AngularTS scope bridging.
 */
export const wasmModule: RuntimeModule = (angular) => {
  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
  const state = createWasmRuntimeState(runtime._composition.appContext);

  runtime._composition.platform.addDisposer(() => {
    destroyWasmRuntimeState(state);
  });

  return angular
    .module("ng.wasm", [])
    .directive("ngWasm", ngWasmDirective)
    .factory(_wasm, () => createWasmService(state));
};
