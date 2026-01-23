/** @typedef {import("./param-type.js").ParamType} ParamType */
export class ParamFactory {
  /**
   * @param {import("../url/url-config.js").UrlConfigProvider} urlServiceConfig
   */
  constructor(
    urlServiceConfig: import("../url/url-config.js").UrlConfigProvider,
  );
  /**
   * @type {import("../url/url-config.js").UrlConfigProvider}
   */
  urlServiceConfig: import("../url/url-config.js").UrlConfigProvider;
  /**
   * @param {string} id
   * @param {ParamType} type
   * @param {ng.StateDeclaration} state
   */
  fromConfig(id: string, type: ParamType, state: ng.StateDeclaration): Param;
  /**
   * @param {string} id
   * @param {ParamType} type
   * @param {ng.StateDeclaration} state
   */
  fromPath(id: string, type: ParamType, state: ng.StateDeclaration): Param;
  /**
   * @param {string} id
   * @param {ParamType} type
   * @param {ng.StateDeclaration} state
   */
  fromSearch(id: string, type: ParamType, state: ng.StateDeclaration): Param;
}
export type ParamType = import("./param-type.js").ParamType;
import { Param } from "./param.js";
