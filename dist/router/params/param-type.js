import { assign, isNullOrUndefined, isArray, isDefined } from '../../shared/utils.js';

const emptyParamTypeDefinition = {};
function valToString(val) {
    return !isNullOrUndefined(val) ? val.toString() : undefined;
}
/**
 * An internal class which implements [[ParamTypeDefinition]].
 *
 * Used internally when matching or formatting URLs, or comparing and validating parameter values.
 */
class ParamType {
    constructor(def) {
        this.pattern = /.*/;
        this.inherit = true;
        assign(this, def);
    }
    // consider these four methods to be "abstract methods" that should be overridden
    /**
     * @param {unknown} val
     */
    is(val) {
        return !!val;
    }
    /**
     * @param {unknown} val
     */
    encode(val) {
        return valToString(val);
    }
    /**
     * @param {unknown} val
     */
    decode(val) {
        return valToString(val);
    }
    /**
     * @param {unknown} a
     * @param {unknown} b
     */
    equals(a, b) {
        return a === b;
    }
    toString() {
        return `{ParamType:${this.name}}`;
    }
    /**
     * Given an encoded string, or a decoded object, returns a decoded object
     * @param {unknown} val
     */
    $normalize(val) {
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
     */
    $asArray(mode) {
        if (!mode)
            return this;
        return new ArrayParamType(this, mode);
    }
}
/**
 * Wraps up a `ParamType` object to handle array values.
 * @param {ParamType & Record<string, unknown>} type
 * @param {boolean | 'auto'} mode
 */
class ArrayParamType extends ParamType {
    constructor(type, mode) {
        super(emptyParamTypeDefinition);
        delete this.is;
        delete this.encode;
        delete this.decode;
        delete this.equals;
        this._type = type;
        this._arrayMode = mode;
        this.dynamic = type.dynamic;
        this.name = type.name;
        this.pattern = type.pattern;
        this.inherit = type.inherit;
        this.raw = type.raw;
        this.$arrayMode = mode;
    }
    /** @internal */
    _arrayWrap(val) {
        return isArray(val) ? val : isDefined(val) ? [val] : [];
    }
    /** @internal */
    _arrayUnwrap(val) {
        switch (val.length) {
            case 0:
                return undefined;
            case 1:
                return this._arrayMode === "auto" ? val[0] : val;
            default:
                return val;
        }
    }
    /** @internal */
    _mapArray(method, val, allTruthyMode = false) {
        if (isArray(val) && val.length === 0)
            return val;
        const arr = this._arrayWrap(val);
        const type = this._type;
        if (allTruthyMode) {
            for (let i = 0; i < arr.length; i++) {
                if (!type[method](arr[i]))
                    return false;
            }
            return true;
        }
        const result = [];
        arr.forEach((item) => {
            result.push(type[method](item));
        });
        return this._arrayUnwrap(result);
    }
    encode(val) {
        return this._mapArray("encode", val);
    }
    decode(val) {
        return this._mapArray("decode", val);
    }
    $normalize(val) {
        return this._mapArray("$normalize", val);
    }
    is(val) {
        return this._mapArray("is", val, true);
    }
    equals(val1, val2) {
        const left = this._arrayWrap(val1);
        const right = this._arrayWrap(val2);
        if (left.length !== right.length)
            return false;
        const { _type: type } = this;
        for (let i = 0; i < left.length; i++) {
            if (!type.equals(left[i], right[i]))
                return false;
        }
        return true;
    }
}

export { ParamType };
