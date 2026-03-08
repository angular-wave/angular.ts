/**
 *
 * @param {ng.CompileService} $compile
 * @param {ng.ParseService} $parse
 * @returns {ng.Directive}
 */
export declare function ngOptionsDirective(
  $compile: any,
  $parse: any,
): {
  restrict: string;
  terminal: boolean;
  require: string[];
  link: {
    pre: (scope: any, selectElement: any, attr: any, ctrls: any) => void;
    post: (scope: any, selectElement: any, attr: any, ctrls: any) => void;
  };
};
export declare namespace ngOptionsDirective {
  var $inject: ("$compile" | "$parse")[];
}
