import { $injectTokens } from "../../injection-tokens.js";
import {
  assert,
  isArray,
  isNullOrUndefined,
  isString,
} from "../../shared/utils.js";
import { BADARG } from "../../shared/validate.js";
import { expandUriTemplate } from "./rfc.js";

/**
 * @template T, ID
 */
export class RestService {
  static $nonscope = true;

  /**
   * Core REST service for CRUD operations.
   * Safe, predictable, and optionally maps raw JSON to entity class instances.
   *
   * @param {ng.HttpService} $http Angular-like $http service
   * @param {string} baseUrl Base URL or URI template
   * @param {ng.EntityClass<T>} [entityClass] Optional constructor to map JSON to objects
   * @param {Object} [options] Optional settings (interceptors, headers, etc.)
   */
  constructor($http, baseUrl, entityClass, options = {}) {
    assert(isString(baseUrl) && baseUrl.length > 0, "baseUrl required");

    /** @private */
    this.$http = $http;
    /** @private */
    this.baseUrl = baseUrl;
    /** @private */
    this.entityClass = entityClass;
    /** @private */
    this.options = options;
  }

  /**
   * Build full URL from template and parameters
   * @param {string} template
   * @param {Record<string, any>} params
   * @returns {string}
   */
  buildUrl(template, params) {
    // Safe: ensure params is an object
    return expandUriTemplate(template, params || {});
  }

  /**
   * Map raw JSON to entity instance or return as-is
   * @param {any} data
   * @returns {T|any}
   */
  #mapEntity(data) {
    if (!data) return data;

    return this.entityClass ? new this.entityClass(data) : data;
  }

  /**
   * List entities
   * @param {Record<string, any>=} params
   * @returns {Promise<T[]>}
   */
  async list(params = {}) {
    const url = this.buildUrl(this.baseUrl, params);

    const resp = await this.#request("get", url, null, params);

    if (!isArray(resp.data)) return [];

    return resp.data.map((data) => this.#mapEntity(data));
  }

  /**
   * Read single entity by ID
   * @param {ID} id
   * @param {Record<string, any>=} params
   * @returns {Promise<T|null>}
   */
  async read(id, params = {}) {
    assert(!isNullOrUndefined(id), `${BADARG}:id ${id}`);
    const url = this.buildUrl(`${this.baseUrl}/${id}`, params);

    const resp = await this.#request("get", url, null, params);

    return this.#mapEntity(resp.data);
  }

  /**
   * Create a new entity
   * @param {T} item
   * @returns {Promise<T>}
   */
  async create(item) {
    assert(!isNullOrUndefined(item), `${BADARG}:item ${item}`);
    const resp = await this.#request("post", this.baseUrl, item);

    return this.#mapEntity(resp.data);
  }

  /**
   * Update entity by ID
   * @param {ID} id
   * @param {Partial<T>} item
   * @returns {Promise<T|null>}
   */
  async update(id, item) {
    assert(!isNullOrUndefined(id), `${BADARG}:id ${id}`);
    const url = `${this.baseUrl}/${id}`;

    try {
      const resp = await this.#request("put", url, item);

      return this.#mapEntity(resp.data);
    } catch {
      return null;
    }
  }

  /**
   * Delete entity by ID
   * @param {ID} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    assert(!isNullOrUndefined(id), `${BADARG}:id ${id}`);
    const url = `${this.baseUrl}/${id}`;

    try {
      await this.#request("delete", url);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Core HTTP request wrapper
   * @param {"get"|"post"|"put"|"delete"} method
   * @param {string} url
   * @param {any=} data
   * @param {Record<string, any>=} params
   * @returns {Promise<any>}
   */
  async #request(method, url, data = null, params = {}) {
    return await this.$http({
      method,
      url,
      data,
      params,
      ...this.options,
    });
  }
}

/**
 * Provider for registering REST endpoints during module configuration.
 */
export class RestProvider {
  constructor() {
    /** @private @type {ng.RestDefinition<any>[]} */
    this.definitions = [];
  }

  /**
   * Register a REST resource at config phase
   * @template T
   * @param {string} name Service name
   * @param {string} url Base URL or URI template
   * @param {{new(data:any):T}=} entityClass Optional entity constructor
   * @param {Object=} options Optional service options
   */
  rest(name, url, entityClass, options = {}) {
    this.definitions.push({ name, url, entityClass, options });
  }

  /**
   * $get factory: returns a factory function and allows access to named services
   * @returns {(baseUrl:string, entityClass?:Function, options?:object) => RestService & { get(name:string): RestService, listNames(): string[] }}
   */
  $get = [
    $injectTokens.$http,
    ($http) => {
      const services = new Map();

      const factory = (baseUrl, entityClass, options = {}) => {
        const svc = new RestService($http, baseUrl, entityClass, options);

        return svc;
      };

      // create services from pre-registered definitions
      for (const def of this.definitions) {
        const svc = factory(def.url, def.entityClass, def.options);

        services.set(def.name, svc);
      }

      // helpers to fetch named services
      factory.get = (name) => services.get(name);
      factory.listNames = () => Array.from(services.keys());

      return factory;
    },
  ];
}
