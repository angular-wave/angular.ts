/**
 * Injector for providers
 */
export class ProviderInjector extends AbstractInjector {
  /**
   * @param {import('./interface.ts').ProviderCache} cache
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(cache: import("./interface.ts").ProviderCache, strictDi: boolean);
  _cache: import("./interface.ts").ProviderCache;
  /**
   * Factory method for creating services.
   * @param {string} caller - The name of the caller requesting the service.
   * @throws {Error} If the provider is unknown.
   */
  factory(caller: string): void;
}
/**
 * Injector for factories and services
 */
export class InjectorService extends AbstractInjector {
  /**
   * @param {ProviderInjector} providerInjector
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(providerInjector: ProviderInjector, strictDi: boolean);
  /** @type {(mods: Array<Function | string | ng.AnnotatedFactory<any>>) => void} */
  loadNewModules: (
    mods: Array<Function | string | ng.AnnotatedFactory<any>>,
  ) => void;
  /** @private @type {ProviderInjector} */
  private _providerInjector;
  /**
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name: string): boolean;
}
declare class AbstractInjector {
  /**
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(strictDi: boolean);
  /**
   * @type {Object<String, Function>}
   */
  _cache: any;
  /** @type {boolean} */
  strictDi: boolean;
  /** @type {string[]} */
  _path: string[];
  /** @type {Object.<string, ng.NgModule>} */
  _modules: {
    [x: string]: import("./ng-module/ng-module.js").NgModule;
  };
  /**
   * Get a service by name.
   *
   * @param {string} serviceName
   * @returns {any}
   */
  get(serviceName: string): any;
  /**
   * Get the injection arguments for a function.
   *
   * @param {Function|ng.AnnotatedFactory<any>} fn
   * @param {Object & Record<string, any>} [locals]
   * @param {string} [serviceName]
   * @returns
   */
  _injectionArgs(
    fn: Function | ng.AnnotatedFactory<any>,
    locals?: any & Record<string, any>,
    serviceName?: string,
  ): any[];
  /**
   * Invoke a function with optional context and locals.
   *
   * @param {Function|String|ng.AnnotatedFactory<any>} fn
   * @param {*} [self]
   * @param {Object} [locals]
   * @param {string} [serviceName]
   * @returns {*}
   */
  invoke(
    fn: Function | string | ng.AnnotatedFactory<any>,
    self?: any,
    locals?: any,
    serviceName?: string,
  ): any;
  /**
   * Instantiate a type constructor with optional locals.
   * @param {Function|ng.AnnotatedFactory<any>} type
   * @param {*} [locals]
   * @param {string} [serviceName]
   */
  instantiate(
    type: Function | ng.AnnotatedFactory<any>,
    locals?: any,
    serviceName?: string,
  ): any;
  /**
   * @abstract
   * @param {string} _serviceName
   * @returns {any}
   */
  factory(_serviceName: string): any;
}
export {};
