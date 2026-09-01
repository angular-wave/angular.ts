import { _wasm } from '../injection-tokens.js';
import { ngWasmDirective } from '../directive/wasm/wasm.js';
import { createWasmRuntimeState, destroyWasmRuntimeState, createWasmService } from '../services/wasm/wasm.js';
import { getRuntimeComposition } from './custom-ng.js';

/**
 * Registers the `$wasm` service, `ng-wasm` directive, and runtime-owned scope
 * ABI state.
 *
 * Pass this registrar through `createAngular({ modules: [...] })` when a
 * custom runtime needs WebAssembly loading or AngularTS scope bridging.
 */
const wasmModule = (angular) => {
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

export { wasmModule };
