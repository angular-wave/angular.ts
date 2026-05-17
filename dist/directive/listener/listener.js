import { _attributes } from '../../injection-tokens.js';
import { isObject, isString } from '../../shared/utils.js';

ngListenerDirective.$inject = [_attributes];
function fallbackWhenEmpty(value, fallback) {
    if (value)
        return value;
    return fallback;
}
/** Listens for DOM custom events and projects their payload into the element or scope. */
function ngListenerDirective($attributes) {
    return {
        scope: false,
        link: (scope, element) => {
            const configuredChannel = $attributes.read(element, "ngListener");
            const channel = fallbackWhenEmpty(configuredChannel, element.id);
            const hasTemplateContent = element.childNodes.length > 0;
            const fn = (event) => {
                const value = event.detail;
                if (hasTemplateContent) {
                    if (isObject(value)) {
                        scope.$merge(value);
                    }
                }
                else if (isString(value)) {
                    element.innerHTML = value;
                }
            };
            element.addEventListener(channel, fn);
            scope.$on("$destroy", () => {
                element.removeEventListener(channel, fn);
            });
        },
    };
}

export { ngListenerDirective };
