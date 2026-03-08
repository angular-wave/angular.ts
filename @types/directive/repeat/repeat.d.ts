/**
 * @param {ng.AnimateService}  $animate
 * @returns {ng.Directive}
 */
export declare function ngRepeatDirective($animate: any): {
  restrict: string;
  transclude: string;
  priority: number;
  terminal: boolean;
  compile(
    _$element: any,
    $attr: any,
  ): (
    $scope: any,
    $element: any,
    attr: any,
    _ctrl: any,
    $transclude: any,
  ) => void;
};
export declare namespace ngRepeatDirective {
  var $inject: "$animate"[];
}
