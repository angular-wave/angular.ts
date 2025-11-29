/**
 * @return {ng.Directive}
 */
export function ngScopeDirective() {
  return {
    scope: false,
    async link($scope, _, $attrs) {
      $scope.$scopename = $attrs.ngScope;
    },
  };
}
