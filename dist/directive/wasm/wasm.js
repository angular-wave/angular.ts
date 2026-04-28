import { instantiateWasm } from '../../shared/utils.js';

/**
 * Loads a WebAssembly module and exposes its exports on `scope.$target`.
 */
function ngWasmDirective() {
    return {
        async link($scope, _, $attrs) {
            $scope.$target[$attrs.as || "wasm"] = (await instantiateWasm($attrs.src)).exports;
        },
    };
}

export { ngWasmDirective };
