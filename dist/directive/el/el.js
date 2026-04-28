import { arrayFrom } from '../../shared/utils.js';

/**
 * Exposes the current element on `scope.$target` under the provided key.
 */
function ngElDirective() {
    return {
        restrict: "A",
        link(scope, element, attrs) {
            const attrMap = attrs;
            const expr = attrMap.ngEl;
            const key = !expr ? element.id : expr;
            scope.$target[key] = element;
            const parent = element.parentNode;
            if (!parent)
                return;
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    arrayFrom(mutation.removedNodes).forEach((removedNode) => {
                        if (removedNode === element) {
                            delete scope.$target[key];
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
