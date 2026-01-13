import { $injectTokens } from "../injection-tokens.js";
ngAnimateSwapDirective.$inject = [$injectTokens._animate];
/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive}
 */
export function ngAnimateSwapDirective($animate) {
  return {
    restrict: "A",
    transclude: "element",
    terminal: true,
    priority: 550, // We use 550 here to ensure that the directive is caught before others,
    // but after `ngIf` (at priority 600).
    link(scope, $element, attrs, _ctrl, $transclude) {
      /**
       * @type {HTMLElement | undefined}
       */
      let previousElement;

      /**
       * @type {ng.Scope | undefined | null}
       */
      let previousScope;

      scope.$watch(attrs.ngAnimateSwap || attrs.for, (value) => {
        if (previousElement) {
          $animate.leave(previousElement);
        }

        if (previousScope) {
          previousScope.$destroy();
          previousScope = null;
        }

        if (value) {
          /** @type {ng.TranscludeFn} */ ($transclude)((clone, childScope) => {
            previousElement = /** @type {HTMLElement} */ (clone);
            previousScope = childScope;
            $animate.enter(/** @type {HTMLElement} */ (clone), null, $element);
          });
        }
      });
    },
  };
}
