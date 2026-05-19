/**
 * Default REST backend that adapts {@link RestRequest} objects to `$http`.
 *
 * This preserves the existing HTTP behavior for `$rest` resources while making
 * the transport swappable for custom resource backends.
 */
class HttpRestBackend {
    /** Creates a backend that executes REST requests through `$http`. */
    constructor($http, options = {}) {
        this._$http = $http;
        this._options = options;
    }
    /**
     * Send the REST request through `$http`.
     *
     * Request-specific options override backend defaults.
     */
    async request(request) {
        return this._$http({
            method: request.method,
            url: request.url,
            data: request.data ?? null,
            params: request.params ?? {},
            ...this._options,
            ...(request.options ?? {}),
        });
    }
}

export { HttpRestBackend };
