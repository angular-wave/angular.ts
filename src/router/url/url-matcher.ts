import { defaults } from "../../shared/common.ts";
import {
  hasOwn,
  inherit,
  isArray,
  isDefined,
  isInstanceOf,
  isNullOrUndefined,
  isString,
} from "../../shared/utils.ts";
import { DefType, Param } from "../params/param.ts";
import { joinNeighborsR, splitOnDelim } from "../../shared/strings.ts";
import type {
  ParamDetails,
  UrlMatcherCache,
  UrlMatcherCompileConfig,
} from "./interface.ts";
import type { ParamFactory } from "../params/param-factory.ts";
import type { ParamType } from "../params/param-type.ts";
import type { ParamTypes } from "../params/param-types.ts";
import type { RawParams } from "../params/interface.ts";

/**
 * @param {any} str
 * @param {any} [param]
 */
function quoteRegExp(str: any, param?: any): string {
  let surroundPattern = ["", ""];

  let result = str.replace(/[\\[\]^$*+?.()|{}]/g, "\\$&");

  if (!param) return result;
  switch (param.squash) {
    case false:
      surroundPattern = ["(", `)${param.isOptional ? "?" : ""}`];
      break;
    case true:
      result = result.replace(/\/$/, "");
      surroundPattern = ["(?:/(", ")|/)?"];
      break;
    default:
      surroundPattern = [`(${param.squash}|`, ")?"];
      break;
  }

  return (
    result + surroundPattern[0] + param.type.pattern.source + surroundPattern[1]
  );
}

const memoizeTo = (
  obj: { [x: string]: any; path?: UrlMatcher[] },
  _prop: string,
  fn: { (): RegExp; (): any },
) => (obj[_prop] = obj[_prop] || fn());

const splitOnSlash = splitOnDelim("/");

const defaultConfig = {
  state: { params: {} },
  strict: true,
  caseInsensitive: true,
};

/**
 * Matches URLs against patterns.
 *
 * Matches URLs against patterns and extracts named parameters from the path or the search
 * part of the URL.
 *
 * A URL pattern consists of a path pattern, optionally followed by '?' and a list of search (query)
 * parameters. Multiple search parameter names are separated by '&'. Search parameters
 * do not influence whether or not a URL is matched, but their values are passed through into
 * the matched parameters returned by [[UrlMatcher.exec]].
 *
 * - *Path parameters* are defined using curly brace placeholders (`/somepath/{param}`)
 * or colon placeholders (`/somePath/:param`).
 *
 * - *A parameter RegExp* may be defined for a param after a colon
 * (`/somePath/{param:[a-zA-Z0-9]+}`) in a curly brace placeholder.
 * The regexp must match for the url to be matched.
 * Should the regexp itself contain curly braces, they must be in matched pairs or escaped with a backslash.
 *
 * Note: a RegExp parameter will encode its value using either [[ParamTypes.path]] or [[ParamTypes.query]].
 *
 * - *Custom parameter types* may also be specified after a colon (`/somePath/{param:int}`) in curly brace parameters.
 *   See [[UrlMatcherFactory.type]] for more information.
 *
 * - *Catch-all parameters* are defined using an asterisk placeholder (`/somepath/*catchallparam`).
 *   A catch-all * parameter value will contain the remainder of the URL.
 *
 * ---
 *
 * Parameter names may contain only word characters (latin letters, digits, and underscore) and
 * must be unique within the pattern (across both path and search parameters).
 * A path parameter matches any number of characters other than '/'. For catch-all
 * placeholders the path parameter matches any number of characters.
 *
 * Examples:
 *
 * * `'/hello/'` - Matches only if the path is exactly '/hello/'. There is no special treatment for
 *   trailing slashes, and patterns have to match the entire path, not just a prefix.
 * * `'/user/:id'` - Matches '/user/bob' or '/user/1234!!!' or even '/user/' but not '/user' or
 *   '/user/bob/details'. The second path segment will be captured as the parameter 'id'.
 * * `'/user/{id}'` - Same as the previous example, but using curly brace syntax.
 * * `'/user/{id:[^/]*}'` - Same as the previous example.
 * * `'/user/{id:[0-9a-fA-F]{1,8}}'` - Similar to the previous example, but only matches if the id
 *   parameter consists of 1 to 8 hex digits.
 * * `'/files/{path:.*}'` - Matches any URL starting with '/files/' and captures the rest of the
 *   path into the parameter 'path'.
 * * `'/files/*path'` - ditto.
 * * `'/calendar/{start:date}'` - Matches "/calendar/2014-11-12" (because the pattern defined
 *   in the built-in  `date` ParamType matches `2014-11-12`) and provides a Date object in $stateParams.start
 *
 */
export class UrlMatcher {
  static nameValidator = /^\w+([-.]+\w+)*(?:\[\])?$/;
  /** @internal */
  _cache: UrlMatcherCache;
  /** @internal */
  _children: any[];
  /** @internal */
  _params: Param[];
  /** @internal */
  _segments: string[];
  /** @internal */
  _compiled: any[];
  config: any;
  pattern: string;
  /**
   * @internal Given a matcher, return an array with the matcher's path segments and path params, in order
   * @param {UrlMatcher} matcher
   */
  static pathSegmentsAndParams(matcher: UrlMatcher): any {
    const staticSegments = matcher._segments;

    const pathParams = matcher._params.filter(
      (path) => path.location === DefType._PATH,
    );

    const result: Array<string | Param> = [];

    for (let i = 0; i < staticSegments.length; i++) {
      if (staticSegments[i] !== "") result.push(staticSegments[i]);

      if (isDefined(pathParams[i])) result.push(pathParams[i]);
    }

    return result;
  }

  /**
   * @internal Given a matcher, return an array with the matcher's query params
   * @param {UrlMatcher} matcher
   * @returns {Param[]}
   */
  static queryParams(matcher: UrlMatcher): Param[] {
    return matcher._params.filter((path) => path.location === DefType._SEARCH);
  }

  /**
   * Compare two UrlMatchers
   *
   * This comparison function converts a UrlMatcher into static and dynamic path segments.
   * Each static path segment is a static string between a path separator (slash character).
   * Each dynamic segment is a path parameter.
   *
   * The comparison function sorts static segments before dynamic ones.
   * @param {UrlMatcher} a
   * @param {UrlMatcher} b
   */
  static compare(a: UrlMatcher, b: UrlMatcher): number {
    /**
     * Converts a UrlMatcher and all its parent matchers into a flat array of segments.
     *
     * Each segment is one of:
     *  - A slash literal `'/'`
     *  - A string literal (path segment)
     *  - A `Param` object representing a URL parameter
     *
     * Example:
     * ```js
     * // Matches strings like "/foo/:param/tail"
     * var matcher = $umf.compile("/foo")
     *                  .append($umf.compile("/:param"))
     *                  .append($umf.compile("/"))
     *                  .append($umf.compile("tail"));
     *
     * var result = segments(matcher);
     * // result: [ '/', 'foo', '/', Param, '/', 'tail' ]
     * ```
     *
     * The computed segments are cached in `matcher._cache.segments` for faster future access.
     *
     * @param {UrlMatcher} matcher The matcher object to convert into segments. Must have `_cache.path`.
     * @returns {(string | Param)[]} An array of segments representing the URL pattern.
     */
    const segments = (matcher: UrlMatcher) =>
      (matcher._cache.segments =
        matcher._cache.segments ||
        (matcher._cache.path || [matcher])
          .flatMap(UrlMatcher.pathSegmentsAndParams)
          .reduce(joinNeighborsR, [])
          .flatMap<string | Param>((x: string | Param) =>
            isString(x) ? splitOnSlash(x) : [x],
          ));

    /**
     * Gets the sort weight for each segment of a UrlMatcher
     *
     * Caches the result as `matcher._cache.weights`
     */
    const weights = (matcher: UrlMatcher) =>
      (matcher._cache.weights =
        matcher._cache.weights ||
        segments(matcher).map((segment: string | Param) => {
          // Sort slashes first, then static strings, then Params.
          if (segment === "/") return 1;

          if (isString(segment)) return 2;

          if (isInstanceOf(segment, Param)) return 3;

          return 0;
        }));

    /**
     * Pads shorter array in-place (mutates)
     */
    const padArrays = (left: any[], right: any[], padVal: number) => {
      const len = Math.max(left.length, right.length);

      while (left.length < len) left.push(padVal);

      while (right.length < len) right.push(padVal);
    };

    const weightsA = weights(a),
      weightsB = weights(b);

    padArrays(weightsA, weightsB, 0);

    let cmp;

    for (let i = 0, l = weightsA.length; i < l; i++) {
      cmp = weightsA[i]! - weightsB[i]!;

      if (cmp !== 0) return cmp;
    }

    return 0;
  }

  /**
   * @param {string} pattern The pattern to compile into a matcher.
   * @param {ParamTypes} paramTypes The [[ParamTypes]] registry
   * @param {ParamFactory} paramFactory A [[ParamFactory]] object
   * @param {UrlMatcherCompileConfig} config A [[UrlMatcherCompileConfig]] configuration object
   */
  constructor(
    pattern: string,
    paramTypes: ParamTypes,
    paramFactory: ParamFactory,
    config: UrlMatcherCompileConfig,
  ) {
    this._cache = {
      path: [this],
    };

    this._children = [];

    this._params = [];

    this._segments = [];

    this._compiled = [];
    this.config = config = defaults(config, defaultConfig);
    this.pattern = pattern;
    // Find all placeholders and create a compiled pattern, using either classic or curly syntax:
    //   '*' name
    //   ':' name
    //   '{' name '}'
    //   '{' name ':' regexp '}'
    // The regular expression is somewhat complicated due to the need to allow curly braces
    // inside the regular expression. The placeholder regexp breaks down as follows:
    //    ([:*])([\w\[\]]+)              - classic placeholder ($1 / $2) (search version has - for snake-case)
    //    \{([\w\[\]]+)(?:\:\s*( ... ))?\}  - curly brace placeholder ($3) with optional regexp/type ... ($4) (search version has - for snake-case
    //    (?: ... | ... | ... )+         - the regexp consists of any number of atoms, an atom being either
    //    [^{}\\]+                       - anything other than curly braces or backslash
    //    \\.                            - a backslash escape
    //    \{(?:[^{}\\]+|\\.)*\}          - a matched set of curly braces containing other atoms

    const MAX_REGEX_LENGTH = 200; // or any safe limit

    const placeholder = new RegExp(
      `([:*])([\\w[\\]]+)|\\{([\\w[\\]]+)(?::\\s*((?:[^{}\\\\]{1,${
        MAX_REGEX_LENGTH
      }}|\\\\.|\\{(?:[^{}\\\\]{1,${MAX_REGEX_LENGTH}}|\\\\.)*\\})+))?\\}`,
      "g",
    );

    const searchPlaceholder = new RegExp(
      `([:]?)([\\w[\\].-]+)|\\{([\\w[\\].-]+)(?::\\s*((?:[^{}\\\\]{1,${
        MAX_REGEX_LENGTH
      }}|\\\\.|\\{(?:[^{}\\\\]{1,${MAX_REGEX_LENGTH}}|\\\\.)*\\})+))?\\}`,
      "g",
    );

    const patterns = [];

    let last = 0;

    let matchArray;

    const checkParamErrors = (id: string) => {
      if (!UrlMatcher.nameValidator.test(id))
        throw new Error(
          `Invalid parameter name '${id}' in pattern '${pattern}'`,
        );

      for (let i = 0; i < this._params.length; i++) {
        if (this._params[i].id === id) {
          throw new Error(
            `Duplicate parameter name '${id}' in pattern '${pattern}'`,
          );
        }
      }
    };

    // Split into static segments separated by path parameter placeholders.
    // The number of segments is always 1 more than the number of parameters.
    const matchDetails = (match: RegExpExecArray, isSearch: boolean) => {
      // IE[78] returns '' for unmatched groups instead of null
      const id = match[2] || match[3];

      const defaultType = paramTypes.type(isSearch ? "query" : "path");

      const regexp = isSearch
        ? match[4]
        : match[4] || (match[1] === "*" ? "[\\s\\S]*" : null);

      if (!defaultType) {
        throw new Error(
          `Missing default parameter type for '${isSearch ? "query" : "path"}'`,
        );
      }

      const makeRegexpType = (str: string | RegExp): ParamType =>
        inherit(defaultType, {
          pattern: new RegExp(
            str,
            this.config.caseInsensitive ? "i" : undefined,
          ),
        }) as ParamType;

      return {
        id,
        regexp,
        segment: pattern.substring(last, match.index),
        type: !regexp
          ? defaultType
          : (paramTypes.type(regexp) as ParamType | undefined) ||
            makeRegexpType(regexp),
      };
    };

    let details: {
      id: string;
      regexp: string | null;
      segment: string;
      type: ParamType;
    };

    let segment: string;

    while ((matchArray = placeholder.exec(pattern))) {
      details = matchDetails(matchArray, false);

      if (details.segment.indexOf("?") >= 0) break; // we're into the search part
      checkParamErrors(details.id);
      this._params.push(
        paramFactory.fromPath(
          details.id,
          details.type,
          config.state as ng.StateDeclaration,
        ),
      );
      this._segments.push(details.segment);
      patterns.push([details.segment, this._params[this._params.length - 1]]);
      last = placeholder.lastIndex;
    }
    segment = pattern.substring(last);
    // Find any search parameter names and remove them from the last segment
    const i = segment.indexOf("?");

    if (i >= 0) {
      const search = segment.substring(i);

      segment = segment.substring(0, i);

      if (search.length > 0) {
        last = 0;

        while ((matchArray = searchPlaceholder.exec(search))) {
          details = matchDetails(matchArray, true);
          checkParamErrors(details.id);
          this._params.push(
            paramFactory.fromSearch(
              details.id,
              details.type,
              config.state as ng.StateDeclaration,
            ),
          );
          last = placeholder.lastIndex;
          // check if ?&
        }
      }
    }
    this._segments.push(segment);
    this._compiled = patterns
      .map((_pattern) =>
        quoteRegExp((_pattern as any[])[0], (_pattern as any[])[1]),
      )
      .concat(quoteRegExp(segment));
  }

  /**
   * Creates a new concatenated UrlMatcher
   *
   * Builds a new UrlMatcher by appending another UrlMatcher to this one.
   *
   * @param {UrlMatcher} url A `UrlMatcher` instance to append as a child of the current `UrlMatcher`.
   * @returns {UrlMatcher} A new `UrlMatcher` instance representing the concatenation of this `UrlMatcher` and the provided `url` matcher.
   */
  append(url: UrlMatcher): UrlMatcher {
    this._children.push(url);
    url._cache = {
      path: (this._cache.path || [this]).concat(url),
      parent: this,
      pattern: null,
    };

    return url;
  }

  isRoot() {
    return (this._cache.path || [this])[0] === this;
  }

  /** Returns the input pattern string */
  toString() {
    return this.pattern;
  }

  /**
   * @param {any} value
   * @param {Param} param
   * @returns {any}
   */
  /** @internal */
  _getDecodedParamValue(value: any, param: Param): any {
    return param.value(value);
  }

  /**
   * Tests the specified url/path against this matcher.
   *
   * Tests if the given url matches this matcher's pattern, and returns an object containing the captured
   * parameter values.  Returns null if the path does not match.
   *
   * The returned object contains the values
   * of any search parameters that are mentioned in the pattern, but their value may be null if
   * they are not present in `search`. This means that search parameters are always treated
   * as optional.
   *
   * #### Example:
   * ```js
   * new UrlMatcher('/user/{id}?q&r').exec('/user/bob', {
   *   x: '1', q: 'hello'
   * });
   * // returns { id: 'bob', q: 'hello', r: null }
   * ```
   * @param {string} path The URL path to match, e.g. `$location.getPath()`.
   * @param {any} search URL search parameters, e.g. `$location.getSearch()`.
   * @param {string} hash URL hash e.g. `$location.getHash()`.
   * @returns {RawParams | null} The captured parameter values.
   */
  exec(path: string, search: any = {}, hash: string): RawParams | null {
    const pathMatchers = this._cache.path || [this];

    const match = memoizeTo(this._cache, "pattern", () => {
      return new RegExp(
        [
          "^",
          pathMatchers.flatMap((x) => x._compiled).join(""),
          this.config.strict === false ? "/?" : "",
          "$",
        ].join(""),
        this.config.caseInsensitive ? "i" : undefined,
      );
    }).exec(path);

    if (!match) return null;
    // options = defaults(options, { isolate: false });
    const allParams = this.parameters(),
      pathParams: Param[] = [],
      searchParams: Param[] = [],
      values: Record<string, any> = {};

    let nPathSegments = 0;

    for (let i = 0; i < allParams.length; i++) {
      const param = allParams[i];

      if (param.isSearch()) {
        searchParams.push(param);
      } else {
        pathParams.push(param);
      }
    }

    for (let i = 0; i < pathMatchers.length; i++) {
      nPathSegments += pathMatchers[i]._segments.length - 1;
    }

    if (nPathSegments !== match.length - 1)
      throw new Error(`Unbalanced capture group in route '${this.pattern}'`);
    /**
     * @param {any} paramVal
     */
    function decodePathArray(paramVal: any) {
      const reverseString = (str: string) => str.split("").reverse().join("");

      const unquoteDashes = (str: string) => str.replace(/\\-/g, "-");

      const split = reverseString(paramVal).split(/-(?!\\)/);

      const allReversed = split.map(reverseString);

      return allReversed.map(unquoteDashes).reverse();
    }

    for (let i = 0; i < nPathSegments; i++) {
      const param = pathParams[i];

      if (!param) continue;

      let value = match[i + 1];

      // if the param value matches a pre-replace pair, replace the value before decoding.
      for (let j = 0; j < param.replace.length; j++) {
        if (param.replace[j].from === value) value = param.replace[j].to;
      }

      if (value && param.array === true) value = decodePathArray(value);
      values[param.id] = this._getDecodedParamValue(value, param);
    }

    for (let i = 0; i < searchParams.length; i++) {
      const param = searchParams[i];

      let value = search[param.id];

      for (let j = 0; j < param.replace.length; j++) {
        if (param.replace[j].from === value) value = param.replace[j].to;
      }
      values[param.id] = this._getDecodedParamValue(value, param);
    }

    if (hash) values["#"] = hash;

    return values;
  }

  /**
   * @internal
   * Returns all the [[Param]] objects of all path and search parameters of this pattern in order of appearance.
   *
   * @param {any} [opts]
   * @returns {Array.<Param>}  An array of [[Param]] objects. Must be treated as read-only. If the
   *    pattern has no parameters, an empty array is returned.
   */
  parameters(opts: any = {}): Param[] {
    if (opts.inherit === false) return this._params;

    return (this._cache.path || [this]).flatMap((matcher) => matcher._params);
  }

  /**
   * @internal Returns a single parameter from this UrlMatcher by id
   * @param {string} id
   * @param {any} opts
   * @returns {Param | any | boolean | UrlMatcher | null}
   */
  parameter(id: string, opts: any = {}): Param | null {
    const findParam = () => {
      for (const param of this._params) {
        if (param.id === id) return param;
      }

      return undefined;
    };

    const { parent } = this._cache;

    return (
      findParam() ||
      (opts.inherit !== false && parent && parent.parameter(id, opts)) ||
      null
    );
  }

  /**
   * Validates the input parameter values against this UrlMatcher
   *
   * Checks an object hash of parameters to validate their correctness according to the parameter
   * types of this `UrlMatcher`.
   * @param {RawParams} params The object hash of parameters to validate.
   * @returns {boolean} Returns `true` if `params` validates, otherwise `false`.
   */
  validates(params: RawParams): boolean {
    params = params || {};
    // I'm not sure why this checks only the param keys passed in, and not all the params known to the matcher
    const paramSchema = this.parameters();

    for (let i = 0; i < paramSchema.length; i++) {
      const paramDef = paramSchema[i];

      if (
        hasOwn(params, paramDef.id) &&
        !paramDef.validates(params[paramDef.id])
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Given a set of parameter values, creates a URL from this UrlMatcher.
   *
   * Creates a URL that matches this pattern by substituting the specified values
   * for the path and search parameters.
   *
   * #### Example:
   * ```js
   * new UrlMatcher('/user/{id}?q').format({ id:'bob', q:'yes' });
   * // returns '/user/bob?q=yes'
   * ```
   *
   * @param {RawParams} values  the values to substitute for the parameters in this pattern.
   * @returns the formatted URL (path and optionally search part).
   */
  format(values: RawParams = {} as RawParams) {
    // Build the full path of UrlMatchers (including all parent UrlMatchers)
    const urlMatchers = this._cache.path || [this];

    // Extract all the static segments and Params (processed as ParamDetails)
    // into an ordered array
    const pathSegmentsAndParams = urlMatchers
      .flatMap(UrlMatcher.pathSegmentsAndParams)
      .map((x: string | Param) => (isString(x) ? x : getDetails(x)));

    // Extract the query params into a separate array
    const queryParams = urlMatchers
      .flatMap(UrlMatcher.queryParams)
      .map(getDetails);

    const isInvalid = (param: string | ParamDetails) =>
      !isString(param) && param.isValid === false;

    if (pathSegmentsAndParams.concat(queryParams).filter(isInvalid).length) {
      return null;
    }
    /**
     * Given a Param, applies the parameter value, then returns detailed information about it
     * @param {Param} param
     * @returns {ParamDetails}
     */
    function getDetails(param: Param): ParamDetails {
      // Normalize to typed value
      const value = param.value(values[param.id]);

      const isValid = param.validates(value);

      const isDefaultValue = param.isDefaultValue(value);

      // Check if we're in squash mode for the parameter
      const squash = isDefaultValue ? param.squash : false;

      // Allow the Parameter's Type to encode the value
      const encoded = param.type.encode(value);

      return { param, value, isValid, isDefaultValue, squash, encoded };
    }
    // Build up the path-portion from the list of static segments and parameters
    const pathString: string = pathSegmentsAndParams.reduce(
      (acc: string, x: ParamDetails | string) => {
        // The element is a static segment (a raw string); just append it
        if (isString(x)) return acc + x;
        // Otherwise, it's a ParamDetails.
        const { squash, encoded, param } = x;

        // If squash is === true, try to remove a slash from the path
        if (squash === true) return acc.match(/\/$/) ? acc.slice(0, -1) : acc;

        // If squash is a string, use the string for the param value
        if (isString(squash)) return acc + squash;

        if (squash !== false) return acc; // ?

        if (isNullOrUndefined(encoded)) return acc;

        // If this parameter value is an array, encode the value using encodeDashes
        if (isArray(encoded)) return acc + encoded.map(encodeDashes).join("-");

        // If the parameter type is "raw", then do not encodeURIComponent
        if (param.raw) {
          return acc + encoded;
        }

        // Encode the value
        return acc + encodeURIComponent(encoded);
      },
      "",
    );

    // Build the query string by applying parameter values (array or regular)
    // then mapping to key=value, then flattening and joining using "&"
    const queryString = queryParams
      .flatMap((paramDetails: ParamDetails) => {
        const { param, squash, isDefaultValue } = paramDetails;

        let { encoded } = paramDetails;

        if (isNullOrUndefined(encoded) || (isDefaultValue && squash !== false))
          return undefined;

        if (!isArray(encoded)) encoded = [encoded];

        if (encoded.length === 0) return undefined;

        if (!param.raw) encoded = encoded.map(encodeURIComponent);

        return (encoded as any[]).map((val: any) => `${param.id}=${val}`);
      })
      .join("&");

    // Concat the pathstring with the queryString (if exists) and the hashString (if exists)
    return (
      pathString +
      (queryString ? `?${queryString}` : "") +
      (values["#"] ? `#${values["#"]}` : "")
    );
  }
}

/**
 * @param {string | number | boolean} str
 */
function encodeDashes(str: string | number | boolean) {
  // Replace dashes with encoded "\-"
  return encodeURIComponent(str).replace(
    /-/g,
    (char) => `%5C%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
