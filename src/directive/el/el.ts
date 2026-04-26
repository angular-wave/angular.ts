import { Attributes } from "../../core/compile/attributes.ts";
import { arrayFrom } from "../../shared/utils.ts";

/**
 * Exposes the current element on `scope.$target` under the provided key.
 */
export function ngElDirective(): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement, attrs: Attributes): void {
      const attrMap = attrs as Attributes & Record<string, string>;

      const expr = attrMap.ngEl;

      const key = !expr ? element.id : expr;

      scope.$target[key] = element;
      const parent = element.parentNode;

      if (!parent) return;

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          arrayFrom(mutation.removedNodes).forEach((removedNode: Node) => {
            if (removedNode === element) {
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
