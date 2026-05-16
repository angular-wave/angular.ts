import { _attributes } from "../../injection-tokens.ts";

ngCloakDirective.$inject = [_attributes];

/** Removes the `ng-cloak` attribute during compilation so cloaked content can render. */
export function ngCloakDirective(
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    compile(element: Element): undefined {
      $attributes.set(element, "ngCloak", null);

      return undefined;
    },
  };
}
