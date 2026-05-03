import { _parse } from '../../injection-tokens.js';
import { arrayFrom } from '../../shared/utils.js';

ngViewportDirective.$inject = [_parse];
/** Evaluates expressions when an element enters or leaves the viewport. */
function ngViewportDirective($parse) {
    return {
        restrict: "A",
        link(scope, element, attrs) {
            const attrMap = attrs;
            const enterExpr = attrMap.onEnter;
            const leaveExpr = attrMap.onLeave;
            const enterFn = enterExpr ? $parse(enterExpr) : undefined;
            const leaveFn = leaveExpr ? $parse(leaveExpr) : undefined;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        enterFn?.(scope);
                    }
                    else {
                        leaveFn?.(scope);
                    }
                });
            }, {
                root: null, // viewport
                threshold: 0.1, // consider "in view" if 10% visible
            });
            observer.observe(element);
            // Clean up when the element is removed from DOM
            const parent = element.parentNode;
            let mutationObserver;
            if (parent) {
                mutationObserver = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        arrayFrom(mutation.removedNodes).forEach((removedNode) => {
                            if (removedNode === element) {
                                observer.disconnect();
                                if (mutationObserver) {
                                    mutationObserver.disconnect();
                                }
                            }
                        });
                    }
                });
                mutationObserver.observe(parent, { childList: true });
            }
            scope.$on("$destroy", () => {
                observer.disconnect();
                if (mutationObserver)
                    mutationObserver.disconnect();
            });
        },
    };
}

export { ngViewportDirective };
