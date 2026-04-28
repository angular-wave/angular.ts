import { assign, createObject, isDefined, hasOwn, isInstanceOf, isString, isNullOrUndefined, equals } from '../../shared/utils.js';
import { ParamType } from './param-type.js';

/**
 * A registry for parameter types.
 *
 * This registry manages the built-in (and custom) parameter types.
 *
 * The built-in parameter types are:
 *
 * - [[string]]
 * - [[path]]
 * - [[query]]
 * - [[hash]]
 * - [[int]]
 * - [[bool]]
 * - [[date]]
 * - [[json]]
 * - [[any]]
 *
 * To register custom parameter types, use [[UrlConfig.type]], i.e.,
 *
 * ```js
 * router.urlService.config.type(customType)
 * ```
 */
class ParamTypes {
    /**
     * @param {ng.AngularService} $angular
     */
    constructor($angular) {
        this._angular = $angular;
        this.$injector = $angular.$injector;
        this.enqueue = true;
        this.typeQueue = [];
        const defaultTypeNames = [
            "hash",
            "string",
            "query",
            "path",
            "int",
            "bool",
            "date",
            "json",
            "any",
        ];
        this.defaultTypes = {};
        const defaultParamTypes = {};
        defaultTypeNames.forEach((name) => {
            const definition = ParamTypes.prototype[name];
            this.defaultTypes[name] = definition;
            defaultParamTypes[name] = new ParamType(assign({ name }, definition));
        });
        // Register default types. Store them in the prototype of this.types.
        this.types = createObject(defaultParamTypes);
    }
    type(name, definition, definitionFn) {
        if (!isDefined(definition)) {
            if (this.typeQueue.length && this._getInjector()) {
                this._flushTypeQueue();
            }
            return this.types[name];
        }
        if (hasOwn(this.types, name))
            throw new Error(`A type named '${name}' has already been defined.`);
        this.types[name] = new ParamType(assign({ name }, definition));
        if (definitionFn) {
            this.typeQueue.push({ name, def: definitionFn });
            if (!this.enqueue && this._getInjector())
                this._flushTypeQueue();
        }
        return this;
    }
    /** @internal */
    _flushTypeQueue() {
        const injector = this._getInjector();
        if (!injector) {
            return;
        }
        while (this.typeQueue.length) {
            const type = this.typeQueue.shift();
            if (type.pattern)
                throw new Error("You cannot override a type's .pattern at runtime.");
            assign(this.types[type.name], injector.invoke(type.def));
        }
    }
    /** @internal */
    _getInjector() {
        return (this.$injector || (this.$injector = this._angular.$injector));
    }
}
function initDefaultTypes() {
    const makeDefaultType = (def) => {
        const valToString = (val) => !isNullOrUndefined(val) ? val.toString() : val;
        const defaultTypeBase = {
            encode: (val) => valToString(val),
            decode: (val) => valToString(val),
            is: (val) => isInstanceOf(val, String) || isString(val),
            pattern: /.*/,
            equals: (a, b) => a === b,
        };
        return assign({}, defaultTypeBase, def);
    };
    // Default Parameter Type Definitions
    assign(ParamTypes.prototype, {
        string: makeDefaultType({}),
        path: makeDefaultType({
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
                    this.decode(val.toString()) === val);
            },
            pattern: /-?\d+/,
        }),
        bool: makeDefaultType({
            encode: (val) => ((val && 1) || 0).toString(),
            decode: (val) => parseInt(val, 10) !== 0,
            is: (val) => isInstanceOf(val, Boolean) || typeof val === "boolean",
            pattern: /[01]/,
        }),
        date: makeDefaultType({
            /**
             * @param {{ getFullYear: () => any; getMonth: () => number; getDate: () => any; }} val
             */
            encode(val) {
                return !this.is(val)
                    ? ""
                    : [
                        val.getFullYear(),
                        `0${val.getMonth() + 1}`.slice(-2),
                        `0${val.getDate()}`.slice(-2),
                    ].join("-");
            },
            /**
             * @param {any} val
             */
            decode(val) {
                if (this.is(val))
                    return val;
                const match = this.capture.exec(val);
                return match ? new Date(match[1], match[2] - 1, match[3]) : undefined;
            },
            is: (val) => isInstanceOf(val, Date) && !isNaN(val.valueOf()),
            /**
             * @param {{ [x: string]: () => any; }} left
             * @param {{ [x: string]: () => any; }} right
             */
            equals(left, right) {
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
    });
}
initDefaultTypes();

export { ParamTypes };
