import { _animate } from '../injection-tokens.js';
import { isInstanceOf } from '../shared/utils.js';

ngAnimateSwapDirective.$inject = [_animate];
/** Swaps a transcluded block with enter/leave animations as the watched value changes. */
function ngAnimateSwapDirective($animate) {
    return {
        restrict: "A",
        transclude: "element",
        terminal: true,
        priority: 550, // We use 550 here to ensure that the directive is caught before others,
        // but after `ngIf` (at priority 600).
        link(scope, $element, attrs, _ctrl, $transclude) {
            let previousElement;
            let previousScope;
            scope.$watch(attrs.ngAnimateSwap || attrs.for, (value) => {
                if (previousElement) {
                    $animate.leave(previousElement);
                }
                if (previousScope) {
                    previousScope.$destroy();
                    previousScope = null;
                }
                if (value && $transclude) {
                    $transclude((clone, childScope) => {
                        if (isInstanceOf(clone, Element)) {
                            previousElement = clone;
                            previousScope = childScope;
                            $animate.enter(clone, null, $element);
                        }
                    });
                }
            });
        },
    };
}

export { ngAnimateSwapDirective };
