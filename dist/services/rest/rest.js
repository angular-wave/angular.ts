import { _http } from '../../injection-tokens.js';
import { isDefined, isString, isArray, isNullOrUndefined } from '../../shared/utils.js';
import { expandUriTemplate } from './rfc.js';
import { HttpRestBackend } from './http-rest-backend.js';

/**
 * Create a deterministic cache key for a REST request.
 *
 * The key combines method, expanded URL, and a stable serialization of params
 * with sorted object keys. This makes semantically identical param objects map
 * to the same cache entry.
 */
function createRestCacheKey(request) {
    return `${request.method} ${request.url}\n${stableSerialize(request.params || {})}`;
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
    return JSON.stringify(value) ?? "undefined";
}
/**
 * Composes a network backend with an async cache store.
 *
 * `GET` requests use the configured {@link RestCacheStrategy}. Write requests
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
    async request(request) {
        if (request.method !== "GET") {
            const response = await this._network.request(request);
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
    async _cacheFirst(request) {
        const key = createRestCacheKey(request);
        const cached = await this._cache.get(key);
        if (isDefined(cached)) {
            return { ...cached, source: "cache" };
        }
        return this._fetchAndCache(request, key);
    }
    async _networkFirst(request) {
        const key = createRestCacheKey(request);
        try {
            return await this._fetchAndCache(request, key);
        }
        catch (error) {
            const cached = await this._cache.get(key);
            if (isDefined(cached)) {
                return { ...cached, source: "cache", stale: true };
            }
            throw error;
        }
    }
    async _staleWhileRevalidate(request) {
        const key = createRestCacheKey(request);
        const cached = await this._cache.get(key);
        if (isDefined(cached)) {
            void this._fetchAndCache(request, key).then((response) => {
                this._onRevalidate?.({ key, request, response });
            }, () => undefined);
            return { ...cached, source: "cache", stale: true };
        }
        return this._fetchAndCache(request, key);
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
    /**
     * Expand an RFC 6570 URI template with the provided parameters.
     *
     * @param template - URI template such as `/api/{org}/repos/{repo}`.
     * @param params - Values used for URI template expansion.
     * @returns The expanded URL.
     */
    buildUrl(template, params) {
        return expandUriTemplate(template, params || {});
    }
    _mapEntity(data) {
        if (!data)
            return data;
        return this._entityClass ? new this._entityClass(data) : data;
    }
    /**
     * Fetch a collection.
     *
     * Parameters are used for URI template expansion and are also forwarded to
     * `$http` as query params. Non-array responses resolve to an empty array.
     */
    async list(params = {}) {
        const url = this.buildUrl(this._baseUrl, params);
        const resp = await this._request("GET", url, null, params, url);
        if (!isArray(resp.data))
            return [];
        return resp.data.map((data) => this._mapEntity(data));
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
            throw new Error(`badarg:id ${id}`);
        const url = this.buildUrl(`${this._baseUrl}/${id}`, params);
        const collectionUrl = this.buildUrl(this._baseUrl, params);
        const resp = await this._request("GET", url, null, params, collectionUrl, id);
        return this._mapEntity(resp.data) ?? null;
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
            throw new Error(`badarg:item ${item}`);
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
            throw new Error(`badarg:id ${id}`);
        const url = `${this._baseUrl}/${id}`;
        try {
            const resp = await this._request("PUT", url, item, {}, this._baseUrl, id);
            return this._mapEntity(resp.data) ?? null;
        }
        catch {
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
    async delete(id) {
        if (isNullOrUndefined(id))
            throw new Error(`badarg:id ${id}`);
        const url = `${this._baseUrl}/${id}`;
        try {
            await this._request("DELETE", url, null, {}, this._baseUrl, id);
            return true;
        }
        catch {
            return false;
        }
    }
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
class RestProvider {
    constructor() {
        this.$get = [
            _http,
            ($http) => {
                return (baseUrl, entityClass, options = {}) => {
                    const { backend, ...requestOptions } = options;
                    return new RestService(backend || new HttpRestBackend($http), baseUrl, entityClass, requestOptions);
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
    rest(name, url, entityClass, options = {}) {
    }
}

export { CachedRestBackend, HttpRestBackend, RestProvider, RestService, createRestCacheKey };
