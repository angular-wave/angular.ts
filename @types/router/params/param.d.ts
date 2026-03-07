import { ParamType } from "./param-type.ts";
import type { ParamDeclaration, RawParams, Replace } from "./interface.ts";
import type { UrlConfigProvider } from "../url/url-config.ts";
type DefTypeValue = (typeof DefType)[keyof typeof DefType];
/**
 * @enum {number}
 */
export declare const DefType: {
  readonly _PATH: 0;
  readonly _SEARCH: 1;
  readonly _CONFIG: 2;
};
export declare class Param {
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
  _defaultValueCache?: {
    defaultValue: any;
  };
  /**
   *
   * @param {string} id
   * @param {ParamType | null} type
   * @param {DefType} location
   * @param {import("../url/url-config.js").UrlConfigProvider} urlConfig
   * @param {ng.StateDeclaration} state
   */
  constructor(
    id: string,
    type: ParamType | null,
    location: DefTypeValue,
    urlConfig: UrlConfigProvider,
    state: ng.StateDeclaration,
  );
  /**
   * @param {any} value
   */
  isDefaultValue(value: any): boolean;
  /**
   * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
   * default value, which may be the result of an injectable function.
   * @param {undefined} [value]
   */
  value(value?: any): any;
  isSearch(): boolean;
  /**
   * @param {null} value
   */
  validates(value: any): boolean;
  toString(): string;
  /**
   * @param {Param[]} params
   * @param {Record<string, any>} values
   * @return {import("./interface.ts").RawParams}
   */
  static values(params: Param[], values?: Record<string, any>): RawParams;
  /**
   * Finds [[Param]] objects which have different param values
   *
   * Filters a list of [[Param]] objects to only those whose parameter values differ in two param value objects
   * @param {Param[]} params : The list of Param objects to filter
   * @param {Record<string, any>} values1 : The first set of parameter values
   * @param {Record<string, any>} values2 : the second set of parameter values
   * @returns {Param[]} any Param objects whose values were different between values1 and values2
   */
  static changed(
    params: Param[],
    values1?: Record<string, any>,
    values2?: Record<string, any>,
  ): Param[];
  /**
   * Checks if two param value objects are equal (for a set of [[Param]] objects)
   * @param {any[]} params The list of [[Param]] objects to check
   * @param values1 The first set of param values
   * @param values2 The second set of param values
   * @returns true if the param values in values1 and values2 are equal
   */
  static equals(
    params: Param[],
    values1?: Record<string, any>,
    values2?: Record<string, any>,
  ): boolean;
  /**
   * Returns true if a the parameter values are valid, according to the Param definitions
   * @param {any[]} params
   * @param {Record<string, any>} values
   * @return {boolean}
   */
  static validates(params: Param[], values?: Record<string, any>): boolean;
}
export {};
