import { _httpParamSerializer, _injector, _sce, _cookie } from '../../injection-tokens.js';
import { urlIsAllowedOriginFactory, trimEmptyHash } from '../../shared/url-utils/url-utils.js';
import { keys, isNullOrUndefined, isFunction, isArray, encodeUriQuery, shallowCopy, isObject, isFile, isBlob, isFormData, toJson, isDefined, isString, extend, fromJson, entries, isUndefined, isPromiseLike, isDate, minErr, uppercase, lowercase, trim, nullObject } from '../../shared/utils.js';

const APPLICATION_JSON = "application/json";
function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve: resolve, reject: reject };
}
/**
 * @internal
 */
const Http = {
    _OK: 200,
    _MultipleChoices: 300,
    _BadRequest: 400,
    _NotFound: 404,
    _ErrorMax: 599,
};
const CONTENT_TYPE_APPLICATION_JSON = {
    "Content-Type": `${APPLICATION_JSON};charset=utf-8`,
};
const JSON_START = /^\[|^\{(?!\{)/;
const JSON_ENDS = {
    "[": /]$/,
    "{": /}$/,
};
const JSON_PROTECTION_PREFIX = /^\)]\}',?\n/;
const $httpMinErr = minErr("$http");
/** Serializes a request param value into a transport-safe primitive. */
function serializeValue(v) {
    if (isObject(v)) {
        const jsonValue = isDate(v) ? v.toISOString() : toJson(v);
        return jsonValue ?? "";
    }
    return v;
}
/**
 * Default params serializer that converts objects to strings
 * according to the following rules:
 *
 * * `{'foo': 'bar'}` results in `foo=bar`
 * * `{'foo': Date.now()}` results in `foo=2015-04-01T09%3A50%3A49.262Z` (`toISOString()` and encoded representation of a Date object)
 * * `{'foo': ['bar', 'baz']}` results in `foo=bar&foo=baz` (repeated key for each array element)
 * * `{'foo': {'bar':'baz'}}` results in `foo=%7B%22bar%22%3A%22baz%22%7D` (stringified and encoded representation of an object)
 *
 * Note that serializer will sort the request parameters alphabetically.
 */
function HttpParamSerializerProvider() {
    /**
     * Returns the runtime query-parameter serializer.
     */
    this.$get = () => {
        return (params) => {
            if (!params)
                return "";
            const parts = [];
            keys(params)
                .sort()
                .forEach((key) => {
                const value = params[key];
                if (isNullOrUndefined(value) || isFunction(value))
                    return;
                if (isArray(value)) {
                    value.forEach((v) => {
                        if (isNullOrUndefined(v) || isFunction(v))
                            return;
                        const serializedValue = serializeValue(v);
                        parts.push(`${encodeUriQuery(key)}=${encodeUriQuery(String(serializedValue))}`);
                    });
                }
                else {
                    const sanitizedValue = value;
                    parts.push(`${encodeUriQuery(key)}=${encodeUriQuery(String(serializeValue(sanitizedValue)))}`);
                }
            });
            return parts.join("&");
        };
    };
}
/** Applies the default response transform, including JSON parsing. */
function defaultHttpResponseTransform(data, headers) {
    if (isString(data)) {
        // Strip json vulnerability protection prefix and trim whitespace
        const tempData = data.replace(JSON_PROTECTION_PREFIX, "").trim();
        if (tempData) {
            const contentType = headers("Content-Type");
            const hasJsonContentType = contentType && contentType.indexOf(APPLICATION_JSON) === 0;
            if (hasJsonContentType || isJsonLike(tempData)) {
                try {
                    data = fromJson(tempData);
                }
                catch (err) {
                    if (!hasJsonContentType) {
                        return data;
                    }
                    throw $httpMinErr("baddata", 'Data must be a valid JSON object. Received: "{0}". ' +
                        'Parse error: "{1}"', data, err);
                }
            }
        }
    }
    return data;
}
/** Returns `true` when a string looks like a JSON payload. */
function isJsonLike(str) {
    const jsonStart = str.match(JSON_START);
    return !!jsonStart && JSON_ENDS[jsonStart[0]].test(str);
}
/**
 * Parses headers into a key-value object.
 *
 * @param headers - Raw headers as a string.
 * @returns A normalized header map keyed by lowercase header name.
 */
function parseHeaders(headers) {
    const parsed = nullObject();
    let i;
    /** Adds a parsed header entry to the result map. */
    function fillInParsed(key, val) {
        if (key) {
            parsed[key] = parsed[key] ? `${parsed[key]}, ${val}` : val;
        }
    }
    if (isString(headers)) {
        headers.split("\n").forEach(
        /** @param line */
        (line) => {
            i = line.indexOf(":");
            fillInParsed(line.substring(0, i).trim().toLowerCase(), trim(line.substring(i + 1)));
        });
    }
    else if (isObject(headers)) {
        entries(headers).forEach(([headerKey, headerVal]) => {
            fillInParsed(headerKey.toLowerCase(), trim(headerVal));
        });
    }
    return parsed;
}
/**
 * Creates a function that provides access to parsed headers.
 *
 * Headers are lazy parsed when first requested.
 * @see parseHeaders
 *
 * @param headers - Headers to provide access to.
 * @returns A getter function that, when called with:
 *
 *   - an argument, returns a single header value (empty string if missing)
 *   - no arguments, returns an object containing all headers.
 */
function headersGetter(headers) {
    let headersObj;
    const getter = ((name) => {
        if (!headersObj)
            headersObj = parseHeaders(headers);
        if (name) {
            const value = headersObj[name.toLowerCase()];
            return value ?? "";
        }
        return headersObj;
    });
    return getter;
}
/**
 * Applies one or more transform functions to request or response data.
 *
 * @param data - Data to transform.
 * @param headers - HTTP headers getter function.
 * @param status - HTTP status code of the response.
 * @param [fns] - Function or an array of functions.
 * @returns The transformed value after all configured transforms run.
 */
function transformData(data, headers, status, fns) {
    if (isFunction(fns)) {
        return fns(data, headers, status);
    }
    if (isArray(fns)) {
        fns.forEach((fn) => {
            data = fn(data, headers, status);
        });
    }
    return data;
}
/** Returns `true` when an HTTP status is in the success range. */
function isSuccess(status) {
    return status >= Http._OK && status < Http._MultipleChoices;
}
/** Configures the default behavior of the `$http` service. */
function HttpProvider() {
    /**
     * Default values applied to all `$http` requests unless a request overrides them.
     *
     * This includes cache behavior, default headers, request/response transforms, XSRF names,
     * credentials defaults, and parameter serialization.
     */
    const defaults = (this.defaults = {
        // transform incoming response data
        transformResponse: [defaultHttpResponseTransform],
        // transform outgoing request data
        transformRequest: [
            function (data) {
                return isObject(data) &&
                    !isFile(data) &&
                    !isBlob(data) &&
                    !isFormData(data)
                    ? toJson(data)
                    : data;
            },
        ],
        // default headers
        headers: {
            common: {
                Accept: "application/json, text/plain, */*",
            },
            post: shallowCopy(CONTENT_TYPE_APPLICATION_JSON),
            put: shallowCopy(CONTENT_TYPE_APPLICATION_JSON),
            patch: shallowCopy(CONTENT_TYPE_APPLICATION_JSON),
        },
        xsrfCookieName: "XSRF-TOKEN",
        xsrfHeaderName: "X-XSRF-TOKEN",
        paramSerializer: _httpParamSerializer,
    });
    let useApplyAsync = false;
    /**
     * Configure $http service to combine processing of multiple http responses received at around
     * the same time via {@link ng.$rootScope.Scope#$applyAsync $rootScope.$applyAsync}. This can result in
     * significant performance improvement for bigger applications that make many HTTP requests
     * concurrently (common during application bootstrap).
     *
     * Defaults to false. If no value is specified, returns the current configured value.
     *
     * @param value - If true, completed requests schedule a deferred apply on the next tick,
     *   allowing nearby responses to share the same digest cycle.
     *
     * @returns The `$httpProvider` for chaining when setting a value, otherwise the current flag.
     */
    this.useApplyAsync = function (value) {
        if (isDefined(value)) {
            useApplyAsync = !!value;
            return this;
        }
        return useApplyAsync;
    };
    /**
     * Array containing service factories for all synchronous or asynchronous `$http`
     * pre-processing of request or postprocessing of responses.
     *
     * These service factories are ordered by request, i.e. they are applied in the same order as the
     * array, on request, but reverse order, on response.
     *
     * See the `$http` service documentation for detailed interceptor behavior.
     */
    this.interceptors = [];
    /**
     * Array containing URLs whose origins are trusted to receive the XSRF token. See the
     * See the `$http` service documentation for XSRF security considerations.
     *
     * **Note:** An "origin" consists of the [URI scheme](https://en.wikipedia.org/wiki/URI_scheme),
     * the [hostname](https://en.wikipedia.org/wiki/Hostname) and the
     * [port number](https://en.wikipedia.org/wiki/Port_(computer_networking). For `http:` and
     * `https:`, the port number can be omitted when using the default ports (80 and 443 respectively).
     * Examples: `http://example.com`, `https://api.example.com:9876`
     *
     * <div class="alert alert-warning">
     *   It is not possible to trust specific URLs/paths. The `path`, `query` and `fragment` parts
     *   of a URL will be ignored. For example, `https://foo.com/path/bar?query=baz#fragment` will be
     *   treated as `https://foo.com`, meaning that **all** requests to URLs starting with
     *   `https://foo.com/` will include the XSRF token.
     * </div>
     *
     * @example
     *
     * ```js
     * // App served from `https://example.com/`.
     * angular.
     *   module('xsrfTrustedOriginsExample', []).
     *   config(['$httpProvider', function($httpProvider) {
     *     $httpProvider.xsrfTrustedOrigins.push('https://api.example.com');
     *   }]).
     *   run(['$http', function($http) {
     *     // The XSRF token will be sent.
     *     $http.get('https://api.example.com/preferences').then(...);
     *
     *     // The XSRF token will NOT be sent.
     *     $http.get('https://stats.example.com/activity').then(...);
     *   }]);
     * ```
     *
     */
    this.xsrfTrustedOrigins = [];
    const that = this;
    this.$get = [
        _injector,
        _sce,
        _cookie,
        /** Creates the runtime `$http` service. */
        function ($injector, $sce, $cookie) {
            const defaultCache = new Map();
            /**
             * Resolves the configured default param serializer to a callable function.
             */
            defaults.paramSerializer = isString(defaults.paramSerializer)
                ? $injector.get(defaults.paramSerializer)
                : defaults.paramSerializer;
            /**
             * Interceptors stored in reverse order. Inner interceptors before outer interceptors.
             * The reversal lets request interceptors wrap the server request in the expected order.
             */
            const reversedInterceptors = [];
            that.interceptors.forEach((interceptorFactory) => {
                reversedInterceptors.unshift(isString(interceptorFactory)
                    ? $injector.get(interceptorFactory)
                    : $injector.invoke(interceptorFactory));
            });
            /**
             * Creates the origin check used for XSRF header inclusion.
             */
            const urlIsAllowedOrigin = urlIsAllowedOriginFactory(that.xsrfTrustedOrigins);
            /**
             * Issues an HTTP request using the provider defaults and configured interceptors.
             */
            const $http = function (requestConfig) {
                if (!isObject(requestConfig)) {
                    throw minErr("$http")("badreq", "Http request configuration must be an object.  Received: {0}", requestConfig);
                }
                if (!isString($sce.valueOf(requestConfig.url))) {
                    throw minErr("$http")("badreq", "Http request configuration url must be a string or a $sce trusted object.  Received: {0}", requestConfig.url);
                }
                const config = extend({
                    method: "get",
                    transformRequest: defaults.transformRequest,
                    transformResponse: defaults.transformResponse,
                    paramSerializer: defaults.paramSerializer,
                }, requestConfig);
                config.headers = mergeHeaders(requestConfig);
                config.method = uppercase(config.method);
                config.paramSerializer = isString(config.paramSerializer)
                    ? $injector.get(config.paramSerializer)
                    : config.paramSerializer;
                const requestInterceptors = [];
                const responseInterceptors = [];
                let promise = Promise.resolve(config);
                // apply interceptors
                reversedInterceptors.forEach((interceptor) => {
                    if (interceptor.request || interceptor.requestError) {
                        requestInterceptors.unshift(interceptor.request, interceptor.requestError);
                    }
                    if (interceptor.response || interceptor.responseError) {
                        responseInterceptors.push(interceptor.response, interceptor.responseError);
                    }
                });
                promise = chainInterceptors(promise, requestInterceptors);
                promise = promise.then(serverRequest);
                promise = chainInterceptors(promise, responseInterceptors);
                return promise;
                /** Applies a list of interceptor success/error pairs to a promise chain. */
                function chainInterceptors(promiseParam, interceptors) {
                    for (let i = 0, ii = interceptors.length; i < ii;) {
                        const thenFn = interceptors[i++];
                        const rejectFn = interceptors[i++];
                        promiseParam = promiseParam.then(thenFn, rejectFn);
                    }
                    interceptors.length = 0;
                    return promiseParam;
                }
                /** Resolves any header factory functions against the current request configuration. */
                function executeHeaderFns(headers, configParam) {
                    let headerContent;
                    const processedHeaders = {};
                    entries(headers).forEach(([header, headerFn]) => {
                        if (isFunction(headerFn)) {
                            headerContent = headerFn(configParam);
                            if (!isNullOrUndefined(headerContent)) {
                                processedHeaders[header] = headerContent;
                            }
                        }
                        else {
                            processedHeaders[header] = headerFn;
                        }
                    });
                    return processedHeaders;
                }
                /** Merges provider defaults with request-specific headers for a single request. */
                function mergeHeaders(configParam) {
                    let defHeaders = (defaults.headers || {});
                    const reqHeaders = extend({}, configParam.headers || {});
                    defHeaders = extend({}, defHeaders.common || {}, defHeaders[lowercase(configParam.method)] || {});
                    keys(defHeaders).forEach((defHeaderName) => {
                        const lowercaseDefHeaderName = lowercase(defHeaderName);
                        const hasMatchingHeader = keys(reqHeaders).some((reqHeaderName) => {
                            return lowercase(reqHeaderName) === lowercaseDefHeaderName;
                        });
                        if (!hasMatchingHeader) {
                            reqHeaders[defHeaderName] = defHeaders[defHeaderName];
                        }
                    });
                    // execute if header value is a function for merged headers
                    return executeHeaderFns(reqHeaders, shallowCopy(configParam));
                }
                /** Executes the request pipeline and attaches response transforms. */
                function serverRequest(configParam) {
                    const headers = configParam.headers || {};
                    configParam.headers = headers;
                    const reqData = transformData(configParam.data, headersGetter(headers), undefined, configParam.transformRequest || []);
                    // strip content-type if data is undefined
                    if (isUndefined(reqData)) {
                        keys(headers).forEach((header) => {
                            if (lowercase(header) === "content-type") {
                                delete headers[header];
                            }
                        });
                    }
                    const providerDefaults = defaults;
                    if (isUndefined(configParam.withCredentials) &&
                        !isUndefined(providerDefaults.withCredentials)) {
                        configParam.withCredentials = providerDefaults.withCredentials;
                    }
                    // send request
                    return sendReq(configParam, reqData).then(transformResponse, transformResponse);
                }
                /** Applies response transforms and rejects responses outside the success range. */
                function transformResponse(response) {
                    const httpResponse = response;
                    // make a copy since the response must be cacheable
                    const resp = extend({}, httpResponse);
                    resp.data = transformData(httpResponse.data, httpResponse.headers, httpResponse.status, config.transformResponse || []);
                    return isSuccess(httpResponse.status) ? resp : Promise.reject(resp);
                }
            };
            $http.pendingRequests = [];
            createShortMethods("get", "delete", "head");
            createShortMethodsWithData("post", "put", "patch");
            /**
             * Exposes the runtime equivalent of `$httpProvider.defaults`.
             * It allows configuration of default headers, `withCredentials`, and request/response transforms.
             *
             * See "Setting HTTP Headers" and "Transforming Requests and Responses" sections above.
             */
            $http.defaults = defaults;
            return $http;
            /** Generates shorthand methods for requests that do not send a request body. */
            function createShortMethods(...names) {
                names.forEach((name) => {
                    $http[name] = function (url, config) {
                        return $http(extend({}, config || {}, {
                            method: name,
                            url,
                        }));
                    };
                });
            }
            /** Generates shorthand methods for requests that send a request body. */
            function createShortMethodsWithData(...names) {
                names.forEach((name) => {
                    $http[name] = function (url, data, config) {
                        return $http(extend({}, config || {}, {
                            method: name,
                            url,
                            data,
                        }));
                    };
                });
            }
            /** Sends the request through the low-level HTTP backend and cache layer. */
            function sendReq(config, reqData) {
                const { promise, resolve, reject } = withResolvers();
                let cache;
                let cachedResp;
                const reqHeaders = config.headers || {};
                config.headers = reqHeaders;
                let { url } = config;
                if (!isString(url)) {
                    // If it is not a string then the URL must be a $sce trusted object
                    url = $sce.valueOf(url);
                }
                const paramSerializer = config.paramSerializer;
                url = buildUrl(url, paramSerializer(config.params));
                $http.pendingRequests.push(config);
                promise.then(removePendingReq, removePendingReq);
                if ((config.cache || defaults.cache) &&
                    config.cache !== false &&
                    config.method === "GET") {
                    const providerDefaults = defaults;
                    cache = isObject(config.cache)
                        ? config.cache
                        : isObject(providerDefaults.cache)
                            ? providerDefaults.cache
                            : defaultCache;
                }
                if (cache) {
                    cachedResp = cache.get(url);
                    if (isDefined(cachedResp)) {
                        if (isPromiseLike(cachedResp)) {
                            // cached request has already been sent, but there is no response yet
                            cachedResp.then(resolvePromiseWithResult, resolvePromiseWithResult);
                        }
                        else {
                            // serving from cache
                            if (isArray(cachedResp)) {
                                resolvePromise(cachedResp[1], cachedResp[0], shallowCopy(cachedResp[2]), cachedResp[3], cachedResp[4]);
                            }
                            else {
                                resolvePromise(cachedResp, Http._OK, {}, "OK", "complete");
                            }
                        }
                    }
                    else {
                        // put the promise for the non-transformed response into cache as a placeholder
                        cache.set(url, promise);
                    }
                }
                // if we won't have the response in cache, set the xsrf headers and
                // send the request to the backend
                if (isUndefined(cachedResp)) {
                    const xsrfCookieName = config.xsrfCookieName || defaults.xsrfCookieName;
                    const xsrfValue = xsrfCookieName && urlIsAllowedOrigin(config.url)
                        ? $cookie.getAll()[xsrfCookieName]
                        : undefined;
                    if (xsrfValue) {
                        const xsrfHeaderName = config.xsrfHeaderName || defaults.xsrfHeaderName;
                        if (xsrfHeaderName) {
                            reqHeaders[xsrfHeaderName] = xsrfValue;
                        }
                    }
                    http(config.method, url, reqData, done, reqHeaders, config.timeout, config.withCredentials, config.responseType, createApplyHandlers(config.eventHandlers), createApplyHandlers(config.uploadEventHandlers));
                }
                return promise;
                /** Wraps raw XHR event handlers so they execute within Angular's apply flow. */
                function createApplyHandlers(eventHandlers) {
                    if (eventHandlers) {
                        const applyHandlers = {};
                        entries(eventHandlers).forEach(([key, eventHandler]) => {
                            applyHandlers[key] = function (event) {
                                if (useApplyAsync) {
                                    setTimeout(() => callEventHandler());
                                }
                                else {
                                    callEventHandler();
                                }
                                function callEventHandler() {
                                    if (isFunction(eventHandler)) {
                                        eventHandler(event);
                                    }
                                    else if (eventHandler &&
                                        typeof eventHandler === "object" &&
                                        "handleEvent" in eventHandler) {
                                        eventHandler.handleEvent(event);
                                    }
                                }
                            };
                        });
                        return applyHandlers;
                    }
                    else {
                        return {};
                    }
                }
                /** Handles a low-level XHR completion, updates cache state, and settles the raw `$http` promise. */
                function done(status, response, headersString, statusText, xhrStatus) {
                    if (cache) {
                        if (isSuccess(status)) {
                            cache.set(url, [
                                status,
                                response,
                                parseHeaders(headersString || ""),
                                statusText,
                                xhrStatus,
                            ]);
                        }
                        else {
                            // remove promise from the cache
                            cache.delete(url);
                        }
                    }
                    function resolveHttpPromise() {
                        resolvePromise(response, status, headersString, statusText, xhrStatus);
                    }
                    if (useApplyAsync) {
                        setTimeout(resolveHttpPromise);
                    }
                    else {
                        resolveHttpPromise();
                    }
                }
                /** Resolves or rejects the raw `$http` promise from a low-level XHR callback payload. */
                function resolvePromise(response, status, headers, statusText, xhrStatus) {
                    // status: HTTP response status code, 0, -1 (aborted by timeout / promise)
                    status = status >= -1 ? status : 0;
                    (isSuccess(status) ? resolve : reject)({
                        data: response,
                        status,
                        headers: headersGetter(headers ?? ""),
                        config,
                        statusText,
                        xhrStatus,
                    });
                }
                /** Settles the raw `$http` promise from a cached or intercepted response object. */
                function resolvePromiseWithResult(result) {
                    resolvePromise(result.data, result.status, shallowCopy(result.headers()), result.statusText, result.xhrStatus);
                }
                /** Removes the finished request config from `$http.pendingRequests`. */
                function removePendingReq() {
                    const idx = $http.pendingRequests.indexOf(config);
                    if (idx !== -1)
                        $http.pendingRequests.splice(idx, 1);
                }
            }
            /** Appends a serialized query string to a URL when request parameters are present. */
            function buildUrl(url, serializedParams) {
                if (serializedParams.length > 0) {
                    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
                }
                return url;
            }
        },
    ];
}
/**
 * Sends a low-level `XMLHttpRequest` using AngularTS-compatible callback and timeout semantics.
 *
 * @param method - The HTTP method (for example, `"GET"` or `"POST"`).
 * @param [url] - The request URL. Defaults to the current page URL.
 * @param [post] - Optional request body.
 * @param [callback] - Completion callback invoked when the request settles.
 * @param [headers] - Request headers to apply before sending.
 * @param [timeout] - Timeout in milliseconds or a cancellable promise.
 * @param [withCredentials] - Whether to send credentials with the request.
 * @param [responseType] - The expected XHR response type.
 * @param [eventHandlers] - Event listeners attached to the `XMLHttpRequest` instance.
 * @param [uploadEventHandlers] - Event listeners attached to `XMLHttpRequest.upload`.
 */
function http(method, url, post, callback, headers, timeout, withCredentials, responseType, eventHandlers, uploadEventHandlers) {
    url = url || trimEmptyHash(window.location.href);
    const xhr = new XMLHttpRequest();
    let abortedByTimeout = false;
    let timeoutId;
    xhr.open(method, url, true);
    if (headers) {
        for (const [key, value] of entries(headers)) {
            if (isDefined(value)) {
                xhr.setRequestHeader(key, value);
            }
        }
    }
    xhr.onload = () => {
        let status = xhr.status || 0;
        const statusText = xhr.statusText || "";
        if (status === 0) {
            status = xhr.response
                ? Http._OK
                : new URL(url).protocol === "file:"
                    ? Http._NotFound
                    : 0;
        }
        completeRequest(status, xhr.response, xhr.getAllResponseHeaders(), statusText, "complete");
    };
    xhr.onerror = () => completeRequest(-1, null, null, "", "error");
    xhr.ontimeout = () => completeRequest(-1, null, null, "", "timeout");
    xhr.onabort = () => {
        completeRequest(-1, null, null, "", abortedByTimeout ? "timeout" : "abort");
    };
    if (eventHandlers) {
        for (const [key, handler] of entries(eventHandlers)) {
            xhr.addEventListener(key, handler);
        }
    }
    if (uploadEventHandlers) {
        for (const [key, handler] of entries(uploadEventHandlers)) {
            xhr.upload.addEventListener(key, handler);
        }
    }
    if (withCredentials) {
        xhr.withCredentials = true;
    }
    if (responseType) {
        try {
            xhr.responseType = responseType;
        }
        catch (err) {
            if (responseType !== "json")
                throw err;
        }
    }
    xhr.send(isUndefined(post) ? null : post);
    if (typeof timeout === "number" && timeout > 0) {
        timeoutId = setTimeout(() => timeoutRequest("timeout"), timeout);
    }
    else if (isPromiseLike(timeout)) {
        timeout.then(() => {
            timeoutRequest("abort");
        });
    }
    /** Aborts the underlying XHR due to timeout expiry or external cancellation. */
    function timeoutRequest(reason) {
        abortedByTimeout = reason === "timeout";
        if (xhr)
            xhr.abort();
    }
    /**
     * Finalizes the request, clears timeout state, and notifies the caller.
     *
     * @param status - HTTP status code or `-1` for network errors.
     * @param response - Parsed or raw response payload from the server.
     * @param headersString - Raw response headers as a string.
     * @param statusText - HTTP status text returned by the server.
     * @param xhrStatus - Final transport status reported for the request.
     */
    function completeRequest(status, response, headersString, statusText, xhrStatus) {
        if (isDefined(timeoutId)) {
            clearTimeout(timeoutId);
        }
        if (callback) {
            callback(status, response, headersString, statusText, xhrStatus);
        }
    }
}

export { Http, HttpParamSerializerProvider, HttpProvider, defaultHttpResponseTransform, http };
