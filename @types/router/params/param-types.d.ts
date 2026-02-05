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
export class ParamTypes {
  /**
   * @param {ng.AngularService} $angular
   */
  constructor($angular: ng.AngularService);
  $injector: import("../../docs.ts").InjectorService;
  enqueue: boolean;
  /**
   * @type {{ name: any; def: any; }[]}
   */
  typeQueue: {
    name: any;
    def: any;
  }[];
  defaultTypes: Record<string, any>;
  /**
   * @type {Record<string, any>}
   */
  types: Record<string, any>;
  /**
   * Registers a parameter type
   *
   * End users should call [[UrlMatcherFactory.type]], which delegates to this method.
   * @param {string} name
   * @param {import("./interface.ts").ParamTypeDefinition} [definition]
   * @param {() => import("../params/interface.ts").ParamTypeDefinition} [definitionFn]
   */
  type(
    name: string,
    definition?: import("./interface.ts").ParamTypeDefinition,
    definitionFn?: () => import("../params/interface.ts").ParamTypeDefinition,
  ): any;
  _flushTypeQueue(): void;
}
