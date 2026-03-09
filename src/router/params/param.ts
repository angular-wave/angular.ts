import { allTrueR, filter, find, map } from "../../shared/common.ts";
import { isInjectable } from "../../shared/predicates.ts";
import {
  isArray,
  isDefined,
  isNullOrUndefined,
  isString,
  isUndefined,
} from "../../shared/utils.ts";
import { ParamType } from "./param-type.ts";
import type { ParamTypes } from "./param-types.ts";
import type { UrlConfigProvider } from "../url/url-config.ts";

/**
 * Parameter values
 *
 * An object containing state parameter key/value pairs
 *
 * #### Example:
 * ```js
 * {
 *   userId: 353474,
 *   folderId: 'inbox'
 * }
 * ```
 */
export interface RawParams {
  [key: string]: any;
}

/**
 * Configuration for a single Parameter
 *
 * In a [[StateDeclaration.params]], each `ParamDeclaration`
 * defines how a single State Parameter should work.
 */
export interface ParamDeclaration {
  value?: any;
  type?: string | ParamType;
  array?: boolean;
  squash?: boolean | string;
  replace?: Replace[];
  isOptional?: boolean;
  dynamic?: boolean;
  raw?: boolean;
  inherit?: boolean;
  _fn?: any;
}

/**
 * String replacement
 *
 * Represents an exact match string replacement.
 *
 * Note: `to` or `from` may be null or undefined, and will be tested using `===`.
 */
export interface Replace {
  /**
   * The value to replace.
   *
   * May be `null` or `undefined`.
   * The entire value must match using `===`.
   * When found, the [[to]] value is used instead.
   */
  from: string;

  /**
   * The new value
   *
   * Used instead of the [[from]] value.
   */
  to: string | undefined;
}

type DefTypeValue = (typeof DefType)[keyof typeof DefType];

const isShorthand = (cfg: ParamDeclaration | any): boolean =>
  ["value", "type", "squash", "array", "dynamic"].filter(
    Object.prototype.hasOwnProperty.bind(cfg || {}),
  ).length === 0;

export const DefType = {
  _PATH: 0,
  _SEARCH: 1,
  _CONFIG: 2,
} as const;

/** Resolves the parameter declaration for one state parameter name/location pair. */
function getParamDeclaration(
  paramName: string,
  location: DefTypeValue,
  state: ng.StateDeclaration,
): ParamDeclaration {
  const noReloadOnSearch =
    (state.reloadOnSearch === false && location === DefType._SEARCH) ||
    undefined;

  const dynamic = find([state.dynamic, noReloadOnSearch], isDefined);

  const defaultConfig = isDefined(dynamic) ? { dynamic } : {};

  const paramConfig = unwrapShorthand(state?.params?.[paramName]);

  return Object.assign(defaultConfig, paramConfig);
}

/** Normalizes shorthand parameter config into a full ParamDeclaration object. */
function unwrapShorthand(cfg: ParamDeclaration | any): ParamDeclaration {
  cfg = isShorthand(cfg) ? { value: cfg } : cfg;
  getStaticDefaultValue._cacheable = true;
  function getStaticDefaultValue() {
    return cfg.value;
  }
  const _fn = isInjectable(cfg.value) ? cfg.value : getStaticDefaultValue;

  return Object.assign(cfg, { _fn });
}

/** Resolves the effective parameter type from config, URL hints, and registered types. */
function getType(
  cfg: ParamDeclaration,
  urlType: ParamType | null,
  location: DefTypeValue,
  id: string,
  paramTypes: ParamTypes,
): ParamType {
  if (cfg.type && urlType && urlType.name !== "string")
    throw new Error(`Param '${id}' has two type configurations.`);

  if (
    cfg.type &&
    urlType &&
    urlType.name === "string" &&
    typeof cfg.type === "string" &&
    paramTypes.type(cfg.type)
  )
    return paramTypes.type(cfg.type) as ParamType;

  if (urlType) return urlType;

  if (!cfg.type) {
    const type =
      location === DefType._CONFIG
        ? "any"
        : location === DefType._PATH
          ? "path"
          : location === DefType._SEARCH
            ? "query"
            : "string";

    return paramTypes.type(type) as ParamType;
  }

  return cfg.type instanceof ParamType
    ? cfg.type
    : (paramTypes.type(cfg.type as string) as ParamType);
}

/** Returns the squash policy to use for the parameter's default value handling. */
function getSquashPolicy(
  config: ParamDeclaration,
  isOptional: boolean,
  defaultPolicy: boolean | string,
): boolean | string {
  const { squash } = config;

  if (!isOptional || squash === false) return false;

  if (!isDefined(squash) || isNullOrUndefined(squash)) return defaultPolicy;

  if (squash === true || isString(squash)) return squash;
  throw new Error(
    `Invalid squash policy: '${squash}'. Valid policies: false, true, or arbitrary string`,
  );
}

/** Builds the replacement table applied before encoding or after decoding a value. */
function getReplace(
  config: ParamDeclaration,
  arrayMode: boolean | "auto",
  isOptional: boolean,
  squash: string | boolean,
): Replace[] {
  const defaultPolicy = [
    { from: "", to: isOptional || arrayMode ? undefined : "" },
    { from: null, to: isOptional || arrayMode ? undefined : "" },
  ];

  const replace = isArray(config.replace) ? config.replace : [];

  if (isString(squash)) replace.push({ from: squash, to: undefined });

  const configuredKeys = map(replace, (x: Replace) => x.from) as string[];

  return (
    filter(
      defaultPolicy,
      (item) => configuredKeys.indexOf(item.from as string) === -1,
    ) as Replace[]
  ).concat(replace);
}

export class Param {
  isOptional: boolean;
  type: ParamType;
  location: DefTypeValue;
  id: string;
  dynamic: boolean;
  raw: boolean;
  squash: string | boolean;
  replace: Replace[];
  inherit: boolean;
  array: boolean | "auto";
  config: ParamDeclaration;
  matchingKeys: RawParams | undefined;
  _defaultValueCache?: { defaultValue: any };

  /** Creates one Param definition from the state declaration and URL config. */
  constructor(
    id: string,
    type: ParamType | null,
    location: DefTypeValue,
    urlConfig: UrlConfigProvider,
    state: ng.StateDeclaration,
  ) {
    const config = getParamDeclaration(id, location, state);

    type = getType(config, type, location, id, urlConfig.paramTypes);
    const arrayMode = getArrayMode();

    type = arrayMode
      ? type && type.$asArray(arrayMode, location === DefType._SEARCH)
      : type;
    const isOptional =
      config.value !== undefined || location === DefType._SEARCH;

    const dynamic = !!config.dynamic;

    const raw = !!config.raw;

    const squash = getSquashPolicy(
      config,
      isOptional,
      urlConfig.defaultSquashPolicy(),
    );

    const replace = getReplace(config, arrayMode, isOptional, squash);

    const inherit = isDefined(config.inherit)
      ? !!config.inherit
      : !!type.inherit;

    // array config: param name (param[]) overrides default settings.  explicit config overrides param name.
    function getArrayMode(): boolean | "auto" {
      const arrayDefaults = {
        array: location === DefType._SEARCH ? "auto" : false,
      };

      const arrayParamNomenclature = id.match(/\[\]$/) ? { array: true } : {};

      return Object.assign(arrayDefaults, arrayParamNomenclature, config).array;
    }
    this.isOptional = isOptional;
    this.type = type;
    this.location = location;
    this.id = id;
    this.dynamic = dynamic;
    this.raw = raw;
    this.squash = squash;
    this.replace = replace;
    this.inherit = inherit;
    this.array = arrayMode;
    this.config = config;
    this.matchingKeys = undefined;
  }

  /** Returns true when the provided value is this parameter's default value. */
  isDefaultValue(value: any): boolean {
    return this.isOptional && this.type.equals(this.value(), value);
  }

  /**
   * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
   * default value, which may be the result of an injectable function.
   */
  value(value?: any): any {
    /**
     * [Internal] Get the default value of a parameter, which may be an injectable function.
     */
    const getDefaultValue = () => {
      if (this._defaultValueCache) return this._defaultValueCache.defaultValue;

      if (!window.angular.$injector)
        throw new Error(
          "Injectable functions cannot be called at configuration time",
        );
      const defaultValue = window.angular.$injector.invoke(this.config._fn);

      if (
        defaultValue !== null &&
        defaultValue !== undefined &&
        !this.type.is(defaultValue)
      )
        throw new Error(
          `Default value (${defaultValue}) for parameter '${this.id}' is not an instance of ParamType (${this.type.name})`,
        );

      if (this.config._fn._cacheable) {
        this._defaultValueCache = { defaultValue };
      }

      return defaultValue;
    };

    const replaceSpecialValues = (val: any) => {
      for (const tuple of this.replace) {
        if (tuple.from === val) return tuple.to;
      }

      return val;
    };

    value = replaceSpecialValues(value);

    return isUndefined(value) ? getDefaultValue() : this.type.$normalize(value);
  }

  isSearch(): boolean {
    return this.location === DefType._SEARCH;
  }

  /** Returns true when the value validates against this parameter's type. */
  validates(value: any): boolean {
    // There was no parameter value, but the param is optional
    if ((isUndefined(value) || value === null) && this.isOptional) return true;
    // The value was not of the correct ParamType, and could not be decoded to the correct ParamType
    const normalized = this.type.$normalize(value);

    if (!this.type.is(normalized)) return false;
    // The value was of the correct type, but when encoded, did not match the ParamType's regexp
    const encoded = normalized; // this.type.encode(normalized);

    return !(isString(encoded) && !this.type.pattern.exec(encoded));
  }

  toString() {
    return `{Param:${this.id} ${this.type} squash: '${this.squash}' optional: ${this.isOptional}}`;
  }

  /** Returns normalized values for the provided params from a raw value map. */
  static values(params: Param[], values: Record<string, any> = {}): RawParams {
    const paramValues: RawParams = {};

    for (const param of params) {
      paramValues[param.id] = param.value(values[param.id]);
    }

    return paramValues;
  }

  /**
   * Finds [[Param]] objects which have different param values
   *
   * Filters a list of [[Param]] objects to only those whose parameter values differ in two param value objects.
   * @param params - The list of [[Param]] objects to filter.
   * @param values1 - The first set of parameter values.
   * @param values2 - The second set of parameter values.
   * @returns Any [[Param]] objects whose values differ between `values1` and `values2`.
   */
  static changed(
    params: Param[],
    values1: Record<string, any> = {},
    values2: Record<string, any> = {},
  ): Param[] {
    return params.filter(
      (param) => !param.type.equals(values1[param.id], values2[param.id]),
    );
  }

  /**
   * Checks if two param value objects are equal for a set of [[Param]] objects.
   * @param params - The list of [[Param]] objects to check.
   * @param values1 - The first set of param values.
   * @param values2 - The second set of param values.
   * @returns `true` if the param values in `values1` and `values2` are equal.
   */
  static equals(
    params: Param[],
    values1: Record<string, any> = {},
    values2: Record<string, any> = {},
  ): boolean {
    return Param.changed(params, values1, values2).length === 0;
  }

  /**
   * Returns true if a the parameter values are valid, according to the Param definitions
   * Validates a full parameter value map against the provided Param definitions.
   */
  static validates(params: Param[], values: Record<string, any> = {}): boolean {
    return params
      .map((param: Param) => param.validates(values[param.id]))
      .reduce(allTrueR, true);
  }
}
