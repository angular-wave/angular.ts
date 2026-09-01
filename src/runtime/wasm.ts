import type { RuntimeModule } from "../angular-runtime.ts";
import { _wasm } from "../injection-tokens.ts";
import { ngWasmDirective } from "../directive/wasm/wasm.ts";
import {
  createWasmRuntimeState,
  createWasmService,
  destroyWasmRuntimeState,
} from "../services/wasm/wasm.ts";
import { getRuntimeComposition } from "./custom-ng.ts";

/**
 * Registers the `$wasm` service, `ng-wasm` directive, and runtime-owned scope
 * ABI state.
 *
 * Pass this registrar through `createAngular({ modules: [...] })` when a
 * custom runtime needs WebAssembly loading or AngularTS scope bridging.
 */
export const wasmModule: RuntimeModule = (angular) => {
  const composition = getRuntimeComposition(angular);
  const state = createWasmRuntimeState(composition.appContext);

  composition.platform.addDisposer(() => {
    destroyWasmRuntimeState(state);
  });

  return angular
    .createModule("ng.wasm", [])
    .directive("ngWasm", ngWasmDirective)
    .factory(_wasm, () => createWasmService(state));
};
