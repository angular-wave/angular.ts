import { isObject, isString } from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.js";

ngChannelDirective.$inject = [$injectTokens._eventBus];
/**
 * @param {ng.PubSubService} $eventBus
 * @returns {ng.Directive}
 */
export function ngChannelDirective($eventBus) {
  return {
    scope: false,
    link: (scope, element, attrs) => {
      const channel = attrs.ngChannel;

      const hasTemplateContent = element.childNodes.length > 0;

      const unsubscribe = $eventBus.subscribe(
        channel,
        (/** @type {string | Object} */ value) => {
          if (hasTemplateContent) {
            if (isObject(value)) {
              scope.$merge(value);
            }
          } else if (isString(value)) {
            element.innerHTML = value;
          } else {
            element.innerHTML = value.toString();
          }
        },
      );

      scope.$on("$destroy", () => unsubscribe());
    },
  };
}
