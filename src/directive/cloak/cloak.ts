import { setNormalizedAttr } from "../../shared/dom.ts";

/** Removes the `ng-cloak` attribute during compilation so cloaked content can render. */
export function ngCloakDirective(): ng.Directive {
  return {
    compile(element: Element): undefined {
      setNormalizedAttr(element, "ngCloak", null);

      return undefined;
    },
  };
}
