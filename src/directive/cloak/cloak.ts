import type { Attributes } from "../../core/compile/attributes.ts";
/** Removes the `ng-cloak` attribute during compilation so cloaked content can render. */
export function ngCloakDirective(): ng.Directive {
  return {
    compile(_: Element, attr: Attributes): void {
      attr.$set("ngCloak", null);
    },
  };
}
