import { instantiateWasm } from '../../shared/utils.js';
import { getNormalizedAttr } from '../../shared/dom.js';

/**
 * Loads a WebAssembly module and exposes its exports on `scope.$target`.
 */
function ngWasmDirective() {
    return {
        link($scope, element) {
            const src = getNormalizedAttr(element, "src");
            const exportName = getNormalizedAttr(element, "as");
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
