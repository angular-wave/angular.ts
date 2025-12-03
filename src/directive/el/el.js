/**
 * @returns {ng.Directive}
 */
export function ngElDirective() {
  return {
    restrict: "A",
    link(scope, element, attrs) {
      const expr = attrs.ngEl;

      const key = !expr ? element.id : expr;

      scope.$target[key] = element;
      const parent = element.parentNode;

      if (!parent) return;

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          Array.from(mutation.removedNodes).forEach((removedNode) => {
            if (removedNode === element) {
              //
              delete scope.$target[key];
              observer.disconnect();
            }
          });
        }
      });

      observer.observe(parent, { childList: true });
    },
  };
}
