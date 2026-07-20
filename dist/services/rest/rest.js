import { isDefined, isString, isNullOrUndefined, isArray } from '../../shared/utils.js';
import { expandUriTemplate } from './rfc.js';
import { HttpRestBackend } from './http-rest-backend.js';
import { normalizePolicyDecision } from '../../core/policy/policy.js';

/**
 * Create a deterministic cache key for a REST request.
 *
 * The key combines method, expanded URL, and a stable serialization of params
 * with sorted object keys. This makes semantically identical param objects map
 * to the same cache entry.
 */
function createRestCacheKey(request) {
    return `${request.method} ${request.url}\n${stableSerialize(request.params ?? {})}`;
}
function stableSerialize(value) {
    if (isArray(value)) {
        return `[${value.map(stableSerialize).join(",")}]`;
    }
    if (value && typeof value === "object") {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
            .join(",")}}`;
    }
    return value === undefined ? "undefined" : JSON.stringify(value);
}
const DEFAULT_REST_CACHE_STRATEGY = "network-first";
function createStaticRestCachePolicy(strategy) {
    return () => strategy;
}
/**
 * Composes a network backend with an async cache store.
 *
 * `GET` requests use the configured {@link RestCachePolicy}. Write requests
 * are sent to the network backend first, then matching cached collection and
 * entity entries are invalidated after successful writes.
 */
class CachedRestBackend {
    /**
     * @param options - Network backend, cache store, read strategy, and optional
     * stale-while-revalidate callback.
     */
    constructor(options) {
        this._network = options.network;
        this._cache = options.cache;
        this._policy =
            options.policy ??
                createStaticRestCachePolicy(options.strategy ?? DEFAULT_REST_CACHE_STRATEGY);
        this._onRevalidate = options.onRevalidate;
    }
    /**
     * Execute a cached REST request.
     *
     * `GET` requests are cacheable. Non-`GET` requests bypass the cache for the
     * write itself and invalidate matching cached reads only after the write
     * succeeds.
     */
    async request(request) {
        if (request.method !== "GET") {
            const response = await this._network.request(request);
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
        const strategy = normalizePolicyDecision(decision).type;
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
    async _cacheFirst(request, cacheKey) {
        const cached = await this._cache.get(cacheKey);
        if (isDefined(cached)) {
            return { ...cached, source: "cache" };
        }
        return this._fetchAndCache(request, cacheKey);
    }
    async _networkFirst(request, cacheKey) {
        try {
            return await this._fetchAndCache(request, cacheKey);
        }
        catch (error) {
            const cached = await this._cache.get(cacheKey);
            if (isDefined(cached)) {
                return { ...cached, source: "cache", stale: true };
            }
            throw error;
        }
    }
    async _staleWhileRevalidate(request, cacheKey) {
        const cached = await this._cache.get(cacheKey);
        if (isDefined(cached)) {
            void this._fetchAndCache(request, cacheKey).then((response) => {
                this._onRevalidate?.({ key: cacheKey, request, response });
                return undefined;
            }, () => undefined);
            return { ...cached, source: "cache", stale: true };
        }
        return this._fetchAndCache(request, cacheKey);
    }
    async _fetchAndCache(request, key) {
        const response = await this._network.request(request);
        const networkResponse = { ...response, source: "network" };
        await this._cache.set(key, networkResponse);
        return networkResponse;
    }
    async _invalidate(request) {
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
class RestService {
    /**
     * @throws Error when `baseUrl` is empty or not a string.
     */
    constructor(backend, 
    /** Base URL or RFC 6570 URI template for this resource. */
    baseUrl, 
    /** Optional mapper that converts raw JSON objects into entity instances. */
    entityClass, 
    /** Extra backend options merged into every request. */
    options = {}) {
        if (!isString(baseUrl) || baseUrl.length === 0) {
            throw new Error("baseUrl required");
        }
        this._backend = backend;
        this._baseUrl = baseUrl;
        this._entityClass = entityClass;
        this._options = options;
    }
    /** @internal */
    _mapEntity(data) {
        if (isNullOrUndefined(data))
            return null;
        return this._entityClass ? new this._entityClass(data) : data;
    }
    /**
     * Fetch a collection.
     *
     * Parameters are used for URI template expansion and are also forwarded to
     * `$http` as query params. Non-array responses resolve to an empty array.
     */
    async list(params = {}) {
        const url = expandUriTemplate(this._baseUrl, params);
        const resp = await this._request("GET", url, null, params, url);
        if (!isArray(resp.data))
            return [];
        return resp.data
            .map((data) => this._mapEntity(data))
            .filter((data) => data !== null);
    }
    /**
     * Fetch one resource by ID using `GET`.
     *
     * @param id - Resource identifier appended to the base URL.
     * @param params - Additional URI template or query parameters.
     * @returns The mapped entity, raw response value, or `null` when empty.
     * @throws Error when `id` is null or undefined.
     */
    async get(id, params = {}) {
        if (isNullOrUndefined(id))
            throw new Error(`badarg:id ${String(id)}`);
        const url = expandUriTemplate(`${this._baseUrl}/${String(id)}`, params);
        const collectionUrl = expandUriTemplate(this._baseUrl, params);
        const resp = await this._request("GET", url, null, params, collectionUrl, id);
        return this._mapEntity(resp.data);
    }
    /**
     * Create a resource using `POST`.
     *
     * @param item - Request body to create.
     * @returns The server representation, mapped through `entityClass` when set.
     * @throws Error when `item` is null or undefined.
     */
    async create(item) {
        if (isNullOrUndefined(item))
            throw new Error(`badarg:item ${String(item)}`);
        const resp = await this._request("POST", this._baseUrl, item, {}, this._baseUrl);
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
    async update(id, item) {
        if (isNullOrUndefined(id))
            throw new Error(`badarg:id ${String(id)}`);
        const url = `${this._baseUrl}/${String(id)}`;
        const resp = await this._request("PUT", url, item, {}, this._baseUrl, id);
        return this._mapEntity(resp.data);
    }
    /**
     * Delete a resource by ID.
     *
     * @param id - Resource identifier appended to the base URL.
     * @returns A promise that fulfills when the request succeeds.
     * @throws Error when `id` is null or undefined.
     */
    async delete(id) {
        if (isNullOrUndefined(id))
            throw new Error(`badarg:id ${String(id)}`);
        const url = `${this._baseUrl}/${String(id)}`;
        await this._request("DELETE", url, null, {}, this._baseUrl, id);
    }
    /** @internal */
    async _request(method, url, data = null, params = {}, collectionUrl, id) {
        return this._backend.request({
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
RestService.$nonscope = true;
/** @internal */
function createRestFactory($http, defaults = {}) {
    return (baseUrl, entityClass, options = {}) => {
        const mergedOptions = { ...defaults, ...options };
        const { backend, ...requestOptions } = mergedOptions;
        return new RestService(backend ?? new HttpRestBackend($http), baseUrl, entityClass, requestOptions);
    };
}

export { CachedRestBackend, HttpRestBackend, RestService, createRestCacheKey, createRestFactory };
