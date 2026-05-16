import { _attributes, _parse } from "../../injection-tokens.ts";
import { arrayFrom } from "../../shared/utils.ts";

ngViewportDirective.$inject = [_parse, _attributes];

/** Evaluates expressions when an element enters or leaves the viewport. */
export function ngViewportDirective(
  $parse: ng.ParseService,
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement): void {
      const enterExpr = $attributes.read(element, "onEnter");

      const leaveExpr = $attributes.read(element, "onLeave");

      const enterFn = enterExpr ? $parse(enterExpr) : undefined;

      const leaveFn = leaveExpr ? $parse(leaveExpr) : undefined;

      const observer = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              enterFn?.(scope);
            } else {
              leaveFn?.(scope);
            }
          });
        },
        {
          root: null, // viewport
          threshold: 0.1, // consider "in view" if 10% visible
        },
      );

      observer.observe(element);

      // Clean up when the element is removed from DOM
      const parent = element.parentNode;

      let mutationObserver: MutationObserver | undefined;

      if (parent) {
        mutationObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            arrayFrom(mutation.removedNodes).forEach((removedNode: Node) => {
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

        if (mutationObserver) mutationObserver.disconnect();
      });
    },
  };
}
