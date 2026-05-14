import { assign, equals, isInstanceOf, isNullOrUndefined, stringify, isString } from '../../shared/utils.js';
import { ParamType } from './param-type.js';

function encodePathPart(match) {
    return match === "~" ? "~~" : "~2F";
}
function decodePathPart(match) {
    return match === "~~" ? "~" : "/";
}
function encodePath(value) {
    return !isNullOrUndefined(value)
        ? stringify(value).replace(/([~/])/g, encodePathPart)
        : value;
}
function decodePath(value) {
    return !isNullOrUndefined(value)
        ? stringify(value).replace(/(~~|~2F)/g, decodePathPart)
        : value;
}
function makeDefaultType(def) {
    const defaultTypeBase = {
        is: (val) => isInstanceOf(val, String) || isString(val),
        pattern: /.*/,
        equals: (a, b) => a === b,
    };
    return assign({}, defaultTypeBase, def);
}
/** @internal */
function createDefaultParamTypes() {
    const definitions = {
        string: makeDefaultType({}),
        path: makeDefaultType({
            encode: encodePath,
            decode: decodePath,
            pattern: /[^/]*/,
        }),
        query: makeDefaultType({}),
        hash: makeDefaultType({
            inherit: false,
        }),
        int: makeDefaultType({
            decode: (val) => parseInt(val, 10),
            /**
             * @param {unknown} val
             */
            is(val) {
                return (!isNullOrUndefined(val) &&
                    this.decode?.(stringify(val)) ===
                        val);
            },
            pattern: /-?\d+/,
        }),
        bool: makeDefaultType({
            encode: (val) => (val ? "1" : "0"),
            decode: (val) => parseInt(val, 10) !== 0,
            is: (val) => isInstanceOf(val, Boolean) || typeof val === "boolean",
            pattern: /[01]/,
        }),
        date: makeDefaultType({
            /**
             * @param {{ getFullYear: () => number; getMonth: () => number; getDate: () => number; }} val
             */
            encode(val) {
                if (!isInstanceOf(val, Date) || isNaN(val.valueOf())) {
                    return "";
                }
                return [
                    val.getFullYear(),
                    `0${val.getMonth() + 1}`.slice(-2),
                    `0${val.getDate()}`.slice(-2),
                ].join("-");
            },
            /**
             * @param {unknown} val
             */
            decode(val) {
                if (this.is?.(val))
                    return val;
                const match = this.capture.exec(String(val));
                return match
                    ? new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10))
                    : undefined;
            },
            is: (val) => isInstanceOf(val, Date) && !isNaN(val.valueOf()),
            /**
             * @param {Date} left
             * @param {Date} right
             */
            equals(left, right) {
                if (!isInstanceOf(left, Date) || !isInstanceOf(right, Date)) {
                    return false;
                }
                return (left.getFullYear() === right.getFullYear() &&
                    left.getMonth() === right.getMonth() &&
                    left.getDate() === right.getDate());
            },
            pattern: /[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])/,
            capture: /([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/,
        }),
        json: makeDefaultType({
            encode: (x) => JSON.stringify(x),
            decode: (x) => JSON.parse(x),
            is: (val) => isInstanceOf(val, Object),
            equals,
            pattern: /[^/]*/,
        }),
        // does not encode/decode
        any: makeDefaultType({
            encode: (x) => x,
            decode: (x) => x,
            is: () => true,
            equals,
        }),
    };
    return {
        hash: new ParamType(assign({ name: "hash" }, definitions.hash)),
        string: new ParamType(assign({ name: "string" }, definitions.string)),
        query: new ParamType(assign({ name: "query" }, definitions.query)),
        path: new ParamType(assign({ name: "path" }, definitions.path)),
        int: new ParamType(assign({ name: "int" }, definitions.int)),
        bool: new ParamType(assign({ name: "bool" }, definitions.bool)),
        date: new ParamType(assign({ name: "date" }, definitions.date)),
        json: new ParamType(assign({ name: "json" }, definitions.json)),
        any: new ParamType(assign({ name: "any" }, definitions.any)),
    };
}

export { createDefaultParamTypes };
