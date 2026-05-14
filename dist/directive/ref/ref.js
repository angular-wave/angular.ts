import { _parse } from '../../injection-tokens.js';
import { directiveNormalize, getNodeName, isString, hasOwn, deProxy, createErrorFactory } from '../../shared/utils.js';
import { getCacheData } from '../../shared/dom.js';

const ngRefError = createErrorFactory("ngRef");
ngRefDirective.$inject = [_parse];
function ngRefDirective($parse) {
    return {
        priority: -1,
        restrict: "A",
        compile(tElement, tAttrs) {
            const controllerName = directiveNormalize(getNodeName(tElement));
            const expression = tAttrs.ngRef;
            if (!isString(expression))
                return () => undefined;
            const getter = $parse(expression);
            const setter = getter._assign ??
                function () {
                    throw ngRefError("nonassign", 'Expression in ngRef="{0}" is non-assignable!', expression);
                };
            return (scope, element, attrs) => {
                let refValue;
                if (hasOwn(attrs, "ngRefRead")) {
                    const readTarget = attrs.ngRefRead;
                    if (readTarget === "$element") {
                        refValue = element;
                    }
                    else if (isString(readTarget)) {
                        refValue = getCacheData(element, `$${readTarget}Controller`);
                    }
                }
                else {
                    refValue =
                        getCacheData(element, `$${controllerName}Controller`) ?? element;
                }
                refValue = deProxy(refValue);
                if (refValue && typeof refValue === "object") {
                    try {
                        Object.defineProperty(refValue, "$nonscope", {
                            configurable: true,
                            value: true,
                        });
                    }
                    catch {
                        // Non-extensible refs can still be assigned; they may be proxied on read.
                    }
                }
                const targetScope = deProxy(scope);
                setter(targetScope, refValue);
                scope.$on("$destroy", () => {
                    setter(targetScope, null);
                });
            };
        },
    };
}

export { ngRefDirective };
