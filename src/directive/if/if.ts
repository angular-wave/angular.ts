import { _attributes, _injector } from "../../injection-tokens.ts";
import {
  createLazyAnimate,
  getAnimateForNode,
} from "../../animations/lazy-animate.ts";
import { removeElement } from "../../shared/dom.ts";

ngIfDirective.$inject = [_injector, _attributes];
/** Conditionally includes or removes a transcluded block based on the watched expression. */
export function ngIfDirective(
  $injector: ng.InjectorService,
  $attributes: ng.AttributesService,
): ng.Directive {
  const getAnimate = createLazyAnimate($injector);

  return {
    transclude: "element",
    priority: 600,
    terminal: true,
    restrict: "A",
    link(
      $scope: ng.Scope,
      $element: Element,
      _attr: ng.Attributes,
      _ctrl: unknown,
      $transclude?: ng.TranscludeFn,
    ): void {
      if (!$transclude) {
        return;
      }

      let block: Element | null | undefined;

      let childScope: ng.Scope | null | undefined;

      let previousElements: Element | null | undefined;

      const expression = $attributes.read($element, "ngIf");

      if (typeof expression !== "string") {
        return;
      }

      $scope.$watch(expression, (value: unknown) => {
        if (value) {
          if (!childScope) {
            $transclude((clone, newScope) => {
              childScope = newScope;
              // Note: We only need the first/last node of the cloned nodes.
              // However, we need to keep the reference to the dom wrapper as it might be changed later
              // by a directive with templateUrl when its template arrives.
              block = clone as Element;

              const animate = getAnimateForNode(getAnimate, clone as Node);

              if (animate) {
                animate.enter(
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

            const animate = getAnimateForNode(getAnimate, previousElements);

            if (animate) {
              animate.leave(previousElements).done((response: boolean) => {
                if (response) previousElements = null;
              });
            } else {
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
