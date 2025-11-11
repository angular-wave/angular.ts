export function weekParser(isoWeek: any, existingDate: any): any;
export function createDateParser(
  regexp: any,
  mapping: any,
): (iso: any, previousDate: any) => any;
export function createDateInputType(
  type: any,
  regexp: any,
  parseDate: any,
): (
  scope: any,
  element: any,
  attr: any,
  ctrl: any,
  $filter: any,
  $parse: any,
) => void;
export function badInputChecker(
  scope: any,
  element: any,
  attr: any,
  ctrl: any,
  parserName: any,
): void;
export function numberFormatterParser(ctrl: any): void;
export function isNumberInteger(num: any): boolean;
export function countDecimals(num: any): number;
export function isValidForStep(
  viewValue: any,
  stepBase: any,
  step: any,
): boolean;
export function numberInputType(
  scope: any,
  element: any,
  attr: any,
  ctrl: any,
  $filter: any,
  $parse: any,
): void;
export function rangeInputType(
  scope: any,
  element: any,
  attr: any,
  ctrl: any,
): void;
/**
 * @param {ng.FilterService} $filter
 * @param {ng.ParseService} $parse
 * @returns {ng.Directive}
 */
export function inputDirective(
  $filter: ng.FilterService,
  $parse: ng.ParseService,
): ng.Directive;
export namespace inputDirective {
  let $inject: string[];
}
/**
 * @returns {ng.Directive}
 */
export function hiddenInputBrowserCacheDirective(): ng.Directive;
/**
 * @returns {ng.Directive}
 */
export function ngValueDirective(): ng.Directive;
export const ISO_DATE_REGEXP: RegExp;
export const URL_REGEXP: RegExp;
export const EMAIL_REGEXP: RegExp;
export const VALIDITY_STATE_PROPERTY: "validity";
