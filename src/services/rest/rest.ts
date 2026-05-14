import { _http } from "../../injection-tokens.ts";
import {
  isArray,
  isDefined,
  isNullOrUndefined,
  isString,
} from "../../shared/utils.ts";
import { expandUriTemplate } from "./rfc.ts";
import { HttpRestBackend } from "./http-rest-backend.ts";
import type { HttpMethod, HttpResponse, HttpService } from "../http/http.ts";

export { HttpRestBackend } from "./http-rest-backend.ts";

/** Resource definition registered with {@link RestProvider.rest}. */
export interface RestDefinition<T = any> {
  /** Informational name for the resource definition. */
  name: string;
  /** Base URL or RFC 6570 URI template for the resource. */
  url: string;
  /** Constructor for mapping JSON objects to entity instances. */
  entityClass?: EntityClass<T>;
  /** Extra REST options merged into each request for this resource. */
  options?: RestOptions;
}

/** Constructor type for mapping JSON objects to entity instances. */
/**
 * Creates a new entity instance from raw response data.
 *
 * @param data - Raw data, typically parsed JSON.
 */
export type EntityClass<T = any> = new (data: any) => T;

/**
 * Normalized request object passed from {@link RestService} to a
 * {@link RestBackend}.
 *
 * Backends receive expanded URLs and already-separated request options, so they
 * can focus on transport, persistence, or cache policy.
 */
export interface RestRequest {
  /** Resource operation method. */
  method: HttpMethod;
  /** Expanded request URL. */
  url: string;
  /** Collection URL used for broad cache invalidation. */
  collectionUrl?: string;
  /** Resource identifier for entity operations. */
  id?: unknown;
  /** Request body for write operations. */
  data?: unknown;
  /** URI template and query parameters. */
  params?: Record<string, any>;
  /** Backend-specific request options. */
  options?: Record<string, any>;
}

/**
 * Response shape returned by {@link RestBackend} implementations.
 *
 * HTTP-backed responses may include the usual {@link HttpResponse} metadata,
 * while local or cached backends can return only `data` plus optional cache
 * source metadata.
 */
export interface RestResponse<T = unknown> extends Partial<HttpResponse<T>> {
  /** Response payload. */
  data: T;
  /** Backend that produced the response. */
  source?: "network" | "cache";
  /** Whether the returned cached value may be older than the remote source. */
  stale?: boolean;
}

/**
 * Backend abstraction used by {@link RestService}.
 *
 * Implement this interface to route REST operations through `$http`, IndexedDB,
 * the Cache API, a test double, or a composed backend such as
 * {@link CachedRestBackend}.
 */
export interface RestBackend {
  /**
   * Execute one normalized REST request.
   *
   * @param request - Request produced by `RestService`.
   * @returns A response containing the raw payload for entity mapping.
   */
  request<T>(request: RestRequest): Promise<RestResponse<T>>;
}

/**
 * Read strategy used by {@link CachedRestBackend} for `GET` requests.
 *
 * - `cache-first`: return cached data when present, otherwise fetch network.
 * - `network-first`: fetch network first, falling back to stale cache on error.
 * - `stale-while-revalidate`: return cache immediately and refresh in the background.
 */
export type RestCacheStrategy =
  | "cache-first"
  | "network-first"
  | "stale-while-revalidate";

/**
 * Async cache store used by {@link CachedRestBackend}.
 *
 * The interface is deliberately small so implementations can be backed by
 * IndexedDB, the browser Cache API, local storage, memory, or test fixtures.
 */
export interface RestCacheStore {
  /**
   * Read a cached REST response by deterministic key.
   *
   * @param key - Opaque cache key supplied by {@link CachedRestBackend}.
   */
  get<T>(key: string): Promise<RestResponse<T> | undefined>;
  /**
   * Store a REST response by deterministic key.
   *
   * @param key - Opaque cache key supplied by {@link CachedRestBackend}.
   * @param response - Response to persist.
   */
  set<T>(key: string, response: RestResponse<T>): Promise<void>;
  /**
   * Delete one cached REST response.
   *
   * @param key - Exact cache key to remove.
   */
  delete(key: string): Promise<void>;
  /**
   * Delete cached REST responses whose keys start with the prefix.
   *
   * `CachedRestBackend` uses prefixes such as `GET /api/users` to invalidate
   * collection and entity entries after successful writes.
   */
  deletePrefix(prefix: string): Promise<void>;
}

/**
 * Event emitted after a stale-while-revalidate background refresh succeeds.
 */
export interface RestRevalidateEvent<T = unknown> {
  /** Cache key that was refreshed. */
  key: string;
  /** Original request. */
  request: RestRequest;
  /** Fresh network response. */
  response: RestResponse<T>;
}

/** Configuration for {@link CachedRestBackend}. */
export interface CachedRestBackendOptions {
  /** Backend used for authoritative network responses and writes. */
  network: RestBackend;
  /** Async cache store, such as IndexedDB, Cache API, or memory. */
  cache: RestCacheStore;
  /** Read strategy used for cacheable GET requests. */
  strategy: RestCacheStrategy;
  /** Notified after a stale-while-revalidate refresh succeeds. */
  onRevalidate?: (event: RestRevalidateEvent) => void;
}

/** Extra backend options merged into requests made by a REST resource. */
export interface RestOptions extends Record<string, any> {
  /** Optional backend used instead of the default HTTP backend. */
  backend?: RestBackend;
}

/**
 * Create a deterministic cache key for a REST request.
 *
 * The key combines method, expanded URL, and a stable serialization of params
 * with sorted object keys. This makes semantically identical param objects map
 * to the same cache entry.
 */
export function createRestCacheKey(request: RestRequest): string {
  return `${request.method} ${request.url}\n${stableSerialize(request.params || {})}`;
}

function stableSerialize(value: unknown): string {
  if (isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableSerialize(
            (value as Record<string, unknown>)[key],
          )}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "undefined";
}

/**
 * Composes a network backend with an async cache store.
 *
 * `GET` requests use the configured {@link RestCacheStrategy}. Write requests
 * are sent to the network backend first, then matching cached collection and
 * entity entries are invalidated after successful writes.
 */
export class CachedRestBackend implements RestBackend {
  private readonly _network: RestBackend;
  private readonly _cache: RestCacheStore;
  private readonly _strategy: RestCacheStrategy;
  private readonly _onRevalidate?: (event: RestRevalidateEvent) => void;

  /**
   * @param options - Network backend, cache store, read strategy, and optional
   * stale-while-revalidate callback.
   */
  constructor(options: CachedRestBackendOptions) {
    this._network = options.network;
    this._cache = options.cache;
    this._strategy = options.strategy;
    this._onRevalidate = options.onRevalidate;
  }

  /**
   * Execute a cached REST request.
   *
   * `GET` requests are cacheable. Non-`GET` requests bypass the cache for the
   * write itself and invalidate matching cached reads only after the write
   * succeeds.
   */
  async request<T>(request: RestRequest): Promise<RestResponse<T>> {
    if (request.method !== "GET") {
      const response = await this._network.request<T>(request);

      await this._invalidate(request);

      return response;
    }

    switch (this._strategy) {
      case "cache-first":
        return this._cacheFirst(request);
      case "network-first":
        return this._networkFirst(request);
      case "stale-while-revalidate":
        return this._staleWhileRevalidate(request);
    }

    throw new Error(`Unsupported REST cache strategy: ${this._strategy}`);
  }

  private async _cacheFirst<T>(request: RestRequest): Promise<RestResponse<T>> {
    const key = createRestCacheKey(request);

    const cached = await this._cache.get<T>(key);

    if (isDefined(cached)) {
      return { ...cached, source: "cache" };
    }

    return this._fetchAndCache(request, key);
  }

  private async _networkFirst<T>(
    request: RestRequest,
  ): Promise<RestResponse<T>> {
    const key = createRestCacheKey(request);

    try {
      return await this._fetchAndCache(request, key);
    } catch (error) {
      const cached = await this._cache.get<T>(key);

      if (isDefined(cached)) {
        return { ...cached, source: "cache", stale: true };
      }

      throw error;
    }
  }

  private async _staleWhileRevalidate<T>(
    request: RestRequest,
  ): Promise<RestResponse<T>> {
    const key = createRestCacheKey(request);

    const cached = await this._cache.get<T>(key);

    if (isDefined(cached)) {
      void this._fetchAndCache<T>(request, key).then(
        (response) => {
          this._onRevalidate?.({ key, request, response });
        },
        () => undefined,
      );

      return { ...cached, source: "cache", stale: true };
    }

    return this._fetchAndCache(request, key);
  }

  private async _fetchAndCache<T>(
    request: RestRequest,
    key: string,
  ): Promise<RestResponse<T>> {
    const response = await this._network.request<T>(request);

    const networkResponse = { ...response, source: "network" as const };

    await this._cache.set(key, networkResponse);

    return networkResponse;
  }

  private async _invalidate(request: RestRequest): Promise<void> {
    await this._cache.deletePrefix(`GET ${request.url}`);

    if (request.collectionUrl && request.collectionUrl !== request.url) {
      await this._cache.deletePrefix(`GET ${request.collectionUrl}`);
    }
  }
}

/**
 * Typed REST resource client backed by {@link RestBackend}.
 *
 * A `RestService` is usually created by injecting `$rest` and calling it with a
 * base URL, optional {@link EntityClass}, and optional backend request defaults.
 */
export class RestService<T = any, ID = any> {
  static $nonscope = true;

  /** @internal */
  private readonly _backend: RestBackend;
  /** @internal */
  private readonly _baseUrl: string;
  /** @internal */
  private readonly _entityClass?: EntityClass<T>;
  /** @internal */
  private readonly _options: RestOptions;

  /**
   * @throws Error when `baseUrl` is empty or not a string.
   */
  constructor(
    backend: RestBackend,
    /** Base URL or RFC 6570 URI template for this resource. */
    baseUrl: string,
    /** Optional mapper that converts raw JSON objects into entity instances. */
    entityClass?: EntityClass<T>,
    /** Extra backend options merged into every request. */
    options: RestOptions = {},
  ) {
    if (!isString(baseUrl) || baseUrl.length === 0) {
      throw new Error("baseUrl required");
    }

    this._backend = backend;
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

  private _mapEntity(data: unknown): unknown {
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

    const resp = await this._request<unknown[]>("GET", url, null, params, url);

    if (!isArray(resp.data)) return [];

    return resp.data.map((data) => this._mapEntity(data) as T);
  }

  /**
   * Fetch one resource by ID using `GET`.
   *
   * @param id - Resource identifier appended to the base URL.
   * @param params - Additional URI template or query parameters.
   * @returns The mapped entity, raw response value, or `null` when empty.
   * @throws Error when `id` is null or undefined.
   */
  async get(id: ID, params: Record<string, any> = {}): Promise<unknown> {
    if (isNullOrUndefined(id)) throw new Error(`badarg:id ${id}`);
    const url = this.buildUrl(`${this._baseUrl}/${id}`, params);

    const collectionUrl = this.buildUrl(this._baseUrl, params);

    const resp = await this._request<unknown>(
      "GET",
      url,
      null,
      params,
      collectionUrl,
      id,
    );

    return this._mapEntity(resp.data) ?? null;
  }

  /**
   * Create a resource using `POST`.
   *
   * @param item - Request body to create.
   * @returns The server representation, mapped through `entityClass` when set.
   * @throws Error when `item` is null or undefined.
   */
  async create(item: T): Promise<unknown> {
    if (isNullOrUndefined(item)) throw new Error(`badarg:item ${item}`);
    const resp = await this._request<unknown>(
      "POST",
      this._baseUrl,
      item,
      {},
      this._baseUrl,
    );

    return this._mapEntity(resp.data);
  }

  /**
   * Update a resource using `PUT`.
   *
   * @param id - Resource identifier appended to the base URL.
   * @param item - Request body to send.
   * @returns The updated entity, raw value, or `null` when the request fails.
   * @throws Error when `id` is null or undefined.
   */
  async update(id: ID, item: Partial<T>): Promise<unknown> {
    if (isNullOrUndefined(id)) throw new Error(`badarg:id ${id}`);
    const url = `${this._baseUrl}/${id}`;

    try {
      const resp = await this._request<unknown>(
        "PUT",
        url,
        item,
        {},
        this._baseUrl,
        id,
      );

      return this._mapEntity(resp.data) ?? null;
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
      await this._request("DELETE", url, null, {}, this._baseUrl, id);

      return true;
    } catch {
      return false;
    }
  }

  private async _request<R>(
    method: HttpMethod,
    url: string,
    data: unknown = null,
    params: Record<string, any> = {},
    collectionUrl?: string,
    id?: unknown,
  ): Promise<RestResponse<R>> {
    return this._backend.request<R>({
      method,
      url,
      data,
      params,
      collectionUrl,
      id,
      options: this._options,
    });
  }
}

/**
 * Factory service exposed as `$rest`.
 *
 * Creates a typed {@link RestService} for a base URL, optional entity mapper,
 * and optional backend request defaults.
 */
export type RestFactory = <T = any, ID = any>(
  baseUrl: string,
  entityClass?: EntityClass<T>,
  options?: RestOptions,
) => RestService<T, ID>;

export class RestProvider {
  $get: [string, ($http: HttpService) => RestFactory];

  constructor() {
    this.$get = [
      _http,
      ($http: HttpService): RestFactory => {
        return (baseUrl, entityClass, options = {}) => {
          const { backend, ...requestOptions } = options;

          return new RestService(
            backend || new HttpRestBackend($http),
            baseUrl,
            entityClass,
            requestOptions,
          );
        };
      },
    ];
  }

  /**
   * Accept a REST resource definition during provider configuration.
   *
   * Named injectable resources are registered by {@link NgModule.rest}; the
   * provider exposes the runtime `$rest` factory.
   */
  rest<T>(
    name: string,
    url: string,
    entityClass?: EntityClass<T>,
    options: RestOptions = {},
  ): void {
    void name;
    void url;
    void entityClass;
    void options;
  }
}
