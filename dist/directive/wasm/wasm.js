import { instantiateWasm } from '../../shared/utils.js';

/**
 * Loads a WebAssembly module and exposes its exports on `scope.$target`.
 */
function ngWasmDirective() {
    return {
        link($scope, _, $attrs) {
            const attrValues = $attrs;
            const { src } = attrValues;
            const exportName = attrValues.as;
            if (typeof src !== "string") {
                return;
            }
            void (async () => {
                const target = $scope.$target;
                target[typeof exportName === "string" ? exportName : "wasm"] = (await instantiateWasm(src)).exports;
            })();
        },
    };
}

export { ngWasmDirective };
