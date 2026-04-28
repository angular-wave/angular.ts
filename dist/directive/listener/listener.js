import { isObject, isString } from '../../shared/utils.js';

/** Listens for DOM custom events and projects their payload into the element or scope. */
function ngListenerDirective() {
    return {
        scope: false,
        link: (scope, element, attrs) => {
            const attrMap = attrs;
            const channel = attrMap.ngListener || element.id;
            const hasTemplateContent = element.childNodes.length;
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
            scope.$on("$destroy", () => element.removeEventListener(channel, fn));
        },
    };
}

export { ngListenerDirective };
