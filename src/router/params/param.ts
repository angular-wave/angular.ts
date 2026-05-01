import { isInjectable } from "../../shared/predicates.ts";
import {
  assign,
  hasOwn,
  isArray,
  isDefined,
  isInstanceOf,
  isNullOrUndefined,
  isUndefined,
  isString,
} from "../../shared/utils.ts";
import { ParamType } from "./param-type.ts";
import type {
  ParamDeclaration,
  ParamDefaultValueFactory,
  RawParams,
  Replace,
} from "./interface.ts";
import type { ParamTypes } from "./param-types.ts";
import type { UrlConfigProvider } from "../url/url-config.ts";

type DefTypeValue = (typeof DefType)[keyof typeof DefType];

const SHORTHAND_KEYS = ["value", "type", "squash", "array", "dynamic"];

function isShorthand(cfg: unknown): boolean {
  const config = (cfg || {}) as Record<string, unknown>;

  for (let i = 0; i < SHORTHAND_KEYS.length; i++) {
    if (hasOwn(config, SHORTHAND_KEYS[i])) {
      return false;
    }
  }

  return true;
}

/**
 * @enum {number}
 */
export const DefType = {
  _PATH: 0,
  _SEARCH: 1,
  _CONFIG: 2,
} as const;

/**
 * @param {string} paramName
 * @param {DefType} location
 * @param {ng.StateDeclaration} state
 * @return {ParamDeclaration}
 */
function getParamDeclaration(
  paramName: string,
  location: DefTypeValue,
  state: ng.StateDeclaration,
): ParamDeclaration {
  const { dynamic } = state;

  const defaultConfig = isDefined(dynamic) ? { dynamic } : {};

  const paramConfig = unwrapShorthand(state?.params?.[paramName]);

  return assign(defaultConfig, paramConfig);
}

/**
 * @param {ParamDeclaration} cfg
 * @return {ParamDeclaration}
 */
function unwrapShorthand(cfg: unknown): ParamDeclaration {
  cfg = isShorthand(cfg) ? { value: cfg } : cfg;

  const getStaticDefaultValue: ParamDefaultValueFactory = () => {
    return (cfg as ParamDeclaration).value;
  };

  getStaticDefaultValue._cacheable = true;

  const paramConfig = cfg as ParamDeclaration;

  const _fn = isInjectable(paramConfig.value)
    ? paramConfig.value
    : getStaticDefaultValue;

  return assign(paramConfig, { _fn });
}

/**
 * @param {ParamDeclaration} cfg
 * @param {ParamType | null} urlType
 * @param {DefType} location
 * @param {string} id
 * @param {ParamTypes} paramTypes
 */
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
    isString(cfg.type) &&
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

  return isInstanceOf(cfg.type, ParamType)
    ? cfg.type
    : (paramTypes.type(cfg.type as string) as ParamType);
}

/**
 * returns false, true, or the squash value to indicate the "default parameter url squash policy".
 * @param {ParamDeclaration} config
 * @param {boolean} isOptional
 * @param {boolean | string} defaultPolicy
 */
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

/**
 * @param {ParamDeclaration} config
 * @param {boolean} arrayMode
 * @param {boolean} isOptional
 * @param {string | boolean} squash
 */
function getReplace(
  config: ParamDeclaration,
  arrayMode: boolean | "auto",
  isOptional: boolean,
  squash: string | boolean,
): Replace[] {
  const defaultPolicy = [
    { from: "", to: isOptional || arrayMode ? undefined : "" },
    { from: null, to: isOptional || arrayMode ? undefined : "" },
  ] as Replace[];

  const replace = isArray(config.replace) ? config.replace : [];

  if (isString(squash)) replace.push({ from: squash, to: undefined });

  const configuredKeys: Array<string | null> = [];

  for (let i = 0; i < replace.length; i++) {
    configuredKeys.push(replace[i].from);
  }

  const result: Replace[] = [];

  for (let i = 0; i < defaultPolicy.length; i++) {
    const item = defaultPolicy[i];

    if (configuredKeys.indexOf(item.from) === -1) {
      result.push(item);
    }
  }

  for (let i = 0; i < replace.length; i++) {
    result.push(replace[i]);
  }

  return result;
}

function getArrayMode(
  id: string,
  location: DefTypeValue,
  config: ParamDeclaration,
): boolean | "auto" {
  const arrayDefaults = {
    array: location === DefType._SEARCH ? "auto" : false,
  };

  const arrayParamNomenclature = id.match(/\[\]$/) ? { array: true } : {};

  return assign(arrayDefaults, arrayParamNomenclature, config).array;
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
  /** @internal */
  _defaultValueCache?: { defaultValue: unknown };
  /** @internal */
  _paramTypes: ParamTypes;

  /**
   *
   * @param {string} id
   * @param {ParamType | null} type
   * @param {DefType} location
   * @param {UrlConfigProvider} urlConfig
   * @param {ng.StateDeclaration} state
   */
  constructor(
    id: string,
    type: ParamType | null,
    location: DefTypeValue,
    urlConfig: UrlConfigProvider,
    state: ng.StateDeclaration,
  ) {
    const config = getParamDeclaration(id, location, state);

    type = getType(config, type, location, id, urlConfig.paramTypes);
    const arrayMode = getArrayMode(id, location, config);

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
    this._paramTypes = urlConfig.paramTypes;
  }

  /**
   * @param {unknown} value
   */
  isDefaultValue(value: unknown): boolean {
    return this.isOptional && this.type.equals(this.value(), value);
  }

  /**
   * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
   * default value, which may be the result of an injectable function.
   * @param {undefined} [value]
   */
  value(value?: unknown): unknown {
    value = this._replaceSpecialValues(value);

    return isUndefined(value)
      ? this._getDefaultValue()
      : this.type.$normalize(value);
  }

  /** @internal */
  _getDefaultValue(): unknown {
    if (this._defaultValueCache) return this._defaultValueCache.defaultValue;

    const injector = this._paramTypes._getInjector();

    if (!injector)
      throw new Error(
        "Injectable functions cannot be called at configuration time",
      );

    const defaultValueProvider = this.config._fn;

    const defaultValue = defaultValueProvider
      ? injector.invoke(defaultValueProvider)
      : undefined;

    if (
      defaultValue !== null &&
      defaultValue !== undefined &&
      !this.type.is(defaultValue)
    )
      throw new Error(
        `Default value (${defaultValue}) for parameter '${this.id}' is not an instance of ParamType (${this.type.name})`,
      );

    if (defaultValueProvider && "_cacheable" in defaultValueProvider) {
      this._defaultValueCache = { defaultValue };
    }

    return defaultValue;
  }

  /** @internal */
  _replaceSpecialValues(value: unknown): unknown {
    for (let i = 0; i < this.replace.length; i++) {
      const tuple = this.replace[i];

      if (tuple.from === value) return tuple.to;
    }

    return value;
  }

  isSearch(): boolean {
    return this.location === DefType._SEARCH;
  }

  /**
   * @param {null} value
   */
  validates(value: unknown): boolean {
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

  /**
   * @param {Param[]} params
   * @param {RawParams} values
   * @return {RawParams}
   */
  static values(params: Param[], values: RawParams = {}): RawParams {
    const paramValues: RawParams = {};

    for (const param of params) {
      paramValues[param.id] = param.value(values[param.id]);
    }

    return paramValues;
  }

  /**
   * Finds [[Param]] objects which have different param values
   *
   * Filters a list of [[Param]] objects to only those whose parameter values differ in two param value objects
   * @param {Param[]} params : The list of Param objects to filter
   * @param {RawParams} values1 : The first set of parameter values
   * @param {RawParams} values2 : the second set of parameter values
   * @returns {Param[]} any Param objects whose values were different between values1 and values2
   */
  static changed(
    params: Param[],
    values1: RawParams = {},
    values2: RawParams = {},
  ): Param[] {
    const changed: Param[] = [];

    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      if (!param.type.equals(values1[param.id], values2[param.id])) {
        changed.push(param);
      }
    }

    return changed;
  }

  /**
   * Checks if two param value objects are equal (for a set of [[Param]] objects)
   * @param {Param[]} params The list of [[Param]] objects to check
   * @param values1 The first set of param values
   * @param values2 The second set of param values
   * @returns true if the param values in values1 and values2 are equal
   */
  static equals(
    params: Param[],
    values1: RawParams = {},
    values2: RawParams = {},
  ): boolean {
    return Param.changed(params, values1, values2).length === 0;
  }

  /**
   * Returns true if a the parameter values are valid, according to the Param definitions
   * @param {Param[]} params
   * @param {RawParams} values
   * @return {boolean}
   */
  static validates(params: Param[], values: RawParams = {}): boolean {
    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      if (!param.validates(values[param.id])) {
        return false;
      }
    }

    return true;
  }
}
