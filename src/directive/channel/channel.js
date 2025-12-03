import { isObject } from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.js";

ngChannelDirective.$inject = [$injectTokens.$eventBus];
/**
 * @param {ng.PubSubService} $eventBus
 * @returns {ng.Directive}
 */
export function ngChannelDirective($eventBus) {
  return {
    link: (scope, element, attrs) => {
      const channel = attrs.ngChannel;

      const hasTemplateContent = element.childNodes.length > 0;

      const key = $eventBus.subscribe(channel, (value) => {
        if (hasTemplateContent) {
          if (isObject(value)) {
            scope.$merge(value);
          }
        } else {
          element.innerHTML = value;
        }
      });

      scope.$on("$destroy", () => {
        $eventBus.unsubscribeByKey(key);
      });
    },
  };
}
