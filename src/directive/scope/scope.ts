import { getNormalizedAttr } from "../../shared/dom.ts";

/** Assigns a stable scope name so the scope can be looked up externally. */
export function ngScopeDirective(): ng.Directive {
  return {
    scope: false,
    link($scope: ng.Scope, element: Element): void {
      const scopeName = getNormalizedAttr(element, "ngScope");

      if (typeof scopeName === "string") {
        $scope.$scopename = scopeName;
      }
    },
  };
}
