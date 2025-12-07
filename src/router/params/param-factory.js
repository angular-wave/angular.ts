import { DefType, Param } from "./param.js";

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

  fromConfig(id, type, state) {
    return new Param(id, type, DefType._CONFIG, this.urlServiceConfig, state);
  }

  fromPath(id, type, state) {
    return new Param(id, type, DefType._PATH, this.urlServiceConfig, state);
  }

  fromSearch(id, type, state) {
    return new Param(id, type, DefType._SEARCH, this.urlServiceConfig, state);
  }
}
