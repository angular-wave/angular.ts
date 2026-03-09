import { $injectTokens } from "../../injection-tokens.ts";
import {
  assert,
  isArray,
  isNullOrUndefined,
  isString,
} from "../../shared/utils.ts";
import { BADARG } from "../../shared/validate.ts";
import { expandUriTemplate } from "./rfc.ts";

export interface RestDefinition<T = any> {
  name: string;
  url: string;
  /** Constructor for mapping JSON to class instance */
  entityClass?: EntityClass<T>;
  options?: Record<string, any>;
}

/**
 * A constructor type for mapping JSON objects to entity instances
 */
export interface EntityClass<T = any> {
  /**
   * Creates a new instance of the entity from a raw object
   * @param data - Raw data (typically JSON) to map
   */
  new (data: any): T;
}

/**
 * @template T, ID
 */
export class RestService<T, ID> {
  static $nonscope = true;
  private _$http: ng.HttpService;
  private _baseUrl: string;
  private _entityClass?: ng.EntityClass<T>;
  private _options: Record<string, any>;

  /**
   * Core REST service for CRUD operations.
   * Safe, predictable, and optionally maps raw JSON to entity class instances.
   *
   * @param $http Angular-like $http service
   * @param baseUrl Base URL or URI template
   * @param [entityClass] Optional constructor to map JSON to objects
   * @param [options] Optional settings (interceptors, headers, etc.)
   */
  constructor(
    $http: ng.HttpService,
    baseUrl: string,
    entityClass?: ng.EntityClass<T>,
    options: Record<string, any> = {},
  ) {
    assert(isString(baseUrl) && baseUrl.length > 0, "baseUrl required");

    /** @private */
    this._$http = $http;
    /** @private */
    this._baseUrl = baseUrl;
    /** @private */
    this._entityClass = entityClass;
    /** @private */
    this._options = options;
  }

  /**
   * Build full URL from template and parameters
   */
  buildUrl(template: string, params: Record<string, any>): string {
    // Safe: ensure params is an object
    return expandUriTemplate(template, params || {});
  }

  /**
   * Map raw JSON to entity instance or return as-is
   */
  private _mapEntity(data: any): T | any {
    if (!data) return data;

    return this._entityClass ? new this._entityClass(data) : data;
  }

  /**
   * List entities
   */
  async list(params: Record<string, any> = {}): Promise<T[]> {
    const url = this.buildUrl(this._baseUrl, params);

    const resp = await this._request("GET", url, null, params);

    if (!isArray(resp.data)) return [];

    return resp.data.map((data: unknown) => this._mapEntity(data));
  }

  /**
   * Read single entity by ID
   */
  async read(id: ID, params: Record<string, any> = {}): Promise<T | null> {
    assert(!isNullOrUndefined(id), `${BADARG}:id ${id}`);
    const url = this.buildUrl(`${this._baseUrl}/${id}`, params);

    const resp = await this._request("GET", url, null, params);

    return this._mapEntity(resp.data);
  }

  /**
   * Create a new entity
   */
  async create(item: T): Promise<T> {
    assert(!isNullOrUndefined(item), `${BADARG}:item ${item}`);
    const resp = await this._request("POST", this._baseUrl, item);

    return this._mapEntity(resp.data);
  }

  /**
   * Update entity by ID
   */
  async update(id: ID, item: Partial<T>): Promise<T | null> {
    assert(!isNullOrUndefined(id), `${BADARG}:id ${id}`);
    const url = `${this._baseUrl}/${id}`;

    try {
      const resp = await this._request("PUT", url, item);

      return this._mapEntity(resp.data);
    } catch {
      return null;
    }
  }

  /**
   * Delete entity by ID
   */
  async delete(id: ID): Promise<boolean> {
    assert(!isNullOrUndefined(id), `${BADARG}:id ${id}`);
    const url = `${this._baseUrl}/${id}`;

    try {
      await this._request("DELETE", url);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Core HTTP request wrapper
   */
  private async _request(
    method: ng.HttpMethod,
    url: string,
    data: any = null,
    params: Record<string, any> = {},
  ): Promise<any> {
    return this._$http({
      method,
      url,
      data,
      params,
      ...this._options,
    });
  }
}

/**
 * Provider for registering REST endpoints during module configuration.
 */
export class RestProvider {
  private _definitions: ng.RestDefinition<any>[];

  constructor() {
    this._definitions = [];
  }

  /**
   * Register a REST resource at config phase
   * @template T
   * @param name Service name
   * @param url Base URL or URI template
   * @param entityClass Optional entity constructor
   * @param options Optional service options
   */
  rest<T>(
    name: string,
    url: string,
    entityClass?: { new (data: any): T },
    options: Record<string, any> = {},
  ): void {
    this._definitions.push({ name, url, entityClass, options });
  }

  /**
   * $get factory: returns a factory function and allows access to named services
   */
  $get = [
    $injectTokens._http,
    ($http: ng.HttpService) => {
      const services = new Map<string, RestService<any, any>>();

      /**
       * @template T, ID
       * Creates a typed REST service for the supplied base URL.
       */
      const factory = <T, ID>(
        baseUrl: string,
        entityClass?: ng.EntityClass<T>,
        options: Record<string, any> = {},
      ): RestService<T, ID> => {
        return new RestService($http, baseUrl, entityClass, options);
      };

      // create services from pre-registered definitions
      for (const def of this._definitions) {
        const svc = factory(def.url, def.entityClass, def.options);

        services.set(def.name, svc);
      }

      return factory;
    },
  ];
}
