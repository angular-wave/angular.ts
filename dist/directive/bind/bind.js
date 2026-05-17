import { _attributes, _parse } from '../../injection-tokens.js';
import { isString, stringify, deProxy, isUndefined, isNull, isNullOrUndefined } from '../../shared/utils.js';

ngBindDirective.$inject = [_attributes];
/** Binds the watched expression as plain text content. */
function ngBindDirective($attributes) {
    return {
        link(scope, element) {
            const expression = $attributes.read(element, "ngBind");
            if (!isString(expression))
                return;
            scope.$watch(expression, (value) => {
                const text = stringify(deProxy(value));
                element.textContent = isString(text) ? text : "";
            }, $attributes.has(element, "lazy"));
        },
    };
}
/** Binds the interpolated template value as plain text content. */
ngBindTemplateDirective.$inject = [_attributes];
function ngBindTemplateDirective($attributes) {
    return {
        link(scope, element) {
            $attributes.observe(scope, element, "ngBindTemplate", (value) => {
                element.textContent = isNullOrUndefined(value) ? "" : value;
            });
        },
    };
}
ngBindHtmlDirective.$inject = [_parse, _attributes];
/** Binds trusted HTML into the element while still validating the expression. */
function ngBindHtmlDirective($parse, $attributes) {
    return {
        restrict: "A",
        compile(tElement, tAttrs) {
            const expression = $attributes?.read(tElement, "ngBindHtml") ?? tAttrs.ngBindHtml;
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
