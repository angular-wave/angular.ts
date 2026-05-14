import { kebabToCamel } from '../../shared/dom.js';

/**
 * Creates an attribute observer directive that mirrors attribute changes onto scope.
 *
 * @param source - The name of the attribute to be observed.
 */
function ngObserveDirective(source, prop) {
    return {
        restrict: "A",
        compile: () => (scope, element) => {
            if (prop === "") {
                prop = source;
            }
            const normalized = kebabToCamel(prop);
            scope[normalized] ?? (scope[normalized] = element.getAttribute(source));
            const observer = new MutationObserver((mutations) => {
                const mutation = mutations[0];
                const newValue = mutation.target.getAttribute(source);
                if (scope[normalized] !== newValue) {
                    scope[normalized] = newValue;
                }
            });
            observer.observe(element, {
                attributes: true,
                attributeFilter: [source],
            });
            scope.$on("$destroy", () => {
                observer.disconnect();
            });
        },
    };
}

export { ngObserveDirective };
