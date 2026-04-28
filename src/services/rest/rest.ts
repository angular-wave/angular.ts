import { _http } from "../../injection-tokens.ts";
import { isArray, isNullOrUndefined, isString } from "../../shared/utils.ts";
import { expandUriTemplate } from "./rfc.ts";
import type { HttpMethod, HttpResponse, HttpService } from "../http/http.ts";

/** Resource definition registered with {@link RestProvider.rest}. */
export interface RestDefinition<T = any> {
  /** Informational name for the resource definition. */
  name: string;
  /** Base URL or RFC 6570 URI template for the resource. */
  url: string;
  /** Constructor for mapping JSON objects to entity instances. */
  entityClass?: EntityClass<T>;
  /** Extra `$http` options merged into each request for this resource. */
  options?: Record<string, any>;
}

/** Constructor type for mapping JSON objects to entity instances. */
export interface EntityClass<T = any> {
  /**
   * Creates a new entity instance from raw response data.
   *
   * @param data - Raw data, typically parsed JSON.
   */
  new (data: any): T;
}

/** Extra `$http` options merged into requests made by a REST resource. */
export type RestOptions = Record<string, any>;

/**
 * Typed REST resource client backed by {@link HttpService}.
 *
 * A `RestService` is usually created by injecting `$rest` and calling it with a
 * base URL, optional {@link EntityClass}, and optional `$http` request defaults.
 */
export class RestService<T = any, ID = any> {
  static $nonscope = true;

  /** @internal */
  private _$http: HttpService;
  /** @internal */
  private _baseUrl: string;
  /** @internal */
  private _entityClass?: EntityClass<T>;
  /** @internal */
  private _options: RestOptions;

  /**
   * @throws Error when `baseUrl` is empty or not a string.
   */
  constructor(
    $http: HttpService,
    /** Base URL or RFC 6570 URI template for this resource. */
    baseUrl: string,
    /** Optional mapper that converts raw JSON objects into entity instances. */
    entityClass?: EntityClass<T>,
    /** Extra `$http` options merged into every request. */
    options: RestOptions = {},
  ) {
    if (!isString(baseUrl) || baseUrl.length === 0) {
      throw new Error("baseUrl required");
    }

    this._$http = $http;
    this._baseUrl = baseUrl;
    this._entityClass = entityClass;
    this._options = options;
  }

  /**
   * Expand an RFC 6570 URI template with the provided parameters.
   *
   * @param template - URI template such as `/api/{org}/repos/{repo}`.
   * @param params - Values used for URI template expansion.
   * @returns The expanded URL.
   */
  buildUrl(template: string, params: Record<string, any>): string {
    return expandUriTemplate(template, params || {});
  }

  private mapEntity(data: unknown): T | unknown {
    if (!data) return data;

    return this._entityClass ? new this._entityClass(data) : data;
  }

  /**
   * Fetch a collection.
   *
   * Parameters are used for URI template expansion and are also forwarded to
   * `$http` as query params. Non-array responses resolve to an empty array.
   */
  async list(params: Record<string, any> = {}): Promise<T[]> {
    const url = this.buildUrl(this._baseUrl, params);

    const resp = await this.request<unknown[]>("GET", url, null, params);

    if (!isArray(resp.data)) return [];

    return resp.data.map((data) => this.mapEntity(data) as T);
  }

  /**
   * Fetch one resource by ID.
   *
   * @param id - Resource identifier appended to the base URL.
   * @param params - Additional URI template or query parameters.
   * @returns The mapped entity, raw response value, or `null` when empty.
   * @throws Error when `id` is null or undefined.
   */
  async read(
    id: ID,
    params: Record<string, any> = {},
  ): Promise<T | unknown | null> {
    if (isNullOrUndefined(id)) throw new Error(`badarg:id ${id}`);
    const url = this.buildUrl(`${this._baseUrl}/${id}`, params);

    const resp = await this.request<unknown>("GET", url, null, params);

    return this.mapEntity(resp.data) ?? null;
  }

  /**
   * Create a resource using `POST`.
   *
   * @param item - Request body to create.
   * @returns The server representation, mapped through `entityClass` when set.
   * @throws Error when `item` is null or undefined.
   */
  async create(item: T): Promise<T | unknown> {
    if (isNullOrUndefined(item)) throw new Error(`badarg:item ${item}`);
    const resp = await this.request<unknown>("POST", this._baseUrl, item);

    return this.mapEntity(resp.data);
  }

  /**
   * Update a resource using `PUT`.
   *
   * @param id - Resource identifier appended to the base URL.
   * @param item - Request body to send.
   * @returns The updated entity, raw value, or `null` when the request fails.
   * @throws Error when `id` is null or undefined.
   */
  async update(id: ID, item: Partial<T>): Promise<T | unknown | null> {
    if (isNullOrUndefined(id)) throw new Error(`badarg:id ${id}`);
    const url = `${this._baseUrl}/${id}`;

    try {
      const resp = await this.request<unknown>("PUT", url, item);

      return this.mapEntity(resp.data) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Delete a resource by ID.
   *
   * @param id - Resource identifier appended to the base URL.
   * @returns `true` when the request succeeds, otherwise `false`.
   * @throws Error when `id` is null or undefined.
   */
  async delete(id: ID): Promise<boolean> {
    if (isNullOrUndefined(id)) throw new Error(`badarg:id ${id}`);
    const url = `${this._baseUrl}/${id}`;

    try {
      await this.request("DELETE", url);

      return true;
    } catch {
      return false;
    }
  }

  private async request<R>(
    method: HttpMethod,
    url: string,
    data: unknown = null,
    params: Record<string, any> = {},
  ): Promise<HttpResponse<R>> {
    return this._$http<R>({
      method,
      url,
      data,
      params,
      ...this._options,
    });
  }
}

/**
 * Factory service exposed as `$rest`.
 *
 * Creates a typed {@link RestService} for a base URL, optional entity mapper,
 * and optional `$http` request defaults.
 */
export type RestFactory = <T = any, ID = any>(
  baseUrl: string,
  entityClass?: EntityClass<T>,
  options?: RestOptions,
) => RestService<T, ID>;

export class RestProvider {
  /** @internal */
  private _definitions: RestDefinition<any>[];

  $get: [string, ($http: HttpService) => RestFactory];

  constructor() {
    this._definitions = [];
    this.$get = [
      _http,
      ($http: HttpService): RestFactory => {
        const services = new Map<string, RestService<any, any>>();

        const factory: RestFactory = (baseUrl, entityClass, options = {}) =>
          new RestService($http, baseUrl, entityClass, options);

        for (const def of this._definitions) {
          services.set(
            def.name,
            factory(def.url, def.entityClass, def.options),
          );
        }

        return factory;
      },
    ];
  }

  /**
   * Register a REST resource definition during module configuration.
   *
   * Registered definitions are available to the `$rest` factory when the
   * provider creates it.
   */
  rest<T>(
    name: string,
    url: string,
    entityClass?: EntityClass<T>,
    options: RestOptions = {},
  ): void {
    this._definitions.push({ name, url, entityClass, options });
  }
}
