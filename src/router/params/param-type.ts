import { filter, map } from "../../shared/common.ts";
import { isArray, isDefined } from "../../shared/utils.ts";
import type { ParamTypeDefinition } from "./interface.ts";
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
  [key: string]: any;
  pattern: RegExp;
  inherit: boolean;
  name: string | undefined;

  /**
     * @param {any} def A configuration object which contains the custom type definition.  The object's
    properties will override the default methods and/or pattern in `ParamType`'s public interface.
     */
  constructor(def: ParamTypeDefinition & Record<string, any>) {
    this.pattern = /.*/;
    this.inherit = true;
    Object.assign(this, def);
    this.name = undefined;
  }
  // consider these four methods to be "abstract methods" that should be overridden

  /**
   * @param {any} val
   */
  is(val: any): boolean {
    return !!val;
  }

  /**
   * @param {any} val
   */
  encode(val: any): any {
    return val;
  }

  /**
   * @param {any} val
   */
  decode(val: any): any {
    return val;
  }

  /**
   * @param {any} a
   * @param {any} b
   */
  equals(a: any, b: any): boolean {
    return a === b;
  }

  toString() {
    return `{ParamType:${this.name}}`;
  }

  /**
   * Given an encoded string, or a decoded object, returns a decoded object
   * @param {any} val
   */
  $normalize(val: any): any {
    return this.is(val) ? val : this.decode(val);
  }

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
  $asArray(mode: boolean | "auto", isSearch: boolean): ParamType {
    if (!mode) return this;

    if (mode === "auto" && !isSearch)
      throw new Error("'auto' array mode is for query parameters only");

    return new (ArrayType as unknown as new (
      type: ParamType & Record<string, any>,
      mode: boolean | "auto",
    ) => ParamType)(this, mode);
  }
}

/**
 * Wraps up a `ParamType` object to handle array values.
 * @this {Record<string, any>}
 * @param {ParamType & Record<string, any>} type
 * @param {boolean | 'auto'} mode
 */
function ArrayType(
  this: Record<string, any>,
  type: ParamType & Record<string, any>,
  mode: boolean | "auto",
): void {
  // Wrap non-array value as array
  /**
   * @param {any} val
   */
  function arrayWrap(val: any): any[] {
    return isArray(val) ? val : isDefined(val) ? [val] : [];
  }
  // Unwrap array value for "auto" mode. Return undefined for empty array.
  /**
   * @param {any} val
   */
  function arrayUnwrap(val: any[]): any {
    switch (val.length) {
      case 0:
        return undefined;
      case 1:
        return mode === "auto" ? val[0] : val;
      default:
        return val;
    }
  }
  // Wraps type (.is/.encode/.decode) functions to operate on each value of an array
  /**
   * @param {(value: any) => any} callback
   * @param {boolean} [allTruthyMode]
   */
  function arrayHandler(
    callback: (value: any) => any,
    allTruthyMode?: boolean,
  ) {
    return function handleArray(val: string | any[]) {
      if (isArray(val) && val.length === 0) return val;
      const arr = arrayWrap(val);

      const result = map(arr, callback) as any[];

      return allTruthyMode === true
        ? filter(result, (x) => !x).length === 0
        : arrayUnwrap(result);
    };
  }
  // Wraps type (.equals) functions to operate on each value of an array
  /**
   * @param {(arg0: any, arg1: any) => any} callback
   */
  function arrayEqualsHandler(callback: (arg0: any, arg1: any) => any) {
    return function handleArray(val1: any, val2: any) {
      const left = arrayWrap(val1),
        right = arrayWrap(val2);

      if (left.length !== right.length) return false;

      for (let i = 0; i < left.length; i++) {
        if (!callback(left[i], right[i])) return false;
      }

      return true;
    };
  }
  ["encode", "decode", "equals", "$normalize"].forEach((name: string) => {
    const paramTypeFn = type[name].bind(type);

    const wrapperFn = name === "equals" ? arrayEqualsHandler : arrayHandler;

    this[name] = wrapperFn(paramTypeFn);
  });

  Object.assign(this, {
    dynamic: type.dynamic,
    name: type.name,
    pattern: type.pattern,
    inherit: type.inherit,
    raw: type.raw,
    is: arrayHandler(type.is.bind(type), true),
    $arrayMode: mode,
  });
}
