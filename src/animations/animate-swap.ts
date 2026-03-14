import { $injectTokens } from "../injection-tokens.js";
ngAnimateSwapDirective.$inject = [$injectTokens._animate];
/** Swaps a transcluded block with enter/leave animations as the watched value changes. */
export function ngAnimateSwapDirective(
  $animate: ng.AnimateService,
): ng.Directive<any> {
  return {
    restrict: "A",
    transclude: "element",
    terminal: true,
    priority: 550, // We use 550 here to ensure that the directive is caught before others,
    // but after `ngIf` (at priority 600).
    link(
      scope: ng.Scope,
      $element: Element,
      attrs: ng.Attributes & Record<string, string>,
      _ctrl: unknown,
      $transclude?: ng.TranscludeFn,
    ) {
      let previousElement: HTMLElement | undefined;

      let previousScope: ng.Scope | undefined | null;

      scope.$watch(attrs.ngAnimateSwap || attrs.for, (value: any) => {
        if (previousElement) {
          $animate.leave(previousElement);
        }

        if (previousScope) {
          previousScope.$destroy();
          previousScope = null;
        }

        if (value && $transclude) {
          $transclude(
            (
              clone?: Node | Element | Node[] | NodeList | null,
              childScope?: ng.Scope | null,
            ) => {
              if (clone instanceof Element) {
                previousElement = clone as HTMLElement;
                previousScope = childScope;
                $animate.enter(clone as HTMLElement, null, $element);
              }
            },
          );
        }
      });
    },
  };
}
