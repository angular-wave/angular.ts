import {
  assign,
  createObject,
  equals,
  hasOwn,
  isDefined,
  isInstanceOf,
  isNullOrUndefined,
  isString,
} from "../../shared/utils.ts";
import { ParamType } from "./param-type.ts";
import type { InjectorService } from "../../core/di/internal-injector.ts";
import type { ParamTypeDefinition } from "./interface.ts";

type ParamTypeDefinitionRecord = ParamTypeDefinition & Record<string, unknown>;

type DefaultParamTypeName =
  | "hash"
  | "string"
  | "query"
  | "path"
  | "int"
  | "bool"
  | "date"
  | "json"
  | "any";
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

  declare hash: ParamTypeDefinitionRecord;
  declare string: ParamTypeDefinitionRecord;
  declare query: ParamTypeDefinitionRecord;
  declare path: ParamTypeDefinitionRecord;
  declare int: ParamTypeDefinitionRecord;
  declare bool: ParamTypeDefinitionRecord;
  declare date: ParamTypeDefinitionRecord;
  declare json: ParamTypeDefinitionRecord;
  declare any: ParamTypeDefinitionRecord;

  defaultTypes: Record<string, ParamTypeDefinitionRecord>;
  types: Record<string, ParamType>;

  /**
   * @param {ng.AngularService} $angular
   */
  constructor($angular: ng.AngularService) {
    this._angular = $angular;
    this.$injector = $angular.$injector;
    this.enqueue = true;
    this.typeQueue = [];
    const defaultTypeNames: DefaultParamTypeName[] = [
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

    const defaultParamTypes: Record<string, ParamType> = {};

    for (let i = 0; i < defaultTypeNames.length; i++) {
      const name = defaultTypeNames[i];

      const definition = this[name];

      this.defaultTypes[name] = definition;
      defaultParamTypes[name] = new ParamType(assign({ name }, definition));
    }

    // Register default types. Store them in the prototype of this.types.
    this.types = createObject(defaultParamTypes) as Record<string, ParamType>;
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
    this.types[name] = new ParamType(assign({ name }, definition));

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

function valToString(val: unknown): string | undefined {
  return !isNullOrUndefined(val) ? val.toString() : undefined;
}

function initDefaultTypes() {
  const makeDefaultType = (
    def: Partial<ParamTypeDefinition> & Record<string, unknown>,
  ): ParamTypeDefinitionRecord => {
    const defaultTypeBase = {
      encode: (val: unknown) => valToString(val),
      decode: (val: string) => valToString(val),
      is: (val: unknown) => isInstanceOf(val, String) || isString(val),
      pattern: /.*/,

      equals: (a: unknown, b: unknown) => a === b,
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
          (this as ParamTypeDefinition).decode?.(val.toString()) === val
        );
      },
      pattern: /-?\d+/,
    }),
    bool: makeDefaultType({
      encode: (val: unknown) => ((val && 1) || 0).toString(),
      decode: (val: string) => parseInt(val, 10) !== 0,
      is: (val: unknown) =>
        isInstanceOf(val, Boolean) || typeof val === "boolean",
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
      decode(val: unknown) {
        if ((this as ParamTypeDefinition).is?.(val)) return val;
        const match = (this as { capture: RegExp }).capture.exec(String(val));

        return match
          ? new Date(
              parseInt(match[1], 10),
              parseInt(match[2], 10) - 1,
              parseInt(match[3], 10),
            )
          : undefined;
      },
      is: (val: unknown) => isInstanceOf(val, Date) && !isNaN(val.valueOf()),
      /**
       * @param {Date} left
       * @param {Date} right
       */
      equals(left, right) {
        if (!isInstanceOf(left, Date) || !isInstanceOf(right, Date)) {
          return false;
        }

        return (
          left.getFullYear() === right.getFullYear() &&
          left.getMonth() === right.getMonth() &&
          left.getDate() === right.getDate()
        );
      },
      pattern: /[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])/,
      capture: /([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/,
    }),
    json: makeDefaultType({
      encode: (x: unknown) => JSON.stringify(x),
      decode: (x: string) => JSON.parse(x),
      is: (val: unknown) => isInstanceOf(val, Object),
      equals,
      pattern: /[^/]*/,
    }),
    // does not encode/decode
    any: makeDefaultType({
      encode: (x: unknown) => x as string,
      decode: (x: string) => x,
      is: () => true,
      equals,
    }),
  });
}
initDefaultTypes();
