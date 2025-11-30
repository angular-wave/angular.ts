import { $injectTokens } from "../../injection-tokens.js";
import { expandUriTemplate } from "./rfc.js";

/**
 * @template T, ID
 */
export class RestService {
  /**
   * @param {ng.HttpService} $http Angular-like $http service
   * @param {string} baseUrl Base URL template, e.g. "/users/:id{/subId}{?page,limit}"
   * @param {{new(data: any): T}=} entityClass Optional constructor for mapping JSON to class instances
   * @param {Object=} providerDefaults Optional defaults from RestProvider
   */
  constructor($http, baseUrl, entityClass, providerDefaults = {}) {
    /** @private @type {ng.HttpService} */
    this.$http = $http;
    /** @private @type {string} */
    this.baseUrl = baseUrl;
    /** @private @type {{new(data: any): T}=} */
    this.entityClass = entityClass;

    /** @type {Object} global defaults from provider */
    this.providerDefaults = providerDefaults;

    /** @type {Array<(config: any) => any | Promise<any>>} */
    this.requestInterceptors = [];
    /** @type {Array<(response: any) => any | Promise<any>>} */
    this.responseInterceptors = [];
  }

  /**
   * Apply all request interceptors sequentially
   * @private
   */
  async _applyRequestInterceptors(config) {
    let cfg = config;
    for (const interceptor of this.requestInterceptors) {
      cfg = await interceptor(cfg);
    }
    return cfg;
  }

  /**
   * Apply all response interceptors sequentially
   * @private
   */
  async _applyResponseInterceptors(response) {
    let resp = response;
    for (const interceptor of this.responseInterceptors) {
      resp = await interceptor(resp);
    }
    return resp;
  }

  /**
   * @private
   */
  async _request(method, url, data, params) {
    let config = { method, url, data, params };

    // Apply request interceptors
    config = await this._applyRequestInterceptors(config);

    let resp;
    try {
      resp = await this.$http(config);
    } catch (err) {
      // Apply response interceptors on error
      resp = await this._applyResponseInterceptors(Promise.reject(err));
      throw resp;
    }

    // Apply response interceptors
    return this._applyResponseInterceptors(resp);
  }

  /** @private map raw data to entity class */
  mapEntity(data) {
    return this.entityClass ? new this.entityClass(data) : data;
  }

  /**
   * @private
   * Build URL by replacing colon-style params first, then expanding RFC 6570 template
   * @param {string} template
   * @param {Record<string, any>} [params]
   * @returns {string}
   */
  buildUrl(template, params = {}) {
    // Replace :param style first
    let url = template.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
      if (params[key] === undefined || params[key] === null) {
        throw new Error(`Missing value for parameter "${key}"`);
      }
      const val = encodeURIComponent(params[key]);
      delete params[key]; // remove so RFC expansion doesn't include it
      return val;
    });

    // Expand remaining RFC 6570 expressions
    return expandUriTemplate(url, params);
  }

  /** List entities (optional query params) */
  async list(params = {}) {
    const url = this.buildUrl(this.baseUrl, params);
    const resp = await this._request("get", url, null, params);

    const data = Array.isArray(resp.data) ? resp.data : [];
    return data.map((d) => (this.entityClass ? new this.entityClass(d) : d));
  }

  /** Read entity by ID (ID can be in colon or RFC template) */
  async read(id, params = {}) {
    const url = this.buildUrl(`${this.baseUrl}/:id`, { id, ...params });
    const resp = await this._request("get", url, null, params);
    return resp.data
      ? this.entityClass
        ? new this.entityClass(resp.data)
        : resp.data
      : null;
  }

  async create(item, params = {}) {
    const url = this.buildUrl(this.baseUrl, params);
    const resp = await this._request("post", url, item, params);
    return this.entityClass ? new this.entityClass(resp.data) : resp.data;
  }

  async update(id, item, params = {}) {
    const url = this.buildUrl(`${this.baseUrl}/:id`, { id, ...params });
    const resp = await this._request("put", url, item, params);
    return resp.data
      ? this.entityClass
        ? new this.entityClass(resp.data)
        : resp.data
      : null;
  }

  async delete(id, params = {}) {
    const url = this.buildUrl(`${this.baseUrl}/:id`, { id, ...params });
    const resp = await this._request("delete", url, null, params);
    return resp.status >= 200 && resp.status < 300;
  }
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
  constructor() {
    /** @private @type {import('./interface.ts').RestDefinition[]} */
    this.definitions = [];
    /** provider-level defaults (optional) */
    this.defaults = {};
  }

  /**
   * Register a named rest definition during configtime
   * @template T
   * @param {string} name
   * @param {string} url
   * @param {{new(data:any):T}=} entityClass
   */
  rest(name, url, entityClass) {
    this.definitions.push({ name, url, entityClass });
  }

  /**
   * $get factory: returns a `rest` factory function and allows access
   * to pre-registered services via rest.get(name).
   *
   * @returns {(baseUrl:string, entityClass?:Function, options?:object) => RestService}
   */
  $get = [
    /* inject $http token name according to your app's token system */
    $injectTokens.$http,
    ($http) => {
      const services = new Map();

      // factory to create ad-hoc RestService instances
      const factory = (baseUrl, entityClass, options) => {
        const svc = new RestService($http, baseUrl, entityClass, options || {});
        // apply provider-level defaults directly if any (non-invasive)
        if (this.defaults && typeof this.defaults === "object") {
          svc.providerDefaults = this.defaults;
        }
        return svc;
      };

      // create named services from definitions registered during config()
      for (const def of this.definitions) {
        const svc = factory(def.url, def.entityClass, def.options || {});
        services.set(def.name, svc);
      }

      // attach helper to fetch pre-registered named service
      factory.get = (name) => services.get(name);

      // also expose list of names for convenience
      factory.listNames = () => Array.from(services.keys());

      return factory;
    },
  ];
}
