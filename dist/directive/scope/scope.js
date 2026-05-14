/** Assigns a stable scope name so the scope can be looked up externally. */
function ngScopeDirective() {
    return {
        scope: false,
        link($scope, _, $attrs) {
            const scopeName = $attrs.ngScope;
            if (typeof scopeName === "string") {
                $scope.$scopename = scopeName;
            }
        },
    };
}

export { ngScopeDirective };
