import { getNormalizedAttr } from '../../shared/dom.js';

/** Assigns a stable scope name so the scope can be looked up externally. */
function ngScopeDirective() {
    return {
        scope: false,
        link($scope, element) {
            const scopeName = getNormalizedAttr(element, "ngScope");
            if (typeof scopeName === "string") {
                $scope.$scopename = scopeName;
            }
        },
    };
}

export { ngScopeDirective };
