import { _wasm } from '../../injection-tokens.js';
import { getNormalizedAttr } from '../../shared/dom.js';

ngWasmDirective.$inject = [_wasm];
const unsafeWasmAliases = new Set(["__proto__", "constructor", "prototype"]);
/**
 * Loads a WebAssembly resource and exposes it on the reactive scope.
 */
function ngWasmDirective($wasm) {
    return {
        link($scope, element) {
            const src = getNormalizedAttr(element, "src");
            const exportName = getNormalizedAttr(element, "as");
            if (typeof src !== "string") {
                return;
            }
            const alias = typeof exportName === "string" ? exportName : "wasm";
            if (unsafeWasmAliases.has(alias)) {
                throw new Error(`ng-wasm cannot publish the reserved alias '${alias}'.`);
            }
            const loaded = $wasm.load({ source: src });
            $scope.$on("$destroy", () => {
                loaded.dispose();
            });
            $scope[alias] = loaded;
            void loaded.ready.catch(() => undefined);
        },
    };
}

export { ngWasmDirective };
