import { filter, map } from "../../shared/common.ts";
import { isArray, isDefined } from "../../shared/utils.ts";
export interface ParamTypeDefinition {
  /**
   * A regular expression that matches the encoded parameter type
   *
   * This regular expression is used to match an encoded parameter value **in the URL**.
   *
   * For example, if your type encodes as a dash-separated numbers, match that here:
   * `new RegExp("[0-9]+(?:-[0-9]+)*")`.
   *
   * There are some limitations to these regexps:
   *
   * - No capturing groups are allowed (use non-capturing groups: `(?: )`)
   * - No pattern modifiers like case insensitive
   * - No start-of-string or end-of-string: `/^foo$/`
   */
  pattern?: RegExp;

  /**
   * Disables url-encoding of parameter values
   *
   * If a parameter type is declared `raw`, it will not be url-encoded.
   * Custom encoding can still be applied in the [[encode]] function.
   *
   * ### Decoding warning
   *
   * The decoding behavior of raw parameters is not defined.
   * See: [[ParamDeclaration.raw]] for details
   */
  raw?: boolean;

  /**
   * Enables/disables inheriting of parameter values (of this type)
   *
   * When a transition is run with [[TransitionOptions.inherit]] set to
   * `true`, the current param values are inherited in the new transition.
   * However, parameters whose type has `inherit: false` set  will *not be inherited*.
   *
   * The internal parameter type of `hash` has `inherit: false`.
   * This is used to disable inheriting of the hash value (`#`) on subsequent transitions.
   *
   * #### Example:
   * ```js
   * $state.go('home', { '#': 'inboxAnchor' });
   * ...
   * // "#" is not inherited.
   * // The value of the "#" parameter will be `null`
   * // The url's hash will be cleared.
   * $state.go('home.nest');
   * ```
   *
   * ---
   *
   * See also [[TransitionOptions.inherit]] and [[ParamDeclaration.inherit]]
   *
   */
  inherit?: boolean;

  /**
   * Dynamic flag
   *
   * When `dynamic` is `true`, changes to the parameter value will not cause the state to be entered/exited.
   *
   * Normally, if a parameter value changes, the state which declared that the parameter will be reloaded (entered/exited).
   * When a parameter is `dynamic`, a transition still occurs, but it does not cause the state to exit/enter.
   *
   * Default: `false`
   */
  dynamic?: boolean;

  /**
   * Tests if some object type is compatible with this parameter type
   *
   * Detects whether some value is of this particular type.
   * Accepts a decoded value and determines whether it matches this `ParamType` object.
   *
   * If your custom type encodes the parameter to a specific type, check for that type here.
   * For example, if your custom type decodes the URL parameter value as an array of ints, return true if the
   * input is an array of ints:
   *
   * ```
   * is: (val) => isArray(val) && array.reduce((acc, x) => acc && parseInt(val, 10) === val, true)
   * ```
   *
   * If your type decodes the URL parameter value to a custom string, check that the string matches
   * the pattern (don't use an arrow fn if you need `this`): `function (val) { return !!this.pattern.exec(val) }`
   *
   * Note: This method is _not used to check if the URL matches_.
   * It's used to check if a _decoded value *is* this type_.
   * Use [[pattern]] to check the encoded value in the URL.
   *
   * @param val The value to check.
   * @param key If the type check is happening in the context of a specific [[UrlMatcher]]  object,
   *        this is the name of the parameter in which `val` is stored. Can be used for
   *        meta-programming of `ParamType` objects.
   * @returns `true` if the value matches the type, otherwise `false`.
   */
  is(val: any, key?: string): boolean;

  /**
   * Encodes a custom/native type value to a string that can be embedded in a URL.
   *
   * Note that the return value does *not* need to be URL-safe (i.e. passed through `encodeURIComponent()`).
   * It only needs to be a representation of `val` that has been encoded as a string.
   *
   * For example, if your custom type decodes to an array of ints, then encode the array of ints to a string here:
   *
   * ```js
   * encode: (intarray) => intarray.join("-")
   * ```
   *
   * Note: in general, [[encode]] and [[decode]] should be symmetrical.  That is, `encode(decode(str)) === str`
   *
   * @param val - The value to encode.
   * @param key - The name of the parameter in which `val` is stored. Can be used for meta-programming of `ParamType` objects.
   * @returns A string representation of `val` that can be encoded in a URL.
   */
  encode(val: any, key?: string): string | string[];

  /**
   * Decodes a parameter value string (from URL string or transition param) to a custom/native value.
   *
   * For example, if your type decodes to an array of ints, then decode the string as an array of ints here:
   * ```js
   * decode: (str) => str.split("-").map(str => parseInt(str, 10))
   * ```
   *
   * Note: in general, [[encode]] and [[decode]] should be symmetrical.  That is, `encode(decode(str)) === str`
   *
   * @param val - The URL parameter value to decode.
   * @param key - The name of the parameter in which `val` is stored. Can be used for meta-programming of `ParamType` objects.
   * @returns A custom representation of the URL parameter value.
   */
  decode(val: string, key?: string): any;

  /**
   * Determines whether two decoded values are equivalent.
   *
   * For example, if your type decodes to an array of ints, then check if the arrays are equal:
   * ```js
   * equals: (a, b) => a.length === b.length && a.reduce((acc, x, idx) => acc && x === b[idx], true)
   * ```
   *
   * @param a A value to compare against.
   * @param b A value to compare against.
   * @returns `true` if the values are equivalent/equal, otherwise `false`.
   */
  equals(a: any, b: any): boolean;
}
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
     * @param def A configuration object which contains the custom type definition.  The object's
    properties will override the default methods and/or pattern in `ParamType`'s public interface.
     */
  constructor(def: ParamTypeDefinition & Record<string, any>) {
    this.pattern = /.*/;
    this.inherit = true;
    Object.assign(this, def);
    this.name = undefined;
  }
  // consider these four methods to be "abstract methods" that should be overridden

  /** Returns true when the provided value matches the type. */
  is(val: any): boolean {
    return !!val;
  }

  /** Encodes one value using this parameter type. */
  encode(val: any): any {
    return val;
  }

  /** Decodes one value using this parameter type. */
  decode(val: any): any {
    return val;
  }

  /** Returns true when the two decoded values are equivalent. */
  equals(a: any, b: any): boolean {
    return a === b;
  }

  toString() {
    return `{ParamType:${this.name}}`;
  }

  /**
   * Given an encoded string, or a decoded object, returns a decoded object
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

/** Wraps a `ParamType` object so it can encode and decode array values. */
function ArrayType(
  this: Record<string, any>,
  type: ParamType & Record<string, any>,
  mode: boolean | "auto",
): void {
  // Wrap non-array value as array
  /** Wraps one value as an array when needed. */
  function arrayWrap(val: any): any[] {
    return isArray(val) ? val : isDefined(val) ? [val] : [];
  }
  // Unwrap array value for "auto" mode. Return undefined for empty array.
  /** Unwraps an array value for auto mode and empty-array handling. */
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
  /** Lifts a single-value handler so it operates across an array. */
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
  /** Lifts a pairwise comparator so it operates across arrays. */
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
