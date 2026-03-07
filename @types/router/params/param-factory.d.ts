import { Param } from "./param.ts";
import type { ParamType } from "./param-type.ts";
import type { UrlConfigProvider } from "../url/url-config.ts";
export declare class ParamFactory {
  urlServiceConfig: UrlConfigProvider;
  /**
   * @param {import("../url/url-config.js").UrlConfigProvider} urlServiceConfig
   */
  constructor(urlServiceConfig: UrlConfigProvider);
  /**
   * @param {string} id
   * @param {ParamType | null} type
   * @param {ng.StateDeclaration} state
   */
  fromConfig(
    id: string,
    type: ParamType | null,
    state: ng.StateDeclaration,
  ): Param;
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
