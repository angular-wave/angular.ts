export type DefType = number;
export namespace DefType {
  let _PATH: number;
  let _SEARCH: number;
  let _CONFIG: number;
}
export class Param {
  /**
   * @param {Param[]} params
   * @param {Record<string, any>} values
   * @return {import("./interface.ts").RawParams}
   */
  static values(
    params: Param[],
    values?: Record<string, any>,
  ): import("./interface.ts").RawParams;
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
  static equals(params: any[], values1?: {}, values2?: {}): boolean;
  /**
   * Returns true if a the parameter values are valid, according to the Param definitions
   * @param {any[]} params
   * @param {Record<string, any>} values
   * @return {boolean}
   */
  static validates(params: any[], values?: Record<string, any>): boolean;
  /**
   *
   * @param {string} id
   * @param {ParamType} type
   * @param {DefType} location
   * @param {import("../url/url-config.js").UrlConfigProvider} urlConfig
   * @param {ng.StateDeclaration} state
   */
  constructor(
    id: string,
    type: ParamType,
    location: DefType,
    urlConfig: import("../url/url-config.js").UrlConfigProvider,
    state: ng.StateDeclaration,
  );
  isOptional: boolean;
  type: ParamType;
  location: number;
  id: string;
  dynamic: boolean;
  raw: boolean;
  squash: string | boolean;
  replace: any;
  inherit: boolean;
  array: boolean;
  config: import("./interface.ts").ParamDeclaration;
  matchingKeys: any;
  /**
   * @param {any} value
   */
  isDefaultValue(value: any): boolean;
  /**
   * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
   * default value, which may be the result of an injectable function.
   * @param {undefined} [value]
   */
  value(value?: undefined): any;
  _defaultValueCache: {
    defaultValue: any;
  };
  isSearch(): boolean;
  /**
   * @param {null} value
   */
  validates(value: null): boolean;
  toString(): string;
}
export type ParamDeclaration = import("./interface.ts").ParamDeclaration;
import { ParamType } from "./param-type.js";
