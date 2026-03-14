import { isObject, isString } from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.js";

ngChannelDirective.$inject = [$injectTokens._eventBus];
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
    link: (
      scope: ng.Scope,
      element: HTMLElement,
      attrs: import("../../core/compile/attributes.ts").Attributes &
        Record<string, string>,
    ): void => {
      const channel = attrs.ngChannel;

      const hasTemplateContent = element.childNodes.length > 0;

      const unsubscribe = $eventBus.subscribe(
        channel,
        (value: string | Record<string, any>) => {
          if (hasTemplateContent) {
            if (isObject(value)) {
              scope.$merge(value);
            }
          } else {
            element.innerHTML = isString(value) ? value : String(value);
          }
        },
      );

      scope.$on("$destroy", () => unsubscribe());
    },
  };
}
