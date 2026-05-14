import { _parse } from '../../injection-tokens.js';
import { isString, stringify, deProxy, isDefined, isUndefined, isNull, isNullOrUndefined } from '../../shared/utils.js';

/** Binds the watched expression as plain text content. */
function ngBindDirective() {
    return {
        link(scope, element, attr) {
            if (!isString(attr.ngBind))
                return;
            scope.$watch(attr.ngBind, (value) => {
                const text = stringify(deProxy(value));
                element.textContent = isString(text) ? text : "";
            }, isDefined(attr.lazy));
        },
    };
}
/** Binds the interpolated template value as plain text content. */
function ngBindTemplateDirective() {
    return {
        link(_scope, element, attr) {
            attr.$observe("ngBindTemplate", (value) => {
                element.textContent = isNullOrUndefined(value) ? "" : value;
            });
        },
    };
}
ngBindHtmlDirective.$inject = [_parse];
/** Binds trusted HTML into the element while still validating the expression. */
function ngBindHtmlDirective($parse) {
    return {
        restrict: "A",
        compile(_tElement, tAttrs) {
            const expression = tAttrs.ngBindHtml;
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
