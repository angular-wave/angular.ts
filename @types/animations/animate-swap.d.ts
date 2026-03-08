/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive}
 */
export declare function ngAnimateSwapDirective($animate: any): {
  restrict: string;
  transclude: string;
  terminal: boolean;
  priority: number;
  link(
    scope: any,
    $element: any,
    attrs: any,
    _ctrl: any,
    $transclude: any,
  ): void;
};
export declare namespace ngAnimateSwapDirective {
  var $inject: "$animate"[];
}
