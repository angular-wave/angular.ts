/**
 * Used for configuring the ARIA attributes injected and managed by ngAria.
 *
 * ```js
 * angular.module('myApp', ['ngAria'], function config($ariaProvider) {
 *   $ariaProvider.config({
 *     ariaValue: true,
 *     tabindex: false
 *   });
 * });
 *```
 *
 * ## Dependencies
 * Requires the {@link ngAria} module to be installed.
 *
 */
export declare function AriaProvider(): void;
/**
 * @param {ng.AriaService} $aria
 */
export declare function ngDisabledAriaDirective($aria: any): any;
export declare namespace ngDisabledAriaDirective {
  var $inject: "$aria"[];
}
/**
 * @param {ng.AriaService} $aria
 */
export declare function ngShowAriaDirective($aria: any): any;
export declare namespace ngShowAriaDirective {
  var $inject: "$aria"[];
}
/**
 * @return {ng.Directive}
 */
export declare function ngMessagesAriaDirective(): {
  restrict: string;
  require: string;
  link(_scope: any, elem: any, attr: any): void;
};
/**
 * @param {ng.AriaService} $aria
 * @param {ng.ParseService} $parse
 * @return {ng.Directive}
 */
export declare function ngClickAriaDirective(
  $aria: any,
  $parse: any,
): {
  restrict: string;
  compile(
    _elem: any,
    attr: any,
  ): (scope: any, elem: any, attrParam: any) => void;
};
export declare namespace ngClickAriaDirective {
  var $inject: ("$aria" | "$parse")[];
}
/**
 * @param {ng.AriaService} $aria
 */
export declare function ngRequiredAriaDirective($aria: any): any;
export declare namespace ngRequiredAriaDirective {
  var $inject: "$aria"[];
}
/**
 * @param {ng.AriaService} $aria
 */
export declare function ngCheckedAriaDirective($aria: any): any;
export declare namespace ngCheckedAriaDirective {
  var $inject: "$aria"[];
}
/**
 * @param {ng.AriaService} $aria
 */
export declare function ngValueAriaDirective($aria: any): any;
export declare namespace ngValueAriaDirective {
  var $inject: "$aria"[];
}
/**
 * @param {ng.AriaService} $aria
 */
export declare function ngHideAriaDirective($aria: any): any;
export declare namespace ngHideAriaDirective {
  var $inject: "$aria"[];
}
/**
 * @param {ng.AriaService} $aria
 */
export declare function ngReadonlyAriaDirective($aria: any): any;
export declare namespace ngReadonlyAriaDirective {
  var $inject: "$aria"[];
}
/**
 * @param {ng.AriaService} $aria
 * @returns {ng.Directive}
 */
export declare function ngModelAriaDirective($aria: any): {
  restrict: string;
  require: string;
  priority: number;
  compile(
    _: any,
    attr: any,
  ): {
    post(_: any, elem: any, attrPost: any, ngModel: any): void;
  };
};
export declare namespace ngModelAriaDirective {
  var $inject: "$aria"[];
}
/**
 * @param {ng.AriaService} $aria
 * @returns {import("../../interface.ts").DirectiveLinkFn<any>}
 */
export declare function ngDblclickAriaDirective(
  $aria: any,
): (_scope: any, elem: any, attr: any) => void;
export declare namespace ngDblclickAriaDirective {
  var $inject: "$aria"[];
}
