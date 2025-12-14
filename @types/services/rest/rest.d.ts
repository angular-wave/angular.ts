/**
 * @template T, ID
 */
export class RestService<T, ID> {
  static $nonscope: boolean;
  /**
   * Core REST service for CRUD operations.
   * Safe, predictable, and optionally maps raw JSON to entity class instances.
   *
   * @param {ng.HttpService} $http Angular-like $http service
   * @param {string} baseUrl Base URL or URI template
   * @param {ng.EntityClass<T>} [entityClass] Optional constructor to map JSON to objects
   * @param {Object} [options] Optional settings (interceptors, headers, etc.)
   */
  constructor(
    $http: ng.HttpService,
    baseUrl: string,
    entityClass?: ng.EntityClass<T>,
    options?: any,
  );
  /** @private */
  private _$http;
  /** @private */
  private _baseUrl;
  /** @private */
  private _entityClass;
  /** @private */
  private _options;
  /**
   * Build full URL from template and parameters
   * @param {string} template
   * @param {Record<string, any>} params
   * @returns {string}
   */
  buildUrl(template: string, params: Record<string, any>): string;
  /**
   * List entities
   * @param {Record<string, any>=} params
   * @returns {Promise<T[]>}
   */
  list(params?: Record<string, any> | undefined): Promise<T[]>;
  /**
   * Read single entity by ID
   * @param {ID} id
   * @param {Record<string, any>=} params
   * @returns {Promise<T|null>}
   */
  read(id: ID, params?: Record<string, any> | undefined): Promise<T | null>;
  /**
   * Create a new entity
   * @param {T} item
   * @returns {Promise<T>}
   */
  create(item: T): Promise<T>;
  /**
   * Update entity by ID
   * @param {ID} id
   * @param {Partial<T>} item
   * @returns {Promise<T|null>}
   */
  update(id: ID, item: Partial<T>): Promise<T | null>;
  /**
   * Delete entity by ID
   * @param {ID} id
   * @returns {Promise<boolean>}
   */
  delete(id: ID): Promise<boolean>;
  #private;
}
/**
 * Provider for registering REST endpoints during module configuration.
 */
export class RestProvider {
  /** @private @type {ng.RestDefinition<any>[]} */
  private _definitions;
  /**
   * Register a REST resource at config phase
   * @template T
   * @param {string} name Service name
   * @param {string} url Base URL or URI template
   * @param {{new(data:any):T}=} entityClass Optional entity constructor
   * @param {Object=} options Optional service options
   */
  rest<T>(
    name: string,
    url: string,
    entityClass?:
      | {
          new (data: any): T;
        }
      | undefined,
    options?: any | undefined,
  ): void;
  /**
   * $get factory: returns a factory function and allows access to named services
   * @returns {(baseUrl:string, entityClass?:Function, options?:object) => RestService & { get(name:string): RestService, listNames(): string[] }}
   */
  $get: (
    | string
    | ((
        $http: ng.HttpService,
      ) => (
        baseUrl: string,
        entityClass?: ng.EntityClass<T>,
        options?: object,
      ) => RestService<T, ID>)
  )[];
}
