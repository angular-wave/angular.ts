import type { AttributesService } from "../../services/attributes/attributes.ts";
import { _attributes } from "../../injection-tokens.ts";

ngScopeDirective.$inject = [_attributes];
/** Assigns a stable scope name so the scope can be looked up externally. */
export function ngScopeDirective($attributes: AttributesService): ng.Directive {
  return {
    scope: false,
    link($scope: ng.Scope, element: Element): void {
      const scopeName = $attributes.read(element, "ngScope");

      if (typeof scopeName === "string") {
        $scope.$scopename = scopeName;
      }
    },
  };
}
