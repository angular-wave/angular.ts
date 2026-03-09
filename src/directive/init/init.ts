import { getController } from "../../shared/dom.ts";
import type { DirectivePrePost } from "../../interface.ts";

/** Evaluates an initialization expression during the pre-link phase. */
export function ngInitDirective(): ng.Directive {
  return {
    priority: 450,
    compile(): DirectivePrePost {
      return {
        pre(
          scope: ng.Scope,
          element: Element,
          attrs: import("../../core/compile/attributes.ts").Attributes,
        ): void {
          const attrMap =
            attrs as import("../../core/compile/attributes.ts").Attributes &
              Record<string, string>;
          const controller = getController(element);

          if (controller) {
            controller.$eval(attrMap.ngInit);
          } else {
            scope.$eval(attrMap.ngInit);
          }
        },
      };
    },
  };
}
