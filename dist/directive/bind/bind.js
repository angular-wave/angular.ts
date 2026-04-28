import { _parse } from '../../injection-tokens.js';
import { stringify, deProxy, isNullOrUndefined, isDefined, isUndefined, isNull } from '../../shared/utils.js';

/** Binds the watched expression as plain text content. */
function ngBindDirective() {
    return {
        link(scope, element, attr) {
            scope.$watch(attr.ngBind, (value) => {
                const text = stringify(deProxy(value));
                element.textContent = isNullOrUndefined(text) ? "" : String(text);
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
            $parse(tAttrs.ngBindHtml); // checks for interpolation errors
            return (
            /** Watches the expression and writes the resulting HTML into the element. */
            (scope, element) => {
                scope.$watch(tAttrs.ngBindHtml, (val) => {
                    if (isUndefined(val) || isNull(val)) {
                        val = "";
                    }
                    element.innerHTML = val;
                });
            });
        },
    };
}

export { ngBindDirective, ngBindHtmlDirective, ngBindTemplateDirective };
