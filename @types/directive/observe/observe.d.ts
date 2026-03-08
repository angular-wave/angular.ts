/**
 * Creates an attribute observer directive that mirrors attribute changes onto scope.
 *
 * @param {string} source - the name of the attribute to be observed
 */
export declare function ngObserveDirective(
  source: string,
  prop: string,
): ng.Directive;
