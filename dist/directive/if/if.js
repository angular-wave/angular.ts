import { _injector } from '../../injection-tokens.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';
import { removeElement } from '../../shared/dom.js';

ngIfDirective.$inject = [_injector];
/** Conditionally includes or removes a transcluded block based on the watched expression. */
function ngIfDirective($injector) {
    const getAnimate = createLazyAnimate($injector);
    return {
        transclude: "element",
        priority: 600,
        terminal: true,
        restrict: "A",
        link($scope, $element, $attr, _ctrl, $transclude) {
            if (!$transclude) {
                return;
            }
            let block;
            let childScope;
            let previousElements;
            const expression = $attr.ngIf;
            if (typeof expression !== "string") {
                return;
            }
            $scope.$watch(expression, (value) => {
                if (value) {
                    if (!childScope) {
                        $transclude((clone, newScope) => {
                            childScope = newScope;
                            // Note: We only need the first/last node of the cloned nodes.
                            // However, we need to keep the reference to the dom wrapper as it might be changed later
                            // by a directive with templateUrl when its template arrives.
                            block = clone;
                            const animate = getAnimateForNode(getAnimate, clone);
                            if (animate) {
                                animate.enter(clone, $element.parentElement, $element);
                            }
                            else {
                                $element.after(clone);
                            }
                        });
                    }
                }
                else {
                    if (previousElements) {
                        removeElement(previousElements);
                        previousElements = null;
                    }
                    if (childScope) {
                        childScope.$destroy();
                        childScope = null;
                    }
                    if (block) {
                        previousElements = block;
                        const animate = getAnimateForNode(getAnimate, previousElements);
                        if (animate) {
                            animate.leave(previousElements).done((response) => {
                                if (response)
                                    previousElements = null;
                            });
                        }
                        else {
                            const currentElement = $element.nextElementSibling;
                            if (currentElement) {
                                removeElement(currentElement);
                            }
                        }
                        block = null;
                    }
                }
            });
        },
    };
}

export { ngIfDirective };
