import { kebabToCamel } from "../../shared/dom.js";

/**
 * @param {string} source - the name of the attribute to be observed
 * @param {string} prop - the scope property to be updated with attribute value
 * @returns {ng.Directive}
 */
export function ngObserveDirective(source, prop) {
  return {
    restrict: "A",
    compile: () => (scope, element) => {
      if (prop === "") {
        prop = source;
      }
      const normalized = kebabToCamel(prop);
      if (!scope[normalized]) {
        scope[normalized] = element.getAttribute(source);
      }

      const observer = new MutationObserver((mutations) => {
        const mutation = mutations[0];
        const newValue = /** @type {HTMLElement} */ (
          mutation.target
        ).getAttribute(source);
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
