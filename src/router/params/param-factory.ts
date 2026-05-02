import { DefType, Param } from "./param.ts";
import type { ParamType } from "./param-type.ts";
import type { ParamTypeMap } from "./param-types.ts";

export interface UrlParamConfig {
  _paramTypes: ParamTypeMap;
  _getDefaultSquashPolicy(): boolean | string;
}

export class ParamFactory {
  /** @internal */
  _injector: ng.InjectorService | undefined;
  urlServiceConfig: UrlParamConfig;

  /**
   * @param {UrlParamConfig} urlServiceConfig
   */
  constructor(urlServiceConfig: UrlParamConfig) {
    this._injector = undefined;
    this.urlServiceConfig = urlServiceConfig;
  }

  /**
   * @param {string} id
   * @param {ParamType | null} type
   * @param {ng.StateDeclaration} state
   */
  fromConfig(
    id: string,
    type: ParamType | null,
    state: ng.StateDeclaration,
  ): Param {
    return new Param(
      id,
      type,
      DefType._CONFIG,
      this.urlServiceConfig,
      this,
      state,
    );
  }

  /**
   * @param {string} id
   * @param {ParamType} type
   * @param {ng.StateDeclaration} state
   */
  fromPath(id: string, type: ParamType, state: ng.StateDeclaration): Param {
    return new Param(
      id,
      type,
      DefType._PATH,
      this.urlServiceConfig,
      this,
      state,
    );
  }

  /**
   * @param {string} id
   * @param {ParamType} type
   * @param {ng.StateDeclaration} state
   */
  fromSearch(id: string, type: ParamType, state: ng.StateDeclaration): Param {
    return new Param(
      id,
      type,
      DefType._SEARCH,
      this.urlServiceConfig,
      this,
      state,
    );
  }
}
