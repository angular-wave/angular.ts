import { $injectTokens } from "../../injection-tokens.js";
import { removeElement } from "../../shared/dom.js";
import { hasAnimate } from "../../shared/utils.js";

ngIfDirective.$inject = [$injectTokens._animate];
/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive}
 */
export function ngIfDirective($animate) {
  return {
    transclude: "element",
    priority: 600,
    terminal: true,
    restrict: "A",
    /**
     *
     * @param {ng.Scope} $scope
     * @param {Element} $element
     * @param {ng.Attributes} $attr
     * @param {*} _ctrl
     * @param {ng.TranscludeFn} $transclude
     */
    link($scope, $element, $attr, _ctrl, $transclude) {
      /** @type {Element | null | undefined} */
      let block;

      /** @type {ng.Scope | null} */
      let childScope;

      /** @type {Element | null | undefined} */
      let previousElements;

      $scope.$watch($attr.ngIf, (value) => {
        if (value) {
          if (!childScope) {
            $transclude(
              (
                /** @type {Element} */ clone,
                /** @type {ng.Scope} */ newScope,
              ) => {
                childScope = newScope;
                // Note: We only need the first/last node of the cloned nodes.
                // However, we need to keep the reference to the dom wrapper as it might be changed later
                // by a directive with templateUrl when its template arrives.
                block = clone;

                if (hasAnimate(/** @type {Node} */ (clone))) {
                  $animate.enter(
                    /** @type {Element} */ (clone),
                    /** @type {Element} */ ($element.parentElement),
                    $element,
                  );
                } else {
                  $element.after(/** @type {Node} */ (clone));
                }
              },
            );
          }
        } else {
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

            if (hasAnimate(previousElements)) {
              $animate.leave(previousElements).done((response) => {
                if (response !== false) previousElements = null;
              });
            } else {
              $element.nextElementSibling?.remove();
            }
            block = null;
          }
        }
      });
    },
  };
}
