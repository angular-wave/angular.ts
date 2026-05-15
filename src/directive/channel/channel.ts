import { _eventBus } from "../../injection-tokens.ts";
import { getNormalizedAttr } from "../../shared/dom.ts";
import { isObject, isString } from "../../shared/utils.ts";

ngChannelDirective.$inject = [_eventBus];
/**
 * Subscribes an element to a pub/sub channel.
 *
 * If the element has inline template content, published object payloads are
 * merged into the current scope. Otherwise, string payloads replace the
 * element's HTML content directly.
 */
export function ngChannelDirective($eventBus: ng.PubSubService): ng.Directive {
  return {
    scope: false,
    link: (scope: ng.Scope, element: HTMLElement): void => {
      const channel = getNormalizedAttr(element, "ngChannel");

      if (!channel) {
        return;
      }

      const hasTemplateContent = element.childNodes.length > 0;

      const unsubscribe = $eventBus.subscribe(channel, (value: unknown) => {
        if (hasTemplateContent) {
          if (isObject(value)) {
            scope.$merge(value);
          }
        } else {
          element.innerHTML = isString(value) ? value : JSON.stringify(value);
        }
      });

      scope.$on("$destroy", () => unsubscribe());
    },
  };
}
