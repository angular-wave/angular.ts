import { _attributes } from "../../injection-tokens.ts";
import { arrayFrom, deleteProperty, isString } from "../../shared/utils.ts";

ngElDirective.$inject = [_attributes];
/**
 * Exposes the current element on `scope.$target` under the provided key.
 */
export function ngElDirective($attributes: ng.AttributesService): ng.Directive {
  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement): void {
      const target = scope.$target as Record<string, Element | undefined>;

      const expr = $attributes.read(element, "ngEl");

      const key = isString(expr) && expr ? expr : element.id;

      target[key] = element;
      const parent = element.parentNode;

      if (!parent) return;

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          arrayFrom(mutation.removedNodes).forEach((removedNode: Node) => {
            if (removedNode === element) {
              deleteProperty(target, key);
              observer.disconnect();
            }
          });
        }
      });

      observer.observe(parent, { childList: true });
    },
  };
}
