import { _wasm } from '../injection-tokens.js';
import { ngWasmDirective } from '../directive/wasm/wasm.js';
import { createWasmRuntimeState, destroyWasmRuntimeState, createWasmService } from '../services/wasm/wasm.js';

/**
 * Registers the `$wasm` service, `ng-wasm` directive, and runtime-owned scope
 * ABI state.
 *
 * Pass this registrar through `createAngular({ modules: [...] })` when a
 * custom runtime needs WebAssembly loading or AngularTS scope bridging.
 */
const wasmModule = (angular) => {
    const runtime = angular;
    const state = createWasmRuntimeState(runtime._composition.appContext);
    runtime._composition.platform.addDisposer(() => {
        destroyWasmRuntimeState(state);
    });
    return angular
        .module("ng.wasm", [])
        .directive("ngWasm", ngWasmDirective)
        .factory(_wasm, () => createWasmService(state));
};

export { wasmModule };
