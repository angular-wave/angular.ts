import {
  isArray,
  isDefined,
  isNullOrUndefined,
  isString,
} from "../../shared/utils.ts";
import { expandUriTemplate } from "./rfc.ts";
import { HttpRestBackend } from "./http-rest-backend.ts";
import type { HttpMethod, HttpResponse, HttpService } from "../http/http.ts";
import type {
  Policy,
  PolicyContext,
  PolicyDecision,
} from "../../core/policy/policy.ts";

export { HttpRestBackend } from "./http-rest-backend.ts";

/** Constructor type for mapping JSON objects to entity instances. */
/**
 * Creates a new entity instance from raw response data.
 *
 * @param data - Raw data, typically parsed JSON.
 */
export type EntityClass<T = unknown> = new (data: unknown) => T;

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
  params?: Record<string, unknown>;
  /** Backend-specific request options. */
  options?: Record<string, unknown>;
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

export interface RestCachePolicyContext extends PolicyContext {
  operation: "rest.cache";
  method: HttpMethod;
  url: string;
  collectionUrl?: string;
  id?: unknown;
  params?: Record<string, unknown>;
  options?: Record<string, unknown>;
  cacheKey: string;
}

export type RestCachePolicy = Policy<
  RestCachePolicyContext,
  PolicyDecision<RestCacheStrategy>
>;

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
  /** Default read strategy used for cacheable GET requests. */
  strategy?: RestCacheStrategy;
  /** Runtime policy used to choose the read strategy for each cacheable request. */
  policy?: RestCachePolicy;
  /** Notified after a stale-while-revalidate refresh succeeds. */
  onRevalidate?: (event: RestRevalidateEvent) => void;
}

/** Extra backend options merged into requests made by a REST resource. */
export interface RestOptions extends Record<string, unknown> {
  /** Optional backend used instead of the default HTTP backend. */
  backend?: RestBackend;
}

/** Service configuration for app-level REST defaults. */
export interface RestConfig {
  /** Default options applied to every `$rest(...)` service created by this app. */
  defaults?: RestOptions;
}

/**
 * Create a deterministic cache key for a REST request.
 *
 * The key combines method, expanded URL, and a stable serialization of params
 * with sorted object keys. This makes semantically identical param objects map
 * to the same cache entry.
 */
export function createRestCacheKey(request: RestRequest): string {
  return `${request.method} ${request.url}\n${stableSerialize(request.params ?? {})}`;
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

  return value === undefined ? "undefined" : JSON.stringify(value);
}

const DEFAULT_REST_CACHE_STRATEGY: RestCacheStrategy = "network-first";

function createStaticRestCachePolicy(
  strategy: RestCacheStrategy,
): RestCachePolicy {
  return () => strategy;
}

/**
 * Composes a network backend with an async cache store.
 *
 * `GET` requests use the configured {@link RestCachePolicy}. Write requests
 * are sent to the network backend first, then matching cached collection and
 * entity entries are invalidated after successful writes.
 */
export class CachedRestBackend implements RestBackend {
  private readonly _network: RestBackend;
  private readonly _cache: RestCacheStore;
  private readonly _policy: RestCachePolicy;
  private readonly _onRevalidate?: (event: RestRevalidateEvent) => void;

  /**
   * @param options - Network backend, cache store, read strategy, and optional
   * stale-while-revalidate callback.
   */
  constructor(options: CachedRestBackendOptions) {
    this._network = options.network;
    this._cache = options.cache;
    this._policy =
      options.policy ??
      createStaticRestCachePolicy(
        options.strategy ?? DEFAULT_REST_CACHE_STRATEGY,
      );
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

    const cacheKey = createRestCacheKey(request);
    const decision = await this._policy({
      operation: "rest.cache",
      method: request.method,
      url: request.url,
      collectionUrl: request.collectionUrl,
      id: request.id,
      params: request.params,
      options: request.options,
      cacheKey,
    });

    const strategy = typeof decision === "string" ? decision : decision.type;

    switch (strategy) {
      case "cache-first":
        return this._cacheFirst(request, cacheKey);
      case "network-first":
        return this._networkFirst(request, cacheKey);
      case "stale-while-revalidate":
        return this._staleWhileRevalidate(request, cacheKey);
    }

    throw new Error(`Unsupported REST cache strategy: ${String(strategy)}`);
  }

  private async _cacheFirst<T>(
    request: RestRequest,
    cacheKey: string,
  ): Promise<RestResponse<T>> {
    const cached = await this._cache.get<T>(cacheKey);

    if (isDefined(cached)) {
      return { ...cached, source: "cache" };
    }

    return this._fetchAndCache(request, cacheKey);
  }

  private async _networkFirst<T>(
    request: RestRequest,
    cacheKey: string,
  ): Promise<RestResponse<T>> {
    try {
      return await this._fetchAndCache(request, cacheKey);
    } catch (error) {
      const cached = await this._cache.get<T>(cacheKey);

      if (isDefined(cached)) {
        return { ...cached, source: "cache", stale: true };
      }

      throw error;
    }
  }

  private async _staleWhileRevalidate<T>(
    request: RestRequest,
    cacheKey: string,
  ): Promise<RestResponse<T>> {
    const cached = await this._cache.get<T>(cacheKey);

    if (isDefined(cached)) {
      void this._fetchAndCache<T>(request, cacheKey).then(
        (response) => {
          this._onRevalidate?.({ key: cacheKey, request, response });

          return undefined;
        },
        () => undefined,
      );

      return { ...cached, source: "cache", stale: true };
    }

    return this._fetchAndCache(request, cacheKey);
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
export class RestService<T = unknown, ID = unknown> {
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

  /** @internal */
  private _mapEntity(data: unknown): T | null {
    if (isNullOrUndefined(data)) return null;

    return this._entityClass ? new this._entityClass(data) : (data as T);
  }

  /**
   * Fetch a collection.
   *
   * Parameters are used for URI template expansion and are also forwarded to
   * `$http` as query params. Non-array responses resolve to an empty array.
   */
  async list(params: Record<string, unknown> = {}): Promise<T[]> {
    const url = expandUriTemplate(this._baseUrl, params);

    const resp = await this._request<unknown[]>("GET", url, null, params, url);

    if (!isArray(resp.data)) return [];

    return resp.data
      .map((data) => this._mapEntity(data))
      .filter((data): data is T => data !== null);
  }

  /**
   * Fetch one resource by ID using `GET`.
   *
   * @param id - Resource identifier appended to the base URL.
   * @param params - Additional URI template or query parameters.
   * @returns The mapped entity, raw response value, or `null` when empty.
   * @throws Error when `id` is null or undefined.
   */
  async get(id: ID, params: Record<string, unknown> = {}): Promise<T | null> {
    if (isNullOrUndefined(id)) throw new Error(`badarg:id ${String(id)}`);
    const url = expandUriTemplate(`${this._baseUrl}/${String(id)}`, params);

    const collectionUrl = expandUriTemplate(this._baseUrl, params);

    const resp = await this._request<T>(
      "GET",
      url,
      null,
      params,
      collectionUrl,
      id,
    );

    return this._mapEntity(resp.data);
  }

  /**
   * Create a resource using `POST`.
   *
   * @param item - Request body to create.
   * @returns The server representation, mapped through `entityClass` when set.
   * @throws Error when `item` is null or undefined.
   */
  async create(item: T): Promise<T | null> {
    if (isNullOrUndefined(item)) throw new Error(`badarg:item ${String(item)}`);
    const resp = await this._request<T>(
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
  async update(id: ID, item: Partial<T>): Promise<T | null> {
    if (isNullOrUndefined(id)) throw new Error(`badarg:id ${String(id)}`);
    const url = `${this._baseUrl}/${String(id)}`;

    const resp = await this._request<T>(
      "PUT",
      url,
      item,
      {},
      this._baseUrl,
      id,
    );

    return this._mapEntity(resp.data);
  }

  /**
   * Delete a resource by ID.
   *
   * @param id - Resource identifier appended to the base URL.
   * @returns A promise that fulfills when the request succeeds.
   * @throws Error when `id` is null or undefined.
   */
  async delete(id: ID): Promise<void> {
    if (isNullOrUndefined(id)) throw new Error(`badarg:id ${String(id)}`);
    const url = `${this._baseUrl}/${String(id)}`;

    await this._request("DELETE", url, null, {}, this._baseUrl, id);
  }

  /** @internal */
  private async _request<R>(
    method: HttpMethod,
    url: string,
    data: unknown = null,
    params: Record<string, unknown> = {},
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
export type RestFactory = <T = unknown, ID = unknown>(
  baseUrl: string,
  entityClass?: EntityClass<T>,
  options?: RestOptions,
) => RestService<T, ID>;

/** @internal */
export function createRestFactory(
  $http: HttpService,
  defaults: RestOptions = {},
): RestFactory {
  return (baseUrl, entityClass, options = {}) => {
    const mergedOptions = { ...defaults, ...options };
    const { backend, ...requestOptions } = mergedOptions;

    return new RestService(
      backend ?? new HttpRestBackend($http),
      baseUrl,
      entityClass,
      requestOptions,
    );
  };
}
