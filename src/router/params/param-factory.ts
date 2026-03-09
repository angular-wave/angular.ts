import { DefType, Param } from "./param.ts";
import type { ParamType } from "./param-type.ts";
import type { UrlConfigProvider } from "../url/url-config.ts";

export class ParamFactory {
  urlServiceConfig: UrlConfigProvider;

  /** Creates a parameter factory tied to the router's URL configuration. */
  constructor(urlServiceConfig: UrlConfigProvider) {
    this.urlServiceConfig = urlServiceConfig;
  }

  /** Builds a parameter from explicit state configuration. */
  fromConfig(id: string, type: ParamType | null, state: ng.StateDeclaration) {
    return new Param(id, type, DefType._CONFIG, this.urlServiceConfig, state);
  }

  /** Builds a path parameter definition. */
  fromPath(id: string, type: ParamType, state: ng.StateDeclaration) {
    return new Param(id, type, DefType._PATH, this.urlServiceConfig, state);
  }

  /** Builds a search/query parameter definition. */
  fromSearch(id: string, type: ParamType, state: ng.StateDeclaration) {
    return new Param(id, type, DefType._SEARCH, this.urlServiceConfig, state);
  }
}
