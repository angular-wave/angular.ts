import { equals, inherit, map, pick } from "../../shared/common.ts";
import {
  assign,
  hasOwn,
  isDefined,
  isNullOrUndefined,
} from "../../shared/utils.ts";
import { is } from "../../shared/hof.ts";
import { ParamType } from "./param-type.ts";
import type { InjectorService } from "../../core/di/internal-injector.ts";
import type { ParamTypeDefinition } from "./interface.ts";
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
  /** @internal */
  _angular: ng.AngularService;
  $injector: InjectorService;
  enqueue: boolean;
  typeQueue: {
    name: string;
    def: () => ParamTypeDefinition;
    pattern?: unknown;
  }[];

  defaultTypes: Record<string, ParamTypeDefinition & Record<string, any>>;
  types: Record<string, ParamType>;

  /**
   * @param {ng.AngularService} $angular
   */
  constructor($angular: ng.AngularService) {
    this._angular = $angular;
    this.$injector = $angular.$injector;
    this.enqueue = true;
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
    ]) as Record<string, ParamTypeDefinition & Record<string, any>>;
    // Register default types. Store them in the prototype of this.types.
    const makeType = (definition: ParamTypeDefinition, name: string | number) =>
      new ParamType(assign({ name }, definition));

    this.types = inherit(map(this.defaultTypes, makeType), {}) as Record<
      string,
      ParamType
    >;
  }

  /**
   * Registers a parameter type
   *
   * End users should call [[UrlMatcherFactory.type]], which delegates to this method.
   * @param {string} name
   * @param {ParamTypeDefinition} [definition]
   * @param {() => ParamTypeDefinition} [definitionFn]
   */
  type(name: string): ParamType | undefined;
  type(
    name: string,
    definition: ParamTypeDefinition,
    definitionFn?: () => ParamTypeDefinition,
  ): ParamTypes;

  type(
    name: string,
    definition?: ParamTypeDefinition,
    definitionFn?: () => ParamTypeDefinition,
  ): ParamTypes | ParamType | undefined {
    if (!isDefined(definition)) {
      if (this.typeQueue.length && this._getInjector()) {
        this._flushTypeQueue();
      }

      return this.types[name];
    }

    if (hasOwn(this.types, name))
      throw new Error(`A type named '${name}' has already been defined.`);
    this.types[name as string] = new ParamType(assign({ name }, definition));

    if (definitionFn) {
      this.typeQueue.push({ name, def: definitionFn });

      if (!this.enqueue && this._getInjector()) this._flushTypeQueue();
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
      const type = this.typeQueue.shift() as {
        name: string;
        def: () => ParamTypeDefinition;
        pattern?: unknown;
      };

      if (type.pattern)
        throw new Error("You cannot override a type's .pattern at runtime.");
      assign(this.types[type.name], injector.invoke(type.def));
    }
  }

  /** @internal */
  _getInjector(): InjectorService | undefined {
    return (this.$injector ||= this._angular.$injector);
  }
}
function initDefaultTypes() {
  const makeDefaultType = (
    def: Partial<ParamTypeDefinition> & Record<string, any>,
  ): ParamTypeDefinition & Record<string, any> => {
    const valToString = (val: any) =>
      !isNullOrUndefined(val) ? val.toString() : val;

    const defaultTypeBase = {
      encode: (val: any) => valToString(val),
      decode: (val: string) => valToString(val),
      is: is(String),
      pattern: /.*/,

      equals: (a: any, b: any) => a === b,
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
      decode: (val: string) => parseInt(val, 10),
      /**
       * @param {unknown} val
       */
      is(val) {
        return (
          !isNullOrUndefined(val) &&
          (this as any).decode(val.toString()) === val
        );
      },
      pattern: /-?\d+/,
    }),
    bool: makeDefaultType({
      encode: (val: any) => ((val && 1) || 0).toString(),
      decode: (val: string) => parseInt(val, 10) !== 0,
      is: is(Boolean),
      pattern: /[01]/,
    }),
    date: makeDefaultType({
      /**
       * @param {{ getFullYear: () => any; getMonth: () => number; getDate: () => any; }} val
       */
      encode(val) {
        return !(this as any).is(val)
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
      decode(val: any) {
        if ((this as any).is(val)) return val;
        const match = (this as any).capture.exec(val);

        return match ? new Date(match[1], match[2] - 1, match[3]) : undefined;
      },
      is: (val: any) => val instanceof Date && !isNaN(val.valueOf()),
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
      encode: (x: any) => JSON.stringify(x),
      decode: (x: string) => JSON.parse(x),
      is: is(Object),
      equals,
      pattern: /[^/]*/,
    }),
    // does not encode/decode
    any: makeDefaultType({
      encode: (x: any) => x,
      decode: (x: any) => x,
      is: () => true,
      equals,
    }),
  });
}
initDefaultTypes();
