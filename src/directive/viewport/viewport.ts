import { Attributes } from "../../core/compile/attributes.ts";

/** Evaluates expressions when an element enters or leaves the viewport. */
export function ngViewportDirective(): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement, attrs: Attributes): void {
      const attrMap = attrs as Attributes & Record<string, string>;

      const enterExpr = attrMap.onEnter;

      const leaveExpr = attrMap.onLeave;

      const observer = new IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (enterExpr) scope.$eval(enterExpr);
            } else {
              if (leaveExpr) scope.$eval(leaveExpr);
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
            Array.from(mutation.removedNodes).forEach((removedNode: Node) => {
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
