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
import type {
  ParamDetails,
  UrlMatcherCache,
  UrlMatcherCompileConfig,
} from "./interface.ts";
import type { ParamFactory } from "../params/param-factory.ts";
import type { ParamType } from "../params/param-type.ts";
import type { ParamTypes } from "../params/param-types.ts";
import type { RawParams } from "../params/interface.ts";

function quoteRegExp(str: string, param?: Param): string {
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

const defaultConfig = {
  state: { params: {} },
  strict: true,
  caseInsensitive: true,
};

function getMatcherSegments(matcher: UrlMatcher): Array<string | Param> {
  if (matcher._cache.segments) return matcher._cache.segments;

  const path = matcher._cache.path || [matcher];

  const joinedSegments: Array<string | Param> = [];

  for (let i = 0; i < path.length; i++) {
    const matcherSegments = UrlMatcher.pathSegmentsAndParams(path[i]);

    for (let j = 0; j < matcherSegments.length; j++) {
      const segment = matcherSegments[j] as string | Param;

      const lastIdx = joinedSegments.length - 1;

      const last = joinedSegments[lastIdx];

      if (isString(last) && isString(segment)) {
        joinedSegments[lastIdx] = last + segment;
      } else {
        joinedSegments.push(segment);
      }
    }
  }

  const segments: Array<string | Param> = [];

  for (let i = 0; i < joinedSegments.length; i++) {
    const segment = joinedSegments[i];

    if (!isString(segment)) {
      segments.push(segment);
      continue;
    }

    const split = segment.split(/(\/)/g);

    for (let j = 0; j < split.length; j++) {
      if (split[j]) segments.push(split[j]);
    }
  }

  return (matcher._cache.segments = segments);
}

function getMatcherWeights(matcher: UrlMatcher): number[] {
  if (matcher._cache.weights) return matcher._cache.weights as number[];

  const segments = getMatcherSegments(matcher);

  const weights = new Array(segments.length);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    weights[i] =
      segment === "/"
        ? 1
        : isString(segment)
          ? 2
          : isInstanceOf(segment, Param)
            ? 3
            : 0;
  }

  return (matcher._cache.weights = weights);
}

function padArrays(left: number[], right: number[], padVal: number): void {
  const len = Math.max(left.length, right.length);

  while (left.length < len) left.push(padVal);

  while (right.length < len) right.push(padVal);
}

function reverseString(str: string): string {
  return str.split("").reverse().join("");
}

function unquoteDashes(str: string): string {
  return str.replace(/\\-/g, "-");
}

function decodePathArray(paramVal: string): string[] {
  const split = reverseString(paramVal).split(/-(?!\\)/);

  const allReversed = new Array(split.length);

  for (let i = 0; i < split.length; i++) {
    allReversed[i] = reverseString(split[i]);
  }

  for (let i = 0; i < allReversed.length; i++) {
    allReversed[i] = unquoteDashes(allReversed[i]);
  }

  return allReversed.reverse();
}

function getParamDetails(param: Param, values: RawParams): ParamDetails {
  const value = param.value(values[param.id]);

  const isValid = param.validates(value);

  const isDefaultValue = param.isDefaultValue(value);

  const squash = isDefaultValue ? param.squash : false;

  const encoded = param.type.encode(value) as string | string[];

  return { param, value, isValid, isDefaultValue, squash, encoded };
}

function isInvalidParam(param: string | ParamDetails): boolean {
  return !isString(param) && param.isValid === false;
}

function hasInvalidParams(params: Array<string | ParamDetails>): boolean {
  for (let i = 0; i < params.length; i++) {
    if (isInvalidParam(params[i])) return true;
  }

  return false;
}

function getPatternRegExp(matcher: UrlMatcher, pathMatchers: UrlMatcher[]) {
  if (matcher._cache.pattern) return matcher._cache.pattern;

  const compiled: string[] = [];

  for (let i = 0; i < pathMatchers.length; i++) {
    const matcherCompiled = pathMatchers[i]._compiled;

    for (let j = 0; j < matcherCompiled.length; j++) {
      compiled.push(matcherCompiled[j]);
    }
  }

  return (matcher._cache.pattern = new RegExp(
    [
      "^",
      compiled.join(""),
      matcher.config.strict === false ? "/?" : "",
      "$",
    ].join(""),
    matcher.config.caseInsensitive ? "i" : undefined,
  ));
}

function buildFormattedPathSegments(
  matchers: UrlMatcher[],
  values: RawParams,
): Array<string | ParamDetails> {
  const segments: Array<string | ParamDetails> = [];

  for (let i = 0; i < matchers.length; i++) {
    const matcherSegments = UrlMatcher.pathSegmentsAndParams(matchers[i]);

    for (let j = 0; j < matcherSegments.length; j++) {
      const segment = matcherSegments[j] as string | Param;

      segments.push(
        isString(segment) ? segment : getParamDetails(segment, values),
      );
    }
  }

  return segments;
}

function buildFormattedQueryParams(
  matchers: UrlMatcher[],
  values: RawParams,
): ParamDetails[] {
  const queryParams: ParamDetails[] = [];

  for (let i = 0; i < matchers.length; i++) {
    const params = UrlMatcher.queryParams(matchers[i]);

    for (let j = 0; j < params.length; j++) {
      queryParams.push(getParamDetails(params[j], values));
    }
  }

  return queryParams;
}

function buildPathString(pathSegmentsAndParams: Array<string | ParamDetails>) {
  let path = "";

  for (let i = 0; i < pathSegmentsAndParams.length; i++) {
    const segment = pathSegmentsAndParams[i];

    if (isString(segment)) {
      path += segment;
      continue;
    }

    const { squash, encoded, param } = segment;

    if (squash === true) {
      path = path.match(/\/$/) ? path.slice(0, -1) : path;
      continue;
    }

    if (isString(squash)) {
      path += squash;
      continue;
    }

    if (squash !== false || isNullOrUndefined(encoded)) {
      continue;
    }

    if (isArray(encoded)) {
      const encodedParts = new Array(encoded.length);

      for (let j = 0; j < encoded.length; j++) {
        encodedParts[j] = encodeDashes(encoded[j]);
      }

      path += encodedParts.join("-");
      continue;
    }

    path += param.raw ? encoded : encodeURIComponent(encoded);
  }

  return path;
}

function buildQueryString(queryParams: ParamDetails[]): string {
  const queryParts: Array<string | undefined> = [];

  for (let i = 0; i < queryParams.length; i++) {
    const { param, squash, isDefaultValue } = queryParams[i];

    let { encoded } = queryParams[i];

    if (isNullOrUndefined(encoded) || (isDefaultValue && squash !== false)) {
      queryParts.push(undefined);
      continue;
    }

    if (!isArray(encoded)) encoded = [encoded];

    if (encoded.length === 0) {
      queryParts.push(undefined);
      continue;
    }

    for (let j = 0; j < encoded.length; j++) {
      const value = param.raw ? encoded[j] : encodeURIComponent(encoded[j]);

      queryParts.push(`${param.id}=${value}`);
    }
  }

  return queryParts.join("&");
}

function checkParamErrors(id: string, pattern: string, params: Param[]): void {
  if (!UrlMatcher.nameValidator.test(id))
    throw new Error(`Invalid parameter name '${id}' in pattern '${pattern}'`);

  for (let i = 0; i < params.length; i++) {
    if (params[i].id === id) {
      throw new Error(
        `Duplicate parameter name '${id}' in pattern '${pattern}'`,
      );
    }
  }
}

function makeRegexpType(
  defaultType: ParamType,
  str: string | RegExp,
  caseInsensitive?: boolean,
): ParamType {
  return inherit(defaultType, {
    pattern: new RegExp(str, caseInsensitive ? "i" : undefined),
  }) as ParamType;
}

function getMatchDetails(
  pattern: string,
  last: number,
  match: RegExpExecArray,
  isSearch: boolean,
  paramTypes: ParamTypes,
  config: UrlMatcherCompileConfig,
): {
  id: string;
  regexp: string | null;
  segment: string;
  type: ParamType;
} {
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

  return {
    id,
    regexp,
    segment: pattern.substring(last, match.index),
    type: !regexp
      ? defaultType
      : (paramTypes.type(regexp) as ParamType | undefined) ||
        makeRegexpType(defaultType, regexp, config.caseInsensitive),
  };
}

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
  _children: UrlMatcher[];
  /** @internal */
  _params: Param[];
  /** @internal */
  _segments: string[];
  /** @internal */
  _compiled: string[];
  config: UrlMatcherCompileConfig;
  pattern: string;
  /**
   * @internal Given a matcher, return an array with the matcher's path segments and path params, in order
   * @param {UrlMatcher} matcher
   */
  static pathSegmentsAndParams(matcher: UrlMatcher): Array<string | Param> {
    const staticSegments = matcher._segments;

    const pathParams: Param[] = [];

    for (let i = 0; i < matcher._params.length; i++) {
      const param = matcher._params[i];

      if (param.location === DefType._PATH) {
        pathParams.push(param);
      }
    }

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
    const queryParams: Param[] = [];

    for (let i = 0; i < matcher._params.length; i++) {
      const param = matcher._params[i];

      if (param.location === DefType._SEARCH) {
        queryParams.push(param);
      }
    }

    return queryParams;
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
    const weightsA = getMatcherWeights(a),
      weightsB = getMatcherWeights(b);

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

    const patterns: Array<[string, Param]> = [];

    let last = 0;

    let matchArray;

    let details: {
      id: string;
      regexp: string | null;
      segment: string;
      type: ParamType;
    };

    let segment: string;

    while ((matchArray = placeholder.exec(pattern))) {
      details = getMatchDetails(
        pattern,
        last,
        matchArray,
        false,
        paramTypes,
        config,
      );

      if (details.segment.indexOf("?") >= 0) break; // we're into the search part
      checkParamErrors(details.id, pattern, this._params);
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
          details = getMatchDetails(
            pattern,
            last,
            matchArray,
            true,
            paramTypes,
            config,
          );
          checkParamErrors(details.id, pattern, this._params);
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
    this._compiled = [];

    for (let j = 0; j < patterns.length; j++) {
      const item = patterns[j];

      this._compiled.push(quoteRegExp(item[0], item[1]));
    }

    this._compiled.push(quoteRegExp(segment));
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
   * @param {unknown} value
   * @param {Param} param
   * @returns {unknown}
   */
  /** @internal */
  _getDecodedParamValue(value: unknown, param: Param): unknown {
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
   * @param {RawParams} search URL search parameters, e.g. `$location.getSearch()`.
   * @param {string} hash URL hash e.g. `$location.getHash()`.
   * @returns {RawParams | null} The captured parameter values.
   */
  exec(path: string, search: RawParams = {}, hash: string): RawParams | null {
    const pathMatchers = this._cache.path || [this];

    const match = getPatternRegExp(this, pathMatchers).exec(path);

    if (!match) return null;
    // options = defaults(options, { isolate: false });
    const allParams = this.parameters(),
      pathParams: Param[] = [],
      searchParams: Param[] = [],
      values: RawParams = {};

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

    for (let i = 0; i < nPathSegments; i++) {
      const param = pathParams[i];

      if (!param) continue;

      let value: unknown = match[i + 1];

      // if the param value matches a pre-replace pair, replace the value before decoding.
      for (let j = 0; j < param.replace.length; j++) {
        if (param.replace[j].from === value) value = param.replace[j].to;
      }

      if (isString(value) && param.array === true)
        value = decodePathArray(value);
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
   * @param {{ inherit?: boolean }} [opts]
   * @returns {Array.<Param>}  An array of [[Param]] objects. Must be treated as read-only. If the
   *    pattern has no parameters, an empty array is returned.
   */
  parameters(opts: { inherit?: boolean } = {}): Param[] {
    if (opts.inherit === false) return this._params;

    const path = this._cache.path || [this];

    const params: Param[] = [];

    for (let i = 0; i < path.length; i++) {
      const matcherParams = path[i]._params;

      for (let j = 0; j < matcherParams.length; j++) {
        params.push(matcherParams[j]);
      }
    }

    return params;
  }

  /**
   * @internal Returns a single parameter from this UrlMatcher by id
   * @param {string} id
   * @param {{ inherit?: boolean }} opts
   * @returns {Param | null}
   */
  parameter(id: string, opts: { inherit?: boolean } = {}): Param | null {
    const { parent } = this._cache;

    for (let i = 0; i < this._params.length; i++) {
      const param = this._params[i];

      if (param.id === id) return param;
    }

    return opts.inherit !== false && parent ? parent.parameter(id, opts) : null;
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

    const pathSegmentsAndParams = buildFormattedPathSegments(
      urlMatchers,
      values,
    );

    const queryParams = buildFormattedQueryParams(urlMatchers, values);

    if (
      hasInvalidParams(pathSegmentsAndParams) ||
      hasInvalidParams(queryParams)
    ) {
      return null;
    }

    const pathString = buildPathString(pathSegmentsAndParams);

    const queryString = buildQueryString(queryParams);

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
