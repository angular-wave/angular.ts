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
    /**
     * @param {string | number} key
     */
    config(key: string | number): any;
    _watchExpr: (
      attrName: string | number,
      ariaAttr: any,
      nativeAriaNodeNamesParam: string | any[],
      negate: any,
    ) => (
      /** @type {ng.Scope} */ scope: ng.Scope,
      /** @type {HTMLElement} */ elem: HTMLElement,
      /** @type {ng.Attributes} */ attr: ng.Attributes,
    ) => void;
  };
}
/**
 * @param {ng.AriaService} $aria
 */
export function ngDisabledAriaDirective(
  $aria: ng.AriaService,
): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void;
export namespace ngDisabledAriaDirective {
  let $inject: string[];
}
/**
 * @param {ng.AriaService} $aria
 */
export function ngShowAriaDirective(
  $aria: ng.AriaService,
): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void;
export namespace ngShowAriaDirective {
  let $inject_1: string[];
  export { $inject_1 as $inject };
}
/**
 * @return {ng.Directive}
 */
export function ngMessagesAriaDirective(): ng.Directive;
/**
 * @param {ng.AriaService} $aria
 * @param {ng.ParseService} $parse
 * @return {ng.Directive}
 */
export function ngClickAriaDirective(
  $aria: ng.AriaService,
  $parse: ng.ParseService,
): ng.Directive;
export namespace ngClickAriaDirective {
  let $inject_2: string[];
  export { $inject_2 as $inject };
}
/**
 * @param {ng.AriaService} $aria
 */
export function ngRequiredAriaDirective(
  $aria: ng.AriaService,
): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void;
export namespace ngRequiredAriaDirective {
  let $inject_3: string[];
  export { $inject_3 as $inject };
}
/**
 * @param {ng.AriaService} $aria
 */
export function ngCheckedAriaDirective(
  $aria: ng.AriaService,
): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void;
export namespace ngCheckedAriaDirective {
  let $inject_4: string[];
  export { $inject_4 as $inject };
}
/**
 * @param {ng.AriaService} $aria
 */
export function ngValueAriaDirective(
  $aria: ng.AriaService,
): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void;
export namespace ngValueAriaDirective {
  let $inject_5: string[];
  export { $inject_5 as $inject };
}
/**
 * @param {ng.AriaService} $aria
 */
export function ngHideAriaDirective(
  $aria: ng.AriaService,
): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void;
export namespace ngHideAriaDirective {
  let $inject_6: string[];
  export { $inject_6 as $inject };
}
/**
 * @param {ng.AriaService} $aria
 */
export function ngReadonlyAriaDirective(
  $aria: ng.AriaService,
): (scope: ng.Scope, elem: HTMLElement, attr: ng.Attributes) => void;
export namespace ngReadonlyAriaDirective {
  let $inject_7: string[];
  export { $inject_7 as $inject };
}
/**
 * @param {ng.AriaService} $aria
 * @returns {ng.Directive}
 */
export function ngModelAriaDirective($aria: ng.AriaService): ng.Directive;
export namespace ngModelAriaDirective {
  let $inject_8: string[];
  export { $inject_8 as $inject };
}
/**
 * @param {ng.AriaService} $aria
 * @returns {import("../../interface.ts").DirectiveLinkFn<any>}
 */
export function ngDblclickAriaDirective(
  $aria: ng.AriaService,
): import("../../interface.ts").DirectiveLinkFn<any>;
export namespace ngDblclickAriaDirective {
  let $inject_9: string[];
  export { $inject_9 as $inject };
}
