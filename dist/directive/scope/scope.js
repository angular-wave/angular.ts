import { getNormalizedAttr } from '../../shared/dom.js';

/** Assigns a required, stable scope name so the scope can be looked up externally. */
function ngScopeDirective() {
    return {
        scope: false,
        link($scope, element) {
            const scopeName = getNormalizedAttr(element, "ngScope");
            if (typeof scopeName !== "string" || scopeName.trim() === "") {
                throw new TypeError("ng-scope requires a non-empty name.");
            }
            $scope.scopeName = scopeName.trim();
        },
    };
}

export { ngScopeDirective };
