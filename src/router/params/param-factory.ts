import { DefType, Param } from "./param.ts";
import type { ParamType } from "./param-type.ts";
import type { UrlConfigProvider } from "../url/url-config.ts";

export class ParamFactory {
  urlServiceConfig: UrlConfigProvider;

  /**
   * @param {import("../url/url-config.ts").UrlConfigProvider} urlServiceConfig
   */
  constructor(urlServiceConfig: UrlConfigProvider) {
    this.urlServiceConfig = urlServiceConfig;
  }

  /**
   * @param {string} id
   * @param {ParamType | null} type
   * @param {ng.StateDeclaration} state
   */
  fromConfig(id: string, type: ParamType | null, state: ng.StateDeclaration) {
    return new Param(id, type, DefType._CONFIG, this.urlServiceConfig, state);
  }

  /**
   * @param {string} id
   * @param {ParamType} type
   * @param {ng.StateDeclaration} state
   */
  fromPath(id: string, type: ParamType, state: ng.StateDeclaration) {
    return new Param(id, type, DefType._PATH, this.urlServiceConfig, state);
  }

  /**
   * @param {string} id
   * @param {ParamType} type
   * @param {ng.StateDeclaration} state
   */
  fromSearch(id: string, type: ParamType, state: ng.StateDeclaration) {
    return new Param(id, type, DefType._SEARCH, this.urlServiceConfig, state);
  }
}
