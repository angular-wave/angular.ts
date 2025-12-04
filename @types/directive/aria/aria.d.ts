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
export function AriaProvider(): void;
export class AriaProvider {
  config: (newConfig: any) => void;
  $get: () => {
    config(key: any): any;
    $$watchExpr: (
      attrName: any,
      ariaAttr: any,
      nativeAriaNodeNamesParam: any,
      negate: any,
    ) => (scope: any, elem: any, attr: any) => void;
  };
}
export function ngDisabledAriaDirective($aria: any): any;
export namespace ngDisabledAriaDirective {
  let $inject: string[];
}
export function ngShowAriaDirective($aria: any): any;
export namespace ngShowAriaDirective {
  let $inject_1: string[];
  export { $inject_1 as $inject };
}
/**
 * @return {ng.Directive}
 */
export function ngMessagesAriaDirective(): ng.Directive;
/**
 * @param $aria
 * @param {ng.ParseService} $parse
 * @return {ng.Directive}
 */
export function ngClickAriaDirective(
  $aria: any,
  $parse: ng.ParseService,
): ng.Directive;
export namespace ngClickAriaDirective {
  let $inject_2: string[];
  export { $inject_2 as $inject };
}
export function ngRequiredAriaDirective($aria: any): any;
export namespace ngRequiredAriaDirective {
  let $inject_3: string[];
  export { $inject_3 as $inject };
}
export function ngCheckedAriaDirective($aria: any): any;
export namespace ngCheckedAriaDirective {
  let $inject_4: string[];
  export { $inject_4 as $inject };
}
export function ngValueAriaDirective($aria: any): any;
export namespace ngValueAriaDirective {
  let $inject_5: string[];
  export { $inject_5 as $inject };
}
export function ngHideAriaDirective($aria: any): any;
export namespace ngHideAriaDirective {
  let $inject_6: string[];
  export { $inject_6 as $inject };
}
export function ngReadonlyAriaDirective($aria: any): any;
export namespace ngReadonlyAriaDirective {
  let $inject_7: string[];
  export { $inject_7 as $inject };
}
export function ngModelAriaDirective($aria: any): {
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
export namespace ngModelAriaDirective {
  let $inject_8: string[];
  export { $inject_8 as $inject };
}
export function ngDblclickAriaDirective(
  $aria: any,
): (scope: any, elem: any, attr: any) => void;
export namespace ngDblclickAriaDirective {
  let $inject_9: string[];
  export { $inject_9 as $inject };
}
