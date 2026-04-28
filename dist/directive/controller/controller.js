/**
 * Declares the built-in `ng-controller` attribute directive.
 */
function ngControllerDirective() {
    return {
        restrict: "A",
        scope: true,
        controller: "@",
        priority: 500,
    };
}

export { ngControllerDirective };
