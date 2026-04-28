/** Assigns a stable scope name so the scope can be looked up externally. */
function ngScopeDirective() {
    return {
        scope: false,
        async link($scope, _, $attrs) {
            $scope.$scopename = $attrs.ngScope;
        },
    };
}

export { ngScopeDirective };
