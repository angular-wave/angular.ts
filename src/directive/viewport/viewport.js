/**
 * @returns {ng.Directive}
 */
export function ngViewportDirective() {
  return {
    restrict: "A",
    link(scope, element, attrs) {
      const enterExpr = attrs.onEnter;

      const leaveExpr = attrs.onLeave;

      const observer = new IntersectionObserver(
        (entries) => {
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

      let mutationObserver;

      if (parent) {
        mutationObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            Array.from(mutation.removedNodes).forEach((removedNode) => {
              if (removedNode === element) {
                observer.disconnect();
                mutationObserver.disconnect();
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
