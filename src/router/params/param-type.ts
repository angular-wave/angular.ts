import { assign, isArray, isDefined } from "../../shared/utils.ts";
import type { ParamTypeDefinition } from "./interface.ts";

type ArrayWrappedMethod = "encode" | "decode" | "equals" | "$normalize";
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
  [key: string]: unknown;
  pattern: RegExp;
  inherit: boolean;
  name: string | undefined;

  /**
     * @param {ParamTypeDefinition} def A configuration object which contains the custom type definition.  The object's
    properties will override the default methods and/or pattern in `ParamType`'s public interface.
     */
  constructor(def: ParamTypeDefinition) {
    this.pattern = /.*/;
    this.inherit = true;
    assign(this, def);
    this.name = undefined;
  }
  // consider these four methods to be "abstract methods" that should be overridden

  /**
   * @param {unknown} val
   */
  is(val: unknown): boolean {
    return !!val;
  }

  /**
   * @param {unknown} val
   */
  encode(val: unknown): unknown {
    return val;
  }

  /**
   * @param {unknown} val
   */
  decode(val: unknown): unknown {
    return val;
  }

  /**
   * @param {unknown} a
   * @param {unknown} b
   */
  equals(a: unknown, b: unknown): boolean {
    return a === b;
  }

  toString() {
    return `{ParamType:${this.name}}`;
  }

  /**
   * Given an encoded string, or a decoded object, returns a decoded object
   * @param {unknown} val
   */
  $normalize(val: unknown): unknown {
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
   * @param {boolean} isSearch
   */
  $asArray(mode: boolean | "auto", isSearch: boolean): ParamType {
    if (!mode) return this;

    if (mode === "auto" && !isSearch)
      throw new Error("'auto' array mode is for query parameters only");

    return new ArrayParamType(this, mode);
  }
}

/**
 * Wraps up a `ParamType` object to handle array values.
 * @param {ParamType & Record<string, unknown>} type
 * @param {boolean | 'auto'} mode
 */
class ArrayParamType extends ParamType {
  constructor(
    type: ParamType & Record<string, unknown>,
    mode: boolean | "auto",
  ) {
    super(type as unknown as ParamTypeDefinition);

    // Wrap non-array value as array
    /**
     * @param {unknown} val
     */
    function arrayWrap(val: unknown): unknown[] {
      return isArray(val) ? val : isDefined(val) ? [val] : [];
    }
    // Unwrap array value for "auto" mode. Return undefined for empty array.
    /**
     * @param {unknown[]} val
     */
    function arrayUnwrap(val: unknown[]): unknown {
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
     * @param {(value: unknown) => unknown} callback
     * @param {boolean} [allTruthyMode]
     */
    function arrayHandler(
      callback: (value: unknown) => unknown,
      allTruthyMode?: boolean,
    ) {
      return function handleArray(val: unknown) {
        if (isArray(val) && val.length === 0) return val;
        const arr = arrayWrap(val);

        const result: unknown[] = [];

        for (let i = 0; i < arr.length; i++) {
          result.push(callback(arr[i]));
        }

        if (allTruthyMode === true) {
          for (let i = 0; i < result.length; i++) {
            if (!result[i]) return false;
          }

          return true;
        }

        return arrayUnwrap(result);
      };
    }
    // Wraps type (.equals) functions to operate on each value of an array
    /**
     * @param {(arg0: unknown, arg1: unknown) => unknown} callback
     */
    function arrayEqualsHandler(
      callback: (arg0: unknown, arg1: unknown) => unknown,
    ) {
      return function handleArray(val1: unknown, val2: unknown) {
        const left = arrayWrap(val1),
          right = arrayWrap(val2);

        if (left.length !== right.length) return false;

        for (let i = 0; i < left.length; i++) {
          if (!callback(left[i], right[i])) return false;
        }

        return true;
      };
    }
    const wrappedMethods: ArrayWrappedMethod[] = [
      "encode",
      "decode",
      "equals",
      "$normalize",
    ];

    for (let i = 0; i < wrappedMethods.length; i++) {
      const name = wrappedMethods[i];

      switch (name) {
        case "encode":
          this.encode = arrayHandler(type.encode.bind(type));
          break;
        case "decode":
          this.decode = arrayHandler(type.decode.bind(type));
          break;
        case "$normalize":
          this.$normalize = arrayHandler(type.$normalize.bind(type));
          break;
        default:
          this.equals = arrayEqualsHandler(type.equals.bind(type));
      }
    }

    assign(this, {
      dynamic: type.dynamic,
      name: type.name,
      pattern: type.pattern,
      inherit: type.inherit,
      raw: type.raw,
      is: arrayHandler(type.is.bind(type), true),
      $arrayMode: mode,
    });
  }
}
