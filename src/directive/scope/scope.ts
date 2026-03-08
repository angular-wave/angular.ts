export function ngScopeDirective(): ng.Directive {
  return {
    scope: false,
    async link($scope: ng.Scope, _: unknown, $attrs: ng.Attributes) {
      $scope.$scopename = $attrs.ngScope;
    },
  };
}
