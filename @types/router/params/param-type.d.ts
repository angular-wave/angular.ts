/**
 * An internal class which implements [[ParamTypeDefinition]].
 *
 * A [[ParamTypeDefinition]] is a plain javascript object used to register custom parameter types.
 * When a param type definition is registered, an instance of this class is created internally.
 *
 * This class has naive implementations for all the [[ParamTypeDefinition]] methods.
 *
 * Used by [[UrlMatcher]] when matching or formatting URLs, or comparing and validating parameter values.
 *
 * #### Example:
 * ```js
 * var paramTypeDef = {
 *   decode: function(val) { return parseInt(val, 10); },
 *   encode: function(val) { return val && val.toString(); },
 *   equals: function(a, b) { return this.is(a) && a === b; },
 *   is: function(val) { return angular.isNumber(val) && isFinite(val) && val % 1 === 0; },
 *   pattern: /\d+/
 * }
 *
 * var paramType = new ParamType(paramTypeDef);
 * ```
 */
export class ParamType {
  /**
       * @param {any} def A configuration object which contains the custom type definition.  The object's
      properties will override the default methods and/or pattern in `ParamType`'s public interface.
       */
  constructor(def: any);
  pattern: RegExp;
  inherit: boolean;
  /** @type {string|undefined} */
  name: string | undefined;
  /**
   * @param {any} val
   */
  is(val: any): boolean;
  /**
   * @param {any} val
   */
  encode(val: any): any;
  /**
   * @param {any} val
   */
  decode(val: any): any;
  /**
   * @param {any} a
   * @param {any} b
   */
  equals(a: any, b: any): boolean;
  toString(): string;
  /**
   * Given an encoded string, or a decoded object, returns a decoded object
   * @param {any} val
   */
  $normalize(val: any): any;
  /**
   * Wraps an existing custom ParamType as an array of ParamType, depending on 'mode'.
   * e.g.:
   * - urlmatcher pattern "/path?{queryParam[]:int}"
   * - url: "/path?queryParam=1&queryParam=2
   * - $stateParams.queryParam will be [1, 2]
   * if `mode` is "auto", then
   * - url: "/path?queryParam=1 will create $stateParams.queryParam: 1
   * - url: "/path?queryParam=1&queryParam=2 will create $stateParams.queryParam: [1, 2]
   * @param {boolean |'auto'} mode
   * @param {any} isSearch
   */
  $asArray(mode: boolean | "auto", isSearch: any): ArrayType;
}
/**
 * Wraps up a `ParamType` object to handle array values.
 * @this {Record<string, any>}
 * @param {ParamType & Record<string, any>} type
 * @param {boolean | 'auto'} mode
 */
declare function ArrayType(
  this: Record<string, any>,
  type: ParamType & Record<string, any>,
  mode: boolean | "auto",
): void;
declare class ArrayType {
  /**
   * Wraps up a `ParamType` object to handle array values.
   * @this {Record<string, any>}
   * @param {ParamType & Record<string, any>} type
   * @param {boolean | 'auto'} mode
   */
  constructor(
    this: Record<string, any>,
    type: ParamType & Record<string, any>,
    mode: boolean | "auto",
  );
}
export {};
