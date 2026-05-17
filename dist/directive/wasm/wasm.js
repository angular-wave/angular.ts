import { _attributes } from '../../injection-tokens.js';
import { instantiateWasm } from '../../shared/utils.js';

ngWasmDirective.$inject = [_attributes];
/**
 * Loads a WebAssembly module and exposes its exports on `scope.$target`.
 */
function ngWasmDirective($attributes) {
    return {
        link($scope, element) {
            const src = $attributes.read(element, "src");
            const exportName = $attributes.read(element, "as");
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
