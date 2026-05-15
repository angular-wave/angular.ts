import { _eventBus } from '../../injection-tokens.js';
import { getNormalizedAttr } from '../../shared/dom.js';
import { isObject, isString } from '../../shared/utils.js';

ngChannelDirective.$inject = [_eventBus];
/**
 * Subscribes an element to a pub/sub channel.
 *
 * If the element has inline template content, published object payloads are
 * merged into the current scope. Otherwise, string payloads replace the
 * element's HTML content directly.
 */
function ngChannelDirective($eventBus) {
    return {
        scope: false,
        link: (scope, element) => {
            const channel = getNormalizedAttr(element, "ngChannel");
            if (!channel) {
                return;
            }
            const hasTemplateContent = element.childNodes.length > 0;
            const unsubscribe = $eventBus.subscribe(channel, (value) => {
                if (hasTemplateContent) {
                    if (isObject(value)) {
                        scope.$merge(value);
                    }
                }
                else {
                    element.innerHTML = isString(value) ? value : JSON.stringify(value);
                }
            });
            scope.$on("$destroy", () => unsubscribe());
        },
    };
}

export { ngChannelDirective };
