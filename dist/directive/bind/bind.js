import { _parse, _compile } from '../../injection-tokens.js';
import { getNodeName, isString, stringify, deProxy, directiveNormalize, isNullOrUndefined } from '../../shared/utils.js';
import { getNormalizedAttr, hasNormalizedAttr } from '../../shared/dom.js';

/** Binds the watched expression as plain text content. */
function ngBindDirective() {
    return {
        link(scope, element) {
            if (getNodeName(element) === "script")
                throw new TypeError("Use ng-prop-text with a scriptPolicy for script source.");
            const expression = getNormalizedAttr(element, "ngBind");
            if (!isString(expression))
                return;
            scope.watch(expression, (value) => {
                const text = stringify(deProxy(value));
                element.textContent = isString(text) ? text : "";
            }, hasNormalizedAttr(element, "lazy"), true);
        },
    };
}
/** Binds the interpolated template value as plain text content. */
function ngBindTemplateDirective() {
    return {
        link(scope, element) {
            if (getNodeName(element) === "script")
                throw new TypeError("Use ng-prop-text with a scriptPolicy for script source.");
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
            let deregisterDestroy = scope.on("$destroy", deregister);
            function deregister() {
                observer.disconnect();
                deregisterDestroy?.();
                deregisterDestroy = undefined;
            }
        },
    };
}
ngBindHtmlDirective.$inject = [_parse, _compile];
/** Binds trusted HTML into the element while still validating the expression. */
function ngBindHtmlDirective($parse, $compile) {
    return {
        restrict: "A",
        compile(tElement) {
            if (getNodeName(tElement) === "script")
                throw new TypeError("Use ng-prop-text with a scriptPolicy for script source.");
            const expression = getNormalizedAttr(tElement, "ngBindHtml");
            if (!isString(expression))
                return () => undefined;
            $parse(expression); // checks for interpolation errors
            return (
            /** Watches the expression and writes the resulting HTML into the element. */
            (scope, element) => {
                scope.watch(expression, (val) => {
                    const html = $compile._prepareHtml(val, element.ownerDocument.defaultView ?? window);
                    // TypeScript's DOM declarations do not include TrustedHTML yet.
                    element.innerHTML = html;
                }, false, true);
            });
        },
    };
}

export { ngBindDirective, ngBindHtmlDirective, ngBindTemplateDirective };
