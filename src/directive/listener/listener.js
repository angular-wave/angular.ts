import { isObject, isString } from "../../shared/utils.js";

/**
 * @returns {ng.Directive}
 */
export function ngListenerDirective() {
  return {
    scope: false,
    link: (scope, element, attrs) => {
      const channel = attrs.ngListener || element.id;

      const hasTemplateContent = element.childNodes.length;

      /** @type {EventListener} */
      const fn = (event) => {
        const value = /** @type {CustomEvent} */ (event).detail;

        if (hasTemplateContent) {
          if (isObject(value)) {
            scope.$merge(value);
          }
        } else if (isString(value)) {
          element.innerHTML = value;
        }
      };

      element.addEventListener(channel, fn);

      scope.$on("$destroy", () => element.removeEventListener(channel, fn));
    },
  };
}
