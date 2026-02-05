import { equals, inherit, map, pick } from "../../shared/common.js";
import { hasOwn, isDefined, isNullOrUndefined } from "../../shared/utils.js";
import { is } from "../../shared/hof.js";
import { ParamType } from "./param-type.js";
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
export class ParamTypes {
  /**
   * @param {ng.AngularService} $angular
   */
  constructor($angular) {
    this.$injector = $angular.$injector;
    this.enqueue = true;
    /**
     * @type {{ name: any; def: any; }[]}
     */
    this.typeQueue = [];
    this.defaultTypes = pick(ParamTypes.prototype, [
      "hash",
      "string",
      "query",
      "path",
      "int",
      "bool",
      "date",
      "json",
      "any",
    ]);
    // Register default types. Store them in the prototype of this.types.
    const makeType = (/** @type {any} */ definition, /** @type {any} */ name) =>
      new ParamType(Object.assign({ name }, definition));

    /**
     * @type {Record<string, any>}
     */
    this.types = inherit(map(this.defaultTypes, makeType), {});
  }

  /**
   * Registers a parameter type
   *
   * End users should call [[UrlMatcherFactory.type]], which delegates to this method.
   * @param {string} name
   * @param {import("./interface.ts").ParamTypeDefinition} [definition]
   * @param {() => import("../params/interface.ts").ParamTypeDefinition} [definitionFn]
   */
  type(name, definition, definitionFn) {
    if (!isDefined(definition)) return this.types[name];

    if (hasOwn(this.types, name))
      throw new Error(`A type named '${name}' has already been defined.`);
    this.types[/** @type {string} */ (name)] = new ParamType(
      Object.assign({ name }, definition),
    );

    if (definitionFn) {
      this.typeQueue.push({ name, def: definitionFn });

      if (!this.enqueue) this._flushTypeQueue();
    }

    return this;
  }

  _flushTypeQueue() {
    while (this.typeQueue.length) {
      const type = /** @type {any} */ (this.typeQueue.shift());

      if (type.pattern)
        throw new Error("You cannot override a type's .pattern at runtime.");
      Object.assign(this.types[type.name], this.$injector.invoke(type.def));
    }
  }
}
function initDefaultTypes() {
  const makeDefaultType = /** @param {any} def */ (def) => {
    const valToString = (/** @type {any} */ val) =>
      !isNullOrUndefined(val) ? val.toString() : val;

    const defaultTypeBase = {
      encode: valToString,
      decode: valToString,
      is: is(String),
      pattern: /.*/,

      equals: (/** @type {any} */ a, /** @type {any} */ b) => a === b, // allow coersion for null/undefined/""
    };

    return Object.assign({}, defaultTypeBase, def);
  };

  // Default Parameter Type Definitions
  Object.assign(ParamTypes.prototype, {
    string: makeDefaultType({}),
    path: makeDefaultType({
      pattern: /[^/]*/,
    }),
    query: makeDefaultType({}),
    hash: makeDefaultType({
      inherit: false,
    }),
    int: makeDefaultType({
      decode: (/** @type {string} */ val) => parseInt(val, 10),
      /**
       * @param {unknown} val
       */
      is(val) {
        return !isNullOrUndefined(val) && this.decode(val.toString()) === val;
      },
      pattern: /-?\d+/,
    }),
    bool: makeDefaultType({
      encode: (/** @type {any} */ val) => (val && 1) || 0,
      decode: (/** @type {string} */ val) => parseInt(val, 10) !== 0,
      is: is(Boolean),
      pattern: /[01]/,
    }),
    date: makeDefaultType({
      /**
       * @param {{ getFullYear: () => any; getMonth: () => number; getDate: () => any; }} val
       */
      encode(val) {
        return !this.is(val)
          ? undefined
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
        if (this.is(val)) return val;
        const match = this.capture.exec(val);

        return match ? new Date(match[1], match[2] - 1, match[3]) : undefined;
      },
      is: (/** @type {any} */ val) =>
        val instanceof Date && !isNaN(val.valueOf()),
      /**
       * @param {{ [x: string]: () => any; }} left
       * @param {{ [x: string]: () => any; }} right
       */
      equals(left, right) {
        return ["getFullYear", "getMonth", "getDate"].reduce(
          (acc, fn) => acc && left[fn]() === right[fn](),
          true,
        );
      },
      pattern: /[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])/,
      capture: /([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/,
    }),
    json: makeDefaultType({
      encode: JSON.stringify,
      decode: JSON.parse,
      is: is(Object),
      equals,
      pattern: /[^/]*/,
    }),
    // does not encode/decode
    any: makeDefaultType({
      encode: (/** @type {any} */ x) => x,
      decode: (/** @type {any} */ x) => x,
      is: () => true,
      equals,
    }),
  });
}
initDefaultTypes();
