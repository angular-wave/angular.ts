import {
  inherit,
  isArray,
  isNullOrUndefined,
  isString,
} from "../../shared/utils.ts";
import { DefType, Param } from "../params/param.ts";
import type { ParamFactory } from "../params/param-factory.ts";
import type { ParamType } from "../params/param-type.ts";
import type { ParamTypeMap } from "../params/param-types.ts";
import type { RawParams } from "../params/interface.ts";
import type { StateDeclaration } from "../state/interface.ts";

const PARAM_NAME_VALIDATOR = /^\w+([-.]+\w+)*(?:\[\])?$/;

const MAX_REGEX_LENGTH = 200;

const PLACEHOLDER_REGEXP = new RegExp(
  `([:*])([\\w[\\]]+)|\\{([\\w[\\]]+)(?::\\s*((?:[^{}\\\\]{1,${
    MAX_REGEX_LENGTH
  }}|\\\\.|\\{(?:[^{}\\\\]{1,${MAX_REGEX_LENGTH}}|\\\\.)*\\})+))?\\}`,
  "g",
);

const SEARCH_PLACEHOLDER_REGEXP = new RegExp(
  `([:]?)([\\w[\\].-]+)|\\{([\\w[\\].-]+)(?::\\s*((?:[^{}\\\\]{1,${
    MAX_REGEX_LENGTH
  }}|\\\\.|\\{(?:[^{}\\\\]{1,${MAX_REGEX_LENGTH}}|\\\\.)*\\})+))?\\}`,
  "g",
);

/** @internal */
export interface UrlMatcherCompileConfig {
  state?: StateDeclaration;
  strict?: boolean;
  caseInsensitive?: boolean;
}

interface UrlMatcherCache {
  _weights?: number[];
  _path?: UrlMatcher[];
  _parent?: UrlMatcher;
  _pattern?: RegExp | null;
}

function quoteRegExp(str: string, param?: Param): string {
  let result = str.replace(/[\\[\]^$*+?.()|{}]/g, "\\$&");

  if (!param) return result;

  switch (param.squash) {
    case false:
      return `${result}(${param.type.pattern.source})${
        param.isOptional ? "?" : ""
      }`;
    case true:
      result = result.replace(/\/$/, "");

      return `${result}(?:/(${param.type.pattern.source})|/)?`;
    default:
      return `${result}(${param.squash}|${param.type.pattern.source})?`;
  }
}

function pushStaticSegmentWeights(weights: number[], segment: string): void {
  if (!segment) return;

  let inStaticSegment = false;

  for (let i = 0; i < segment.length; i++) {
    if (segment.charAt(i) === "/") {
      if (inStaticSegment) weights.push(2);
      weights.push(1);
      inStaticSegment = false;
      continue;
    }

    inStaticSegment = true;
  }

  if (inStaticSegment) weights.push(2);
}

function getMatcherWeights(matcher: UrlMatcher): number[] {
  if (matcher._cache._weights) return matcher._cache._weights as number[];

  const path = matcher._cache._path || [matcher];

  const weights: number[] = [];

  let staticSegment = "";

  for (let i = 0; i < path.length; i++) {
    const pathMatcher = path[i];

    let paramIndex = 0;

    for (let j = 0; j < pathMatcher._segments.length; j++) {
      staticSegment += pathMatcher._segments[j];

      while (paramIndex < pathMatcher._params.length) {
        const param = pathMatcher._params[paramIndex++];

        if (param.location !== DefType._PATH) continue;
        pushStaticSegmentWeights(weights, staticSegment);
        staticSegment = "";
        weights.push(3);
        break;
      }
    }
  }

  pushStaticSegmentWeights(weights, staticSegment);

  return (matcher._cache._weights = weights);
}

function appendPathParam(
  path: string,
  param: Param,
  values: RawParams,
): string | null {
  if (isArray(values[param.id])) return null;

  const value = param.value(values[param.id]);

  if (!param.validates(value)) return null;

  const isDefaultValue = param.isDefaultValue(value);

  const squash = isDefaultValue ? param.squash : false;

  const encoded = param.type.encode(value) as string | string[];

  if (squash === true) return path.endsWith("/") ? path.slice(0, -1) : path;

  if (isString(squash)) return path + squash;

  if (squash !== false || isNullOrUndefined(encoded)) return path;

  if (isArray(encoded)) return null;

  return path + (param.raw ? encoded : encodeURIComponent(encoded));
}

function appendQueryParam(
  queryParts: Array<string | undefined>,
  param: Param,
  values: RawParams,
): boolean {
  const value = param.value(values[param.id]);

  if (!param.validates(value)) return false;

  const isDefaultValue = param.isDefaultValue(value);

  let encoded = param.type.encode(value) as string | string[];

  if (
    isNullOrUndefined(encoded) ||
    (isDefaultValue && param.squash !== false)
  ) {
    queryParts.push(undefined);

    return true;
  }

  if (!isArray(encoded)) encoded = [encoded];

  if (encoded.length === 0) {
    queryParts.push(undefined);

    return true;
  }

  for (let i = 0; i < encoded.length; i++) {
    const encodedValue = param.raw
      ? encoded[i]
      : encodeURIComponent(encoded[i]);

    queryParts.push(`${param.id}=${encodedValue}`);
  }

  return true;
}

function appendMatcherPath(
  path: string,
  matcher: UrlMatcher,
  values: RawParams,
): string | null {
  let paramIndex = 0;

  for (let i = 0; i < matcher._segments.length; i++) {
    path += matcher._segments[i];

    while (paramIndex < matcher._params.length) {
      const param = matcher._params[paramIndex++];

      if (param.location !== DefType._PATH) continue;
      const nextPath = appendPathParam(path, param, values);

      if (nextPath === null) return null;
      path = nextPath;
      break;
    }
  }

  return path;
}

function appendMatcherQueryParams(
  queryParts: Array<string | undefined>,
  matcher: UrlMatcher,
  values: RawParams,
): boolean {
  for (let i = 0; i < matcher._params.length; i++) {
    const param = matcher._params[i];

    if (param.location !== DefType._SEARCH) continue;

    if (!appendQueryParam(queryParts, param, values)) return false;
  }

  return true;
}

function formatUrl(matchers: UrlMatcher[], values: RawParams): string | null {
  let path: string | null = "";

  const queryParts: Array<string | undefined> = [];

  for (let i = 0; i < matchers.length; i++) {
    path = appendMatcherPath(path, matchers[i], values);

    if (path === null) return null;

    if (!appendMatcherQueryParams(queryParts, matchers[i], values)) return null;
  }

  const query = queryParts.join("&");

  return (
    path + (query ? `?${query}` : "") + (values["#"] ? `#${values["#"]}` : "")
  );
}

function getPatternRegExp(matcher: UrlMatcher, pathMatchers: UrlMatcher[]) {
  if (matcher._cache._pattern) return matcher._cache._pattern;

  let compiled = "";

  for (let i = 0; i < pathMatchers.length; i++) {
    compiled += pathMatchers[i]._compiled;
  }

  return (matcher._cache._pattern = new RegExp(
    `^${compiled}${matcher._config.strict === false ? "/?" : ""}$`,
    matcher._config.caseInsensitive ? "i" : undefined,
  ));
}

function checkParamErrors(id: string, pattern: string, params: Param[]): void {
  if (!PARAM_NAME_VALIDATOR.test(id))
    throw new Error(`Invalid parameter name '${id}' in pattern '${pattern}'`);

  for (let i = 0; i < params.length; i++) {
    if (params[i].id === id) {
      throw new Error(
        `Duplicate parameter name '${id}' in pattern '${pattern}'`,
      );
    }
  }
}

/** @internal */
export function compareUrlMatchers(a: UrlMatcher, b: UrlMatcher): number {
  const weightsA = getMatcherWeights(a);

  const weightsB = getMatcherWeights(b);

  const length = Math.max(weightsA.length, weightsB.length);

  for (let i = 0; i < length; i++) {
    const cmp = (weightsA[i] || 0) - (weightsB[i] || 0);

    if (cmp !== 0) return cmp;
  }

  return 0;
}

function makeRegexpType(
  defaultType: ParamType,
  str: string,
  caseInsensitive?: boolean,
): ParamType {
  return inherit(defaultType, {
    pattern: new RegExp(str, caseInsensitive ? "i" : undefined),
  }) as ParamType;
}

function getParamType(
  pattern: string,
  match: RegExpExecArray,
  isSearch: boolean,
  paramTypes: ParamTypeMap,
  config: UrlMatcherCompileConfig,
): ParamType {
  const defaultType = paramTypes[isSearch ? "query" : "path"];

  const regexp = isSearch
    ? match[4]
    : match[4] || (match[1] === "*" ? "[\\s\\S]*" : null);

  if (!defaultType) {
    throw new Error(
      `Missing default parameter type for '${isSearch ? "query" : "path"}'`,
    );
  }

  return !regexp
    ? defaultType
    : (paramTypes[regexp] as ParamType | undefined) ||
        makeRegexpType(defaultType, regexp, config.caseInsensitive);
}

/**
 * @internal
 *
 * Matches URLs against patterns.
 *
 * Matches URLs against patterns and extracts named parameters from the path or the search
 * part of the URL.
 *
 * A URL pattern consists of a path pattern, optionally followed by '?' and a list of search (query)
 * parameters. Multiple search parameter names are separated by '&'. Search parameters
 * do not influence whether or not a URL is matched, but their values are passed through into
 * the matched parameters returned by `UrlMatcher`.
 *
 * - *Path parameters* are defined using curly brace placeholders (`/somepath/{param}`)
 * or colon placeholders (`/somePath/:param`).
 *
 * - *A parameter RegExp* may be defined for a param after a colon
 * (`/somePath/{param:[a-zA-Z0-9]+}`) in a curly brace placeholder.
 * The regexp must match for the url to be matched.
 * Should the regexp itself contain curly braces, they must be in matched pairs or escaped with a backslash.
 *
 * Note: a RegExp parameter will encode its value using either the built-in `path` or `query` type.
 *
 * - *Built-in parameter types* may also be specified after a colon (`/somePath/{param:int}`) in curly brace parameters.
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
  /** @internal */
  _cache: UrlMatcherCache;
  /** @internal */
  _params: Param[];
  /** @internal */
  _segments: string[];
  /** @internal */
  _compiled: string;
  /** @internal */
  _config: UrlMatcherCompileConfig;
  /** @internal */
  _pattern: string;
  /**
   * @param {string} pattern The pattern to compile into a matcher.
   * @param {ParamTypeMap} paramTypes The built-in parameter type map
   * @param {ParamFactory} paramFactory A [[ParamFactory]] object
   * @param {UrlMatcherCompileConfig} config A [[UrlMatcherCompileConfig]] configuration object
   */
  constructor(
    pattern: string,
    paramTypes: ParamTypeMap,
    paramFactory: ParamFactory,
    config: UrlMatcherCompileConfig,
  ) {
    this._cache = {
      _path: [this],
    };

    this._params = [];

    this._segments = [];

    this._compiled = "";
    this._config = config;
    this._pattern = pattern;
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

    let last = 0;

    let matchArray;

    let segment: string;

    PLACEHOLDER_REGEXP.lastIndex = 0;
    SEARCH_PLACEHOLDER_REGEXP.lastIndex = 0;

    while ((matchArray = PLACEHOLDER_REGEXP.exec(pattern))) {
      const id = matchArray[2] || matchArray[3];

      const paramType = getParamType(
        pattern,
        matchArray,
        false,
        paramTypes,
        config,
      );

      const pathSegment = pattern.substring(last, matchArray.index);

      if (pathSegment.indexOf("?") >= 0) break; // we're into the search part
      checkParamErrors(id, pattern, this._params);
      this._params.push(
        paramFactory.fromPath(
          id,
          paramType,
          config.state as ng.StateDeclaration,
        ),
      );
      this._segments.push(pathSegment);
      this._compiled += quoteRegExp(
        pathSegment,
        this._params[this._params.length - 1],
      );
      last = PLACEHOLDER_REGEXP.lastIndex;
    }
    segment = pattern.substring(last);
    // Find any search parameter names and remove them from the last segment
    const i = segment.indexOf("?");

    if (i >= 0) {
      const search = segment.substring(i);

      segment = segment.substring(0, i);

      if (search.length > 0) {
        last = 0;

        while ((matchArray = SEARCH_PLACEHOLDER_REGEXP.exec(search))) {
          const id = matchArray[2] || matchArray[3];

          const paramType = getParamType(
            pattern,
            matchArray,
            true,
            paramTypes,
            config,
          );

          checkParamErrors(id, pattern, this._params);
          this._params.push(
            paramFactory.fromSearch(
              id,
              paramType,
              config.state as ng.StateDeclaration,
            ),
          );
          last = SEARCH_PLACEHOLDER_REGEXP.lastIndex;
          // check if ?&
        }
      }
    }
    this._segments.push(segment);

    this._compiled += quoteRegExp(segment);
  }

  /**
   * Creates a new concatenated UrlMatcher
   *
   * Builds a new UrlMatcher by appending another UrlMatcher to this one.
   *
   * @param {UrlMatcher} url A `UrlMatcher` instance to append as a child of the current `UrlMatcher`.
   * @returns {UrlMatcher} A new `UrlMatcher` instance representing the concatenation of this `UrlMatcher` and the provided `url` matcher.
   */
  /** @internal */
  _append(url: UrlMatcher): UrlMatcher {
    url._cache = {
      _path: (this._cache._path || [this]).concat(url),
      _parent: this,
      _pattern: null,
    };

    return url;
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
   * new UrlMatcher('/user/{id}?q&r')._exec('/user/bob', {
   *   x: '1', q: 'hello'
   * });
   * // returns { id: 'bob', q: 'hello', r: null }
   * ```
   * @param {string} path The URL path to match, e.g. `$location.getPath()`.
   * @param {RawParams} search URL search parameters, e.g. `$location.getSearch()`.
   * @param {string} hash URL hash e.g. `$location.getHash()`.
   * @returns {RawParams | null} The captured parameter values.
   */
  /** @internal */
  _exec(path: string, search: RawParams = {}, hash: string): RawParams | null {
    const pathMatchers = this._cache._path || [this];

    const match = getPatternRegExp(this, pathMatchers).exec(path);

    if (!match) return null;
    const values: RawParams = {};

    let nPathSegments = 0;

    for (let i = 0; i < pathMatchers.length; i++) {
      nPathSegments += pathMatchers[i]._segments.length - 1;
    }

    if (nPathSegments !== match.length - 1)
      throw new Error(`Unbalanced capture group in route '${this._pattern}'`);

    let pathMatchIndex = 1;

    for (let i = 0; i < pathMatchers.length; i++) {
      const matcherParams = pathMatchers[i]._params;

      for (let j = 0; j < matcherParams.length; j++) {
        const param = matcherParams[j];

        if (param.location !== DefType._PATH) continue;
        const value = param.value(match[pathMatchIndex++]);

        if (!param.validates(value)) return null;
        values[param.id] = value;
      }
    }

    for (let i = 0; i < pathMatchers.length; i++) {
      const matcherParams = pathMatchers[i]._params;

      for (let j = 0; j < matcherParams.length; j++) {
        const param = matcherParams[j];

        if (param.location !== DefType._SEARCH) continue;
        const value = param.value(search[param.id]);

        if (!param.validates(value)) return null;
        values[param.id] = value;
      }
    }

    if (hash) values["#"] = hash;

    return values;
  }

  /**
   * @internal Returns a single parameter from this UrlMatcher by id
   * @param {string} id
   * @param {{ inherit?: boolean }} opts
   * @returns {Param | null}
   */
  _parameter(id: string, opts?: { inherit?: boolean }): Param | null {
    let matcher: UrlMatcher | undefined = this;

    while (matcher) {
      for (let i = 0; i < matcher._params.length; i++) {
        const param = matcher._params[i];

        if (param.id === id) return param;
      }

      matcher = opts?.inherit !== false ? matcher._cache._parent : undefined;
    }

    return null;
  }

  /**
   * Given a set of parameter values, creates a URL from this UrlMatcher.
   *
   * Creates a URL that matches this pattern by substituting the specified values
   * for the path and search parameters.
   *
   * #### Example:
   * ```js
   * new UrlMatcher('/user/{id}?q')._format({ id:'bob', q:'yes' });
   * // returns '/user/bob?q=yes'
   * ```
   *
   * @param {RawParams} values  the values to substitute for the parameters in this pattern.
   * @returns the formatted URL (path and optionally search part).
   */
  /** @internal */
  _format(values: RawParams = {} as RawParams) {
    return formatUrl(this._cache._path || [this], values);
  }
}
