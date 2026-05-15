import { getNormalizedAttr } from '../../shared/dom.js';
import { isString, arrayFrom, deleteProperty } from '../../shared/utils.js';

/**
 * Exposes the current element on `scope.$target` under the provided key.
 */
function ngElDirective() {
    return {
        restrict: "A",
        link(scope, element) {
            const target = scope.$target;
            const expr = getNormalizedAttr(element, "ngEl");
            const key = isString(expr) && expr ? expr : element.id;
            target[key] = element;
            const parent = element.parentNode;
            if (!parent)
                return;
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    arrayFrom(mutation.removedNodes).forEach((removedNode) => {
                        if (removedNode === element) {
                            deleteProperty(target, key);
                            observer.disconnect();
                        }
                    });
                }
            });
            observer.observe(parent, { childList: true });
        },
    };
}

export { ngElDirective };
