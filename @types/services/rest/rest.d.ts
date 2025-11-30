/**
 * @template T, ID
 */
export class RestService<T, ID> {
  /**
   * @param {ng.HttpService} $http Angular-like $http service
   * @param {string} baseUrl Base URL template, e.g. "/users/:id{/subId}{?page,limit}"
   * @param {{new(data: any): T}=} entityClass Optional constructor for mapping JSON to class instances
   * @param {Object=} providerDefaults Optional defaults from RestProvider
   */
  constructor(
    $http: ng.HttpService,
    baseUrl: string,
    entityClass?:
      | {
          new (data: any): T;
        }
      | undefined,
    providerDefaults?: any | undefined,
  );
  /** @private @type {ng.HttpService} */
  private $http;
  /** @private @type {string} */
  private baseUrl;
  /** @private @type {{new(data: any): T}=} */
  private entityClass;
  /** @type {Object} global defaults from provider */
  providerDefaults: any;
  /** @type {Array<(config: any) => any | Promise<any>>} */
  requestInterceptors: Array<(config: any) => any | Promise<any>>;
  /** @type {Array<(response: any) => any | Promise<any>>} */
  responseInterceptors: Array<(response: any) => any | Promise<any>>;
  /**
   * Apply all request interceptors sequentially
   * @private
   */
  private _applyRequestInterceptors;
  /**
   * Apply all response interceptors sequentially
   * @private
   */
  private _applyResponseInterceptors;
  /**
   * @private
   */
  private _request;
  /** @private map raw data to entity class */
  private mapEntity;
  /**
   * @private
   * Build URL by replacing colon-style params first, then expanding RFC 6570 template
   * @param {string} template
   * @param {Record<string, any>} [params]
   * @returns {string}
   */
  private buildUrl;
  /** List entities (optional query params) */
  list(params?: {}): Promise<any>;
  /** Read entity by ID (ID can be in colon or RFC template) */
  read(id: any, params?: {}): Promise<any>;
  create(item: any, params?: {}): Promise<any>;
  update(id: any, item: any, params?: {}): Promise<any>;
  delete(id: any, params?: {}): Promise<boolean>;
}
/**
 * RestProvider - register named rest stores at config time.
 *
 * Usage (in config):
 *   restProvider.rest('user', '/api/users', User);
 *
 * Then at runtime you can inject `rest` factory and do:
 *   const userApi = rest('/api/users', User);
 * or use the pre-registered named services:
 *   const userApi = rest.get('user');
 */
export class RestProvider {
  /** @private @type {import('./interface.ts').RestDefinition[]} */
  private definitions;
  /** provider-level defaults (optional) */
  defaults: {};
  /**
   * Register a named rest definition during configtime
   * @template T
   * @param {string} name
   * @param {string} url
   * @param {{new(data:any):T}=} entityClass
   */
  rest<T>(
    name: string,
    url: string,
    entityClass?:
      | {
          new (data: any): T;
        }
      | undefined,
  ): void;
  /**
   * $get factory: returns a `rest` factory function and allows access
   * to pre-registered services via rest.get(name).
   *
   * @returns {(baseUrl:string, entityClass?:Function, options?:object) => RestService}
   */
  $get: (
    | string
    | (($http: any) => {
        (baseUrl: any, entityClass: any, options: any): RestService<any, any>;
        get(name: any): any;
        listNames(): any[];
      })
  )[];
}
