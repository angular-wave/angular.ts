/**
 * Default REST backend that adapts {@link RestRequest} objects to `$http`.
 *
 * This preserves the existing HTTP behavior for `$rest` resources while making
 * the transport swappable for custom resource backends.
 */
class HttpRestBackend {
    /** Creates a backend that executes REST requests through `$http`. */
    constructor(
    /** Runtime `$http` service used to execute requests. */
    _$http, 
    /** Default `$http` options merged into every request. */
    _options = {}) {
        this._$http = _$http;
        this._options = _options;
    }
    /**
     * Send the REST request through `$http`.
     *
     * Request-specific options override backend defaults.
     */
    request(request) {
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
