/**
 * Declares the built-in `ng-controller` attribute directive.
 *
 * @returns {ng.Directive}
 */
export function ngControllerDirective(): ng.Directive {
  return {
    restrict: "A",
    scope: true,
    controller: "@",
    priority: 500,
  };
}
