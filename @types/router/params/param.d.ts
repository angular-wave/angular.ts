export type DefType = number;
export namespace DefType {
  let _PATH: number;
  let _SEARCH: number;
  let _CONFIG: number;
}
export class Param {
  static values(params: any, values?: {}): {};
  /**
   * Finds [[Param]] objects which have different param values
   *
   * Filters a list of [[Param]] objects to only those whose parameter values differ in two param value objects
   *
   * @param params: The list of Param objects to filter
   * @param values1: The first set of parameter values
   * @param values2: the second set of parameter values
   *
   * @returns any Param objects whose values were different between values1 and values2
   */
  static changed(params: any, values1?: {}, values2?: {}): any;
  /**
   * Checks if two param value objects are equal (for a set of [[Param]] objects)
   *
   * @param params The list of [[Param]] objects to check
   * @param values1 The first set of param values
   * @param values2 The second set of param values
   *
   * @returns true if the param values in values1 and values2 are equal
   */
  static equals(params: any, values1?: {}, values2?: {}): boolean;
  /** Returns true if a the parameter values are valid, according to the Param definitions */
  static validates(params: any, values?: {}): any;
  /**
   *
   * @param {*} id
   * @param {*} type
   * @param {DefType} location
   * @param {import("../url/url-config.js").UrlConfigProvider} urlConfig
   * @param {*} state
   */
  constructor(
    id: any,
    type: any,
    location: DefType,
    urlConfig: import("../url/url-config.js").UrlConfigProvider,
    state: any,
  );
  isOptional: boolean;
  type: any;
  location: number;
  id: any;
  dynamic: boolean;
  raw: boolean;
  squash: any;
  replace: any;
  inherit: boolean;
  array: any;
  config: any;
  isDefaultValue(value: any): any;
  /**
   * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
   * default value, which may be the result of an injectable function.
   */
  value(value: any): any;
  _defaultValueCache: {
    defaultValue: any;
  };
  isSearch(): boolean;
  validates(value: any): boolean;
  toString(): string;
}
