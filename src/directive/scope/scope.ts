/** Assigns a stable scope name so the scope can be looked up externally. */
export function ngScopeDirective(): ng.Directive {
  return {
    scope: false,
    link($scope: ng.Scope, _: unknown, $attrs: ng.Attributes): void {
      const scopeName: unknown = $attrs.ngScope;

      if (typeof scopeName === "string") {
        $scope.$scopename = scopeName;
      }
    },
  };
}
