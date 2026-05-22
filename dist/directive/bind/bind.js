import { _parse } from '../../injection-tokens.js';
import { isString, stringify, deProxy, isUndefined, isNull, directiveNormalize, isNullOrUndefined } from '../../shared/utils.js';
import { getNormalizedAttr, hasNormalizedAttr } from '../../shared/dom.js';

/** Binds the watched expression as plain text content. */
function ngBindDirective() {
    return {
        link(scope, element) {
            const expression = getNormalizedAttr(element, "ngBind");
            if (!isString(expression))
                return;
            scope.$watch(expression, (value) => {
                const text = stringify(deProxy(value));
                element.textContent = isString(text) ? text : "";
            }, hasNormalizedAttr(element, "lazy"));
        },
    };
}
/** Binds the interpolated template value as plain text content. */
function ngBindTemplateDirective() {
    return {
        link(scope, element) {
            const syncTemplate = () => {
                const value = getNormalizedAttr(element, "ngBindTemplate");
                element.textContent = isNullOrUndefined(value) ? "" : value;
            };
            syncTemplate();
            const observerName = directiveNormalize("ngBindTemplate");
            const observer = new MutationObserver((mutations) => {
                for (let i = 0; i < mutations.length; i++) {
                    const attributeName = mutations[i].attributeName;
                    if (attributeName &&
                        directiveNormalize(attributeName) === observerName) {
                        syncTemplate();
                    }
                }
            });
            observer.observe(element, { attributes: true });
            let deregisterDestroy = scope.$on("$destroy", deregister);
            function deregister() {
                observer.disconnect();
                deregisterDestroy?.();
                deregisterDestroy = undefined;
            }
        },
    };
}
ngBindHtmlDirective.$inject = [_parse];
/** Binds trusted HTML into the element while still validating the expression. */
function ngBindHtmlDirective($parse) {
    return {
        restrict: "A",
        compile(tElement) {
            const expression = getNormalizedAttr(tElement, "ngBindHtml");
            if (!isString(expression))
                return () => undefined;
            $parse(expression); // checks for interpolation errors
            return (
            /** Watches the expression and writes the resulting HTML into the element. */
            (scope, element) => {
                scope.$watch(expression, (val) => {
                    const html = isUndefined(val) || isNull(val) ? "" : stringify(deProxy(val));
                    element.innerHTML = isString(html) ? html : "";
                });
            });
        },
    };
}

export { ngBindDirective, ngBindHtmlDirective, ngBindTemplateDirective };
