import { _http } from '../../injection-tokens.js';
import { isString, isArray, isNullOrUndefined } from '../../shared/utils.js';
import { expandUriTemplate } from './rfc.js';

/**
 * Typed REST resource client backed by {@link HttpService}.
 *
 * A `RestService` is usually created by injecting `$rest` and calling it with a
 * base URL, optional {@link EntityClass}, and optional `$http` request defaults.
 */
class RestService {
    /**
     * @throws Error when `baseUrl` is empty or not a string.
     */
    constructor($http, 
    /** Base URL or RFC 6570 URI template for this resource. */
    baseUrl, 
    /** Optional mapper that converts raw JSON objects into entity instances. */
    entityClass, 
    /** Extra `$http` options merged into every request. */
    options = {}) {
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
    buildUrl(template, params) {
        return expandUriTemplate(template, params || {});
    }
    mapEntity(data) {
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
        const resp = await this.request("GET", url, null, params);
        if (!isArray(resp.data))
            return [];
        return resp.data.map((data) => this.mapEntity(data));
    }
    /**
     * Fetch one resource by ID.
     *
     * @param id - Resource identifier appended to the base URL.
     * @param params - Additional URI template or query parameters.
     * @returns The mapped entity, raw response value, or `null` when empty.
     * @throws Error when `id` is null or undefined.
     */
    async read(id, params = {}) {
        if (isNullOrUndefined(id))
            throw new Error(`badarg:id ${id}`);
        const url = this.buildUrl(`${this._baseUrl}/${id}`, params);
        const resp = await this.request("GET", url, null, params);
        return this.mapEntity(resp.data) ?? null;
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
        const resp = await this.request("POST", this._baseUrl, item);
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
    async update(id, item) {
        if (isNullOrUndefined(id))
            throw new Error(`badarg:id ${id}`);
        const url = `${this._baseUrl}/${id}`;
        try {
            const resp = await this.request("PUT", url, item);
            return this.mapEntity(resp.data) ?? null;
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
            await this.request("DELETE", url);
            return true;
        }
        catch {
            return false;
        }
    }
    async request(method, url, data = null, params = {}) {
        return this._$http({
            method,
            url,
            data,
            params,
            ...this._options,
        });
    }
}
RestService.$nonscope = true;
class RestProvider {
    constructor() {
        this._definitions = [];
        this.$get = [
            _http,
            ($http) => {
                const services = new Map();
                const factory = (baseUrl, entityClass, options = {}) => new RestService($http, baseUrl, entityClass, options);
                for (const def of this._definitions) {
                    services.set(def.name, factory(def.url, def.entityClass, def.options));
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
    rest(name, url, entityClass, options = {}) {
        this._definitions.push({ name, url, entityClass, options });
    }
}

export { RestProvider, RestService };
