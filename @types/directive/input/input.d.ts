/**
 * @param {string} type
 * @param {RegExp} regexp
 * @returns {*}
 */
export function createStringDateInputType(type: string, regexp: RegExp): any;
/**
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {NgModelControllerProxied} ctrl
 * @param {string} parserName
 */
export function badInputChecker(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: NgModelControllerProxied,
  parserName: string,
): void;
/**
 * @param {NgModelController} ctrl
 */
export function numberFormatterParser(ctrl: NgModelController): void;
/**
 * @param {any} num
 * @return {boolean}
 */
export function isNumberInteger(num: any): boolean;
/**
 * @param {number} num
 * @return {number}
 */
export function countDecimals(num: number): number;
/**
 * @param {any} viewValue
 * @param {number} stepBase
 * @param {number | undefined} step
 */
export function isValidForStep(
  viewValue: any,
  stepBase: number,
  step: number | undefined,
): boolean;
/**
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {NgModelControllerProxied} ctrl
 * @param {ng.ParseService} $parse
 */
export function numberInputType(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: NgModelControllerProxied,
  $parse: ng.ParseService,
): void;
/**
 * @param {ng.Scope} scope
 * @param {HTMLInputElement} element
 * @param {ng.Attributes} attr
 * @param {NgModelControllerProxied} ctrl
 */
export function rangeInputType(
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: NgModelControllerProxied,
): void;
/**
 * @param {ng.ParseService} $parse
 * @returns {ng.Directive}
 */
export function inputDirective($parse: ng.ParseService): ng.Directive;
export namespace inputDirective {
  let $inject: string[];
}
/**
 * @returns {ng.Directive}
 */
export function hiddenInputDirective(): ng.Directive;
/**
 * @returns {ng.Directive}
 */
export function ngValueDirective(): ng.Directive;
/** @typedef {import("../model/model.js").NgModelController} NgModelController */
/** @typedef {import("./interface.ts").NgModelControllerProxied} NgModelControllerProxied */
export const ISO_DATE_REGEXP: RegExp;
export const URL_REGEXP: RegExp;
export const EMAIL_REGEXP: RegExp;
export const VALIDITY_STATE_PROPERTY: "validity";
export type NgModelController = import("../model/model.js").NgModelController;
export type NgModelControllerProxied =
  import("./interface.ts").NgModelControllerProxied;
