import { _attributes } from '../../injection-tokens.js';
import { isString, arrayFrom, deleteProperty } from '../../shared/utils.js';

ngElDirective.$inject = [_attributes];
/**
 * Exposes the current element on `scope.$target` under the provided key.
 */
function ngElDirective($attributes) {
    return {
        restrict: "A",
        link(scope, element) {
            const target = scope.$target;
            const expr = $attributes.read(element, "ngEl");
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
