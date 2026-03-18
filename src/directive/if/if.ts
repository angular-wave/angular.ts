import { $injectTokens } from "../../injection-tokens.ts";
import { removeElement } from "../../shared/dom.ts";
import { hasAnimate } from "../../shared/utils.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

ngIfDirective.$inject = [$injectTokens._animate];
/** Conditionally includes or removes a transcluded block based on the watched expression. */
export function ngIfDirective($animate: ng.AnimateService): ng.Directive {
  return {
    transclude: "element",
    priority: 600,
    terminal: true,
    restrict: "A",
    link(
      $scope: ng.Scope,
      $element: Element,
      $attr: Attributes & Record<string, string>,
      _ctrl: unknown,
      $transclude?: ng.TranscludeFn,
    ): void {
      if (!$transclude) {
        return;
      }

      let block: Element | null | undefined;

      let childScope: ng.Scope | null | undefined;

      let previousElements: Element | null | undefined;

      $scope.$watch($attr.ngIf, (value: any) => {
        if (value) {
          if (!childScope) {
            $transclude((clone, newScope) => {
              childScope = newScope;
              // Note: We only need the first/last node of the cloned nodes.
              // However, we need to keep the reference to the dom wrapper as it might be changed later
              // by a directive with templateUrl when its template arrives.
              block = clone as Element;

              if (hasAnimate(clone as Node)) {
                $animate.enter(
                  clone as Element,
                  $element.parentElement as Element,
                  $element,
                );
              } else {
                $element.after(clone as Node);
              }
            });
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
              $animate.leave(previousElements).done((response: boolean) => {
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
