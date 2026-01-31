import { DefType, Param } from "./param.js";

/** @typedef {import("./param-type.js").ParamType} ParamType */

export class ParamFactory {
  /**
   * @param {import("../url/url-config.js").UrlConfigProvider} urlServiceConfig
   */
  constructor(urlServiceConfig) {
    /**
     * @type {import("../url/url-config.js").UrlConfigProvider}
     */
    this.urlServiceConfig = urlServiceConfig;
  }

  /**
   * @param {string} id
   * @param {ParamType | null} type
   * @param {ng.StateDeclaration} state
   */
  fromConfig(id, type, state) {
    return new Param(id, type, DefType._CONFIG, this.urlServiceConfig, state);
  }

  /**
   * @param {string} id
   * @param {ParamType} type
   * @param {ng.StateDeclaration} state
   */
  fromPath(id, type, state) {
    return new Param(id, type, DefType._PATH, this.urlServiceConfig, state);
  }

  /**
   * @param {string} id
   * @param {ParamType} type
   * @param {ng.StateDeclaration} state
   */
  fromSearch(id, type, state) {
    return new Param(id, type, DefType._SEARCH, this.urlServiceConfig, state);
  }
}
