import { _attributes } from '../../injection-tokens.js';

ngScopeDirective.$inject = [_attributes];
/** Assigns a stable scope name so the scope can be looked up externally. */
function ngScopeDirective($attributes) {
    return {
        scope: false,
        link($scope, element) {
            const scopeName = $attributes.read(element, "ngScope");
            if (typeof scopeName === "string") {
                $scope.$scopename = scopeName;
            }
        },
    };
}

export { ngScopeDirective };
