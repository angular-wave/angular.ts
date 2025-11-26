/**
 * Injector for providers
 */
export class ProviderInjector extends AbstractInjector {
  /**
   * @param {Object} cache
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(cache: any, strictDi: boolean);
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
  /** @type {ProviderInjector} */
  providerInjector: ProviderInjector;
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
  cache: any;
  /** @type {boolean} */
  strictDi: boolean;
  /** @type {string[]} */
  path: string[];
  /** @type {Object.<string, ng.NgModule>} */
  modules: {
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
   * @param {Function|Array} fn
   * @param {Object} locals
   * @param {string} serviceName
   * @returns
   */
  injectionArgs(fn: Function | any[], locals: any, serviceName: string): any[];
  /**
   * Invoke a function with optional context and locals.
   *
   * @param {Function|String|Array<any>} fn
   * @param {*} [self]
   * @param {Object} [locals]
   * @param {string} [serviceName]
   * @returns {*}
   */
  invoke(
    fn: Function | string | Array<any>,
    self?: any,
    locals?: any,
    serviceName?: string,
  ): any;
  /**
   * Instantiate a type constructor with optional locals.
   * @param {Function|Array} type
   * @param {*} [locals]
   * @param {string} [serviceName]
   */
  instantiate(type: Function | any[], locals?: any, serviceName?: string): any;
  /**
   * @abstract
   */
  loadNewModules(): void;
  /**
   * @abstract
   * @param {string} _serviceName
   * @returns {any}
   */
  factory(_serviceName: string): any;
}
export {};
