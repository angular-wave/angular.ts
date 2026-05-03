import { isInjectable } from '../../shared/predicates.js';
import { isDefined, isUndefined, isString, hasOwn, isInstanceOf, isNullOrUndefined, isArray } from '../../shared/utils.js';
import { ParamType } from './param-type.js';

const SHORTHAND_KEYS = ["value", "type", "squash", "array", "dynamic"];
function isShorthand(cfg) {
    const config = (cfg || {});
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
const DefType = {
    _PATH: 0,
    _SEARCH: 1,
    _CONFIG: 2,
};
/**
 * @param {string} paramName
 * @param {DefType} location
 * @param {ng.StateDeclaration} state
 * @return {ParamDeclaration}
 */
function getParamDeclaration(paramName, location, state) {
    const { dynamic } = state;
    const paramConfig = unwrapShorthand(state?.params?.[paramName]);
    if (isDefined(dynamic) && !hasOwn(paramConfig, "dynamic")) {
        paramConfig.dynamic = dynamic;
    }
    return paramConfig;
}
/**
 * @param {ParamDeclaration} cfg
 * @return {ParamDeclaration}
 */
function unwrapShorthand(cfg) {
    cfg = isShorthand(cfg) ? { value: cfg } : cfg;
    const getStaticDefaultValue = () => {
        return cfg.value;
    };
    getStaticDefaultValue._cacheable = true;
    const paramConfig = cfg;
    const _fn = isInjectable(paramConfig.value)
        ? paramConfig.value
        : getStaticDefaultValue;
    paramConfig._fn = _fn;
    return paramConfig;
}
/**
 * @param {ParamDeclaration} cfg
 * @param {ParamType | null} urlType
 * @param {DefType} location
 * @param {string} id
 * @param {ParamTypeMap} paramTypes
 */
function getType(cfg, urlType, location, id, paramTypes) {
    if (cfg.type && urlType && urlType.name !== "string")
        throw new Error(`Param '${id}' has two type configurations.`);
    if (cfg.type &&
        urlType &&
        urlType.name === "string" &&
        isString(cfg.type) &&
        paramTypes[cfg.type])
        return paramTypes[cfg.type];
    if (urlType)
        return urlType;
    if (!cfg.type) {
        const type = location === DefType._CONFIG
            ? "any"
            : location === DefType._PATH
                ? "path"
                : location === DefType._SEARCH
                    ? "query"
                    : "string";
        return paramTypes[type];
    }
    return isInstanceOf(cfg.type, ParamType)
        ? cfg.type
        : paramTypes[cfg.type];
}
/**
 * returns false, true, or the squash value to indicate the "default parameter url squash policy".
 * @param {ParamDeclaration} config
 * @param {boolean} isOptional
 * @param {boolean | string} defaultPolicy
 */
function getSquashPolicy(config, isOptional, defaultPolicy) {
    const { squash } = config;
    if (!isOptional || squash === false)
        return false;
    if (!isDefined(squash) || isNullOrUndefined(squash))
        return defaultPolicy;
    if (squash === true || isString(squash))
        return squash;
    throw new Error(`Invalid squash policy: '${squash}'. Valid policies: false, true, or arbitrary string`);
}
/**
 * @param {ParamDeclaration} config
 * @param {boolean} arrayMode
 * @param {boolean} isOptional
 * @param {string | boolean} squash
 */
function getReplace(config, arrayMode, isOptional, squash) {
    const replace = isArray(config.replace) ? config.replace : [];
    const result = [];
    let hasEmptyReplace = false;
    let hasNullReplace = false;
    for (let i = 0; i < replace.length; i++) {
        const item = replace[i];
        if (item.from === "") {
            hasEmptyReplace = true;
        }
        else if (item.from === null) {
            hasNullReplace = true;
        }
    }
    const defaultReplacement = isOptional || arrayMode ? undefined : "";
    if (!hasEmptyReplace)
        result.push({ from: "", to: defaultReplacement });
    if (!hasNullReplace) {
        result.push({ from: null, to: defaultReplacement });
    }
    for (let i = 0; i < replace.length; i++) {
        const item = replace[i];
        result.push(item);
    }
    if (isString(squash))
        result.push({ from: squash, to: undefined });
    return result;
}
function getArrayMode(id, location, config) {
    if (location !== DefType._SEARCH)
        return false;
    if (isDefined(config.array))
        return config.array;
    return id.endsWith("[]") ? true : "auto";
}
class Param {
    /**
     *
     * @param {string} id
     * @param {ParamType | null} type
     * @param {DefType} location
     * @param {UrlParamConfig} urlConfig
     * @param {ParamRuntime} runtime
     * @param {ng.StateDeclaration} state
     */
    constructor(id, type, location, urlConfig, runtime, state) {
        const config = getParamDeclaration(id, location, state);
        type = getType(config, type, location, id, urlConfig._paramTypes);
        const arrayMode = getArrayMode(id, location, config);
        type = arrayMode ? type && type.$asArray(arrayMode) : type;
        const isOptional = config.value !== undefined || location === DefType._SEARCH;
        const dynamic = !!config.dynamic;
        const raw = !!config.raw;
        const squash = getSquashPolicy(config, isOptional, urlConfig._getDefaultSquashPolicy());
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
        this._runtime = runtime;
    }
    /**
     * @param {unknown} value
     */
    isDefaultValue(value) {
        return this.isOptional && this.type.equals(this.value(), value);
    }
    /**
     * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
     * default value, which may be the result of an injectable function.
     * @param {undefined} [value]
     */
    value(value) {
        for (let i = 0; i < this.replace.length; i++) {
            const tuple = this.replace[i];
            if (tuple.from === value) {
                value = tuple.to;
                break;
            }
        }
        return isUndefined(value)
            ? this._getDefaultValue()
            : this.type.$normalize(value);
    }
    /** @internal */
    _getDefaultValue() {
        if (this._defaultValueCache)
            return this._defaultValueCache.defaultValue;
        const injector = this._runtime._injector;
        if (!injector)
            throw new Error("Injectable functions cannot be called at configuration time");
        const defaultValueProvider = this.config._fn;
        const defaultValue = defaultValueProvider
            ? injector.invoke(defaultValueProvider)
            : undefined;
        if (defaultValue !== null &&
            defaultValue !== undefined &&
            !this.type.is(defaultValue))
            throw new Error(`Default value (${defaultValue}) for parameter '${this.id}' is not an instance of ParamType (${this.type.name})`);
        if (defaultValueProvider && "_cacheable" in defaultValueProvider) {
            this._defaultValueCache = { defaultValue };
        }
        return defaultValue;
    }
    /**
     * @param {null} value
     */
    validates(value) {
        // There was no parameter value, but the param is optional
        if ((isUndefined(value) || value === null) && this.isOptional)
            return true;
        // The value was not of the correct ParamType, and could not be decoded to the correct ParamType
        const normalized = this.type.$normalize(value);
        if (!this.type.is(normalized))
            return false;
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
    static values(params, values = {}) {
        const paramValues = {};
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
    static changed(params, values1 = {}, values2 = {}) {
        const changed = [];
        params.forEach((param) => {
            if (!param.type.equals(values1[param.id], values2[param.id])) {
                changed.push(param);
            }
        });
        return changed;
    }
    /**
     * Checks if two param value objects are equal (for a set of [[Param]] objects)
     * @param {Param[]} params The list of [[Param]] objects to check
     * @param values1 The first set of param values
     * @param values2 The second set of param values
     * @returns true if the param values in values1 and values2 are equal
     */
    static equals(params, values1 = {}, values2 = {}) {
        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            if (!param.type.equals(values1[param.id], values2[param.id])) {
                return false;
            }
        }
        return true;
    }
    /**
     * Returns true if a the parameter values are valid, according to the Param definitions
     * @param {Param[]} params
     * @param {RawParams} values
     * @return {boolean}
     */
    static validates(params, values = {}) {
        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            if (!param.validates(values[param.id])) {
                return false;
            }
        }
        return true;
    }
}

export { DefType, Param };
