import type { AnnotatedFactory } from "../../interface.ts";
import type { ProviderCache } from "./interface.ts";
import type { NgModule } from "./ng-module/ng-module.ts";
type InjectableFn = Function | AnnotatedFactory<(...args: any[]) => any>;
declare class AbstractInjector {
  _cache: Record<string, any>;
  strictDi: boolean;
  _path: string[];
  _modules: Record<string, NgModule>;
  /**
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(strictDi: boolean);
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
    fn: InjectableFn,
    locals?: Record<string, any>,
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
    fn: InjectableFn | string,
    self?: any,
    locals?: Record<string, any> | string,
    serviceName?: string,
  ): any;
  /**
   * Instantiate a type constructor with optional locals.
   * @param {Function|ng.AnnotatedFactory<any>} type
   * @param {*} [locals]
   * @param {string} [serviceName]
   */
  instantiate(
    type: InjectableFn,
    locals?: Record<string, any>,
    serviceName?: string,
  ): any;
  /**
   * @abstract
   * @param {string} _serviceName
   * @returns {any}
   */
  factory(_serviceName: string): any;
}
/**
 * Injector for providers
 */
export declare class ProviderInjector extends AbstractInjector {
  /**
   * @param {import('./interface.ts').ProviderCache} cache
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(cache: ProviderCache, strictDi: boolean);
  /**
   * Factory method for creating services.
   * @param {string} caller - The name of the caller requesting the service.
   * @throws {Error} If the provider is unknown.
   */
  factory(caller: string): never;
}
/**
 * Injector for factories and services
 */
export declare class InjectorService extends AbstractInjector {
  loadNewModules: (
    mods: Array<Function | string | AnnotatedFactory<(...args: any[]) => any>>,
  ) => void;
  _providerInjector: ProviderInjector;
  /**
   * @param {ProviderInjector} providerInjector
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(providerInjector: ProviderInjector, strictDi: boolean);
  /**
   * @param {string} serviceName
   * @returns {*}
   */
  factory(serviceName: string): any;
  /**
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name: string): boolean;
}
export {};
