import { isObject, isString } from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.js";

ngListenerDirective.$inject = [$injectTokens._angular];
/**
 * @param {ng.AngularService} $angular
 * @returns {ng.Directive}
 */
export function ngListenerDirective($angular) {
  return {
    scope: false,
    link: (scope, element, attrs) => {
      const channel = attrs.ngListener;

      const hasTemplateContent = element.childNodes.length > 0;

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

      $angular.addEventListener(channel, fn);

      scope.$on("$destroy", () => $angular.removeEventListener(channel, fn));
    },
  };
}
