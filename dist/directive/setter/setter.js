import { _parse, _log } from '../../injection-tokens.js';

ngSetterDirective.$inject = [_parse, _log];
/**
 * Mirrors an element's HTML content into an assignable scope expression.
 */
function ngSetterDirective($parse, $log) {
    return {
        restrict: "A",
        link(scope, element, attrs) {
            const modelExpression = attrs.ngSetter;
            if (typeof modelExpression !== "string" || modelExpression === "") {
                $log.warn("ng-setter: expression null");
                return;
            }
            const assignModel = $parse(modelExpression)._assign;
            if (!assignModel) {
                $log.warn("ng-setter: expression invalid");
                return;
            }
            const updateModel = (value) => {
                assignModel(scope, value.trim());
            };
            const observer = new MutationObserver((mutationsList) => {
                let contentChanged = false;
                for (const mutation of mutationsList) {
                    if (mutation.type === "childList" ||
                        mutation.type === "characterData") {
                        contentChanged = true;
                        break;
                    }
                }
                if (contentChanged) {
                    updateModel(element.innerHTML);
                }
            });
            observer.observe(element, {
                childList: true,
                subtree: true,
                characterData: true,
            });
            scope.$on("$destroy", () => {
                observer.disconnect();
            });
            updateModel(element.innerHTML);
        },
    };
}

export { ngSetterDirective };
