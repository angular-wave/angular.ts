import { ParamType } from "./param-type.ts";
import type { InjectorService } from "../../core/di/internal-injector.ts";
import type { ParamTypeDefinition } from "./interface.ts";
/**
 * A registry for parameter types.
 *
 * This registry manages the built-in (and custom) parameter types.
 *
 * The built-in parameter types are:
 *
 * - [[string]]
 * - [[path]]
 * - [[query]]
 * - [[hash]]
 * - [[int]]
 * - [[bool]]
 * - [[date]]
 * - [[json]]
 * - [[any]]
 *
 * To register custom parameter types, use [[UrlConfig.type]], i.e.,
 *
 * ```js
 * router.urlService.config.type(customType)
 * ```
 */
export declare class ParamTypes {
  $injector: InjectorService;
  enqueue: boolean;
  typeQueue: {
    name: string;
    def: () => ParamTypeDefinition;
    pattern?: unknown;
  }[];
  defaultTypes: Record<string, ParamTypeDefinition & Record<string, any>>;
  types: Record<string, ParamType>;
  /**
   * @param {ng.AngularService} $angular
   */
  constructor($angular: ng.AngularService);
  /**
   * Registers a parameter type
   *
   * End users should call [[UrlMatcherFactory.type]], which delegates to this method.
   * @param {string} name
   * @param {import("./interface.ts").ParamTypeDefinition} [definition]
   * @param {() => import("../params/interface.ts").ParamTypeDefinition} [definitionFn]
   */
  type(name: string): ParamType | undefined;
  type(
    name: string,
    definition: ParamTypeDefinition,
    definitionFn?: () => ParamTypeDefinition,
  ): ParamTypes;
  _flushTypeQueue(): void;
}
