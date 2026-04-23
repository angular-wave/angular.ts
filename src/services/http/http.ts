import {
  trimEmptyHash,
  urlIsAllowedOriginFactory,
} from "../../shared/url-utils/url-utils.ts";
import {
  encodeUriQuery,
  entries,
  extend,
  fromJson,
  isArray,
  isBlob,
  isDate,
  isDefined,
  isFile,
  isFormData,
  isFunction,
  isNullOrUndefined,
  isObject,
  isPromiseLike,
  isString,
  isUndefined,
  keys,
  lowercase,
  minErr,
  nullObject,
  shallowCopy,
  toJson,
  trim,
  uppercase,
} from "../../shared/utils.ts";
import { $injectTokens as $t } from "../../injection-tokens.ts";

const APPLICATION_JSON = "application/json";

function withResolvers<T>() {
  let resolve: (value: T | PromiseLike<T>) => void;

  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

export interface HttpHeadersGetter {
  (): { [name: string]: string };
  (headerName: string): string;
}

export interface HttpRequestConfigHeaders {
  /** @internal */
  [requestType: string]: any;
  common?: any;
  get?: any;
  post?: any;
  put?: any;
  patch?: any;
}

// See the jsdoc for transformData() at https://github.com/angular/angular.ts/blob/master/src/ng/http.js#L228
export interface HttpRequestTransformer {
  (data: any, headersGetter: HttpHeadersGetter): any;
}

// The definition of fields are the same as HttpResponse
export interface HttpResponseTransformer {
  (data: any, headersGetter: HttpHeadersGetter, status: number): any;
}

export interface HttpHeaderType {
  /** @internal */
  [requestType: string]: string | ((config: RequestConfig) => string);
}

/**
 * Default request settings exposed through `$httpProvider.defaults`.
 *
 * Not every `RequestShortcutConfig` field is supported here; this shape only includes the
 * fields that the runtime reads from provider-level defaults.
 *
 * https://docs.angularjs.org/api/ng/service/$http#defaults
 * https://docs.angularjs.org/api/ng/service/$http#usage
 * https://docs.angularjs.org/api/ng/provider/$httpProvider The properties section
 */
export interface HttpProviderDefaults {
  cache?: any;
  transformRequest?:
    | HttpRequestTransformer
    | HttpRequestTransformer[]
    | undefined;
  transformResponse?:
    | HttpResponseTransformer
    | HttpResponseTransformer[]
    | undefined;
  headers?: HttpRequestConfigHeaders | undefined;
  xsrfHeaderName?: string | undefined;
  xsrfCookieName?: string | undefined;
  withCredentials?: boolean | undefined;
  paramSerializer?: string | ((obj: any) => string) | undefined;
}

/**
 * Request options shared by the `$http` shortcut methods.
 * See http://docs.angularjs.org/api/ng/service/$http#usage
 */
export interface RequestShortcutConfig extends HttpProviderDefaults {
  params?: any;
  data?: any;
  timeout?: number | Promise<any> | undefined;
  responseType?: string | undefined;
}

/**
 * Full request configuration accepted by `$http(...)`.
 * See http://docs.angularjs.org/api/ng/service/$http#usage
 */
export interface RequestConfig extends RequestShortcutConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  url: string;
  eventHandlers?: Record<string, EventListenerOrEventListenerObject>;
  uploadEventHandlers?: Record<string, EventListenerOrEventListenerObject>;
}

export type HttpMethod = RequestConfig["method"];

export type HttpResponseStatus = "complete" | "error" | "timeout" | "abort";

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: HttpHeadersGetter;
  config: RequestConfig;
  statusText: string;
  xhrStatus: HttpResponseStatus;
}

export type HttpPromise<T> = Promise<HttpResponse<T>>;

/** Runtime surface of the `$http` service and its shorthand request methods. */
export interface HttpService {
  <T>(config: RequestConfig): HttpPromise<T>;
  get<T>(url: string, config?: RequestShortcutConfig): HttpPromise<T>;
  delete<T>(url: string, config?: RequestShortcutConfig): HttpPromise<T>;
  head<T>(url: string, config?: RequestShortcutConfig): HttpPromise<T>;
  post<T>(
    url: string,
    data: any,
    config?: RequestShortcutConfig,
  ): HttpPromise<T>;
  put<T>(
    url: string,
    data: any,
    config?: RequestShortcutConfig,
  ): HttpPromise<T>;
  patch<T>(
    url: string,
    data: any,
    config?: RequestShortcutConfig,
  ): HttpPromise<T>;
  defaults: HttpProviderDefaults;
  pendingRequests: RequestConfig[];
}

/** Query parameter bag that can be serialized into a URL query string. */
export type HttpParams = Record<
  string,
  string | number | boolean | null | undefined | unknown[]
>;

/** Function that serializes query params into a URL-encoded string. */
export type HttpParamSerializer = (params?: HttpParams) => string;

export interface HttpInterceptor {
  request?(config: RequestConfig): RequestConfig | Promise<RequestConfig>;
  requestError?(rejection: any): RequestConfig | Promise<RequestConfig>;
  response?<T>(
    response: HttpResponse<T>,
  ): Promise<HttpResponse<T>> | HttpResponse<T>;
  responseError?<T>(rejection: any): Promise<HttpResponse<T>> | HttpResponse<T>;
}

export type HttpInterceptorFactory = () => HttpInterceptor;

/**
 * @internal
 */
export const Http = {
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

const JSON_ENDS: Record<string, RegExp> = {
  "[": /]$/,
  "{": /}$/,
};

const JSON_PROTECTION_PREFIX = /^\)]\}',?\n/;

const $httpMinErr = minErr("$http");

/** Serializes a request param value into a transport-safe primitive. */
function serializeValue(
  v: string | number | boolean | Record<string, any> | Date,
): string | number | boolean {
  if (isObject(v)) {
    const jsonValue = isDate(v) ? v.toISOString() : toJson(v);

    return jsonValue ?? "";
  }

  return v as string | number | boolean;
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
export function HttpParamSerializerProvider(this: {
  $get?: () => HttpParamSerializer;
}): void {
  /**
   * Returns the runtime query-parameter serializer.
   */
  this.$get = () => {
    return (params: Record<string, any> | null | undefined) => {
      if (!params) return "";
      const parts: string[] = [];

      keys(params)
        .sort()
        .forEach((key) => {
          const value = params[key as string];

          if (isNullOrUndefined(value) || isFunction(value)) return;

          if (isArray(value)) {
            (value as any[]).forEach((v) => {
              if (isNullOrUndefined(v) || isFunction(v)) return;

              const serializedValue = serializeValue(
                v as string | number | boolean | Record<string, any> | Date,
              );

              parts.push(
                `${encodeUriQuery(key as string)}=${encodeUriQuery(String(serializedValue))}`,
              );
            });
          } else {
            const sanitizedValue = value as
              | string
              | number
              | boolean
              | Record<string, any>
              | Date;

            parts.push(
              `${encodeUriQuery(key as string)}=${encodeUriQuery(String(serializeValue(sanitizedValue)))}`,
            );
          }
        });

      return parts.join("&");
    };
  };
}

/** Applies the default response transform, including JSON parsing. */
export function defaultHttpResponseTransform(
  data: unknown,
  headers: (arg0: string) => any,
): unknown {
  if (isString(data)) {
    // Strip json vulnerability protection prefix and trim whitespace
    const tempData = data.replace(JSON_PROTECTION_PREFIX, "").trim();

    if (tempData) {
      const contentType = headers("Content-Type");

      const hasJsonContentType =
        contentType && contentType.indexOf(APPLICATION_JSON) === 0;

      if (hasJsonContentType || isJsonLike(tempData)) {
        try {
          data = fromJson(tempData);
        } catch (err) {
          if (!hasJsonContentType) {
            return data;
          }
          throw $httpMinErr(
            "baddata",
            'Data must be a valid JSON object. Received: "{0}". ' +
              'Parse error: "{1}"',
            data,
            err,
          );
        }
      }
    }
  }

  return data;
}

/** Returns `true` when a string looks like a JSON payload. */
function isJsonLike(str: string): boolean {
  const jsonStart = str.match(JSON_START);

  return !!jsonStart && JSON_ENDS[jsonStart[0]].test(str);
}

/**
 * Parses headers into a key-value object.
 *
 * @param headers - Raw headers as a string.
 * @returns A normalized header map keyed by lowercase header name.
 */
function parseHeaders(headers: string | object): Record<string, string> {
  const parsed: Record<string, string> = nullObject();

  let i;

  /** Adds a parsed header entry to the result map. */
  function fillInParsed(key: string, val: any): void {
    if (key) {
      parsed[key] = parsed[key] ? `${parsed[key]}, ${val}` : val;
    }
  }

  if (isString(headers)) {
    headers.split("\n").forEach(
      /** @param line */
      (line) => {
        i = line.indexOf(":");
        fillInParsed(
          line.substring(0, i).trim().toLowerCase(),
          trim(line.substring(i + 1)),
        );
      },
    );
  } else if (isObject(headers)) {
    entries(headers as Record<string, string>).forEach(
      ([headerKey, headerVal]) => {
        fillInParsed(headerKey.toLowerCase(), trim(headerVal));
      },
    );
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
function headersGetter(headers: string | object): HttpHeadersGetter {
  let headersObj: Record<string, string> | undefined;

  const getter = ((name?: string) => {
    if (!headersObj) headersObj = parseHeaders(headers);

    if (name) {
      const value = headersObj[name.toLowerCase()];

      return value ?? "";
    }

    return headersObj;
  }) as HttpHeadersGetter;

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
function transformData(
  data: any,
  headers: HttpHeadersGetter,
  status?: number,
  fns?: ((...args: any[]) => any) | Array<(...args: any[]) => any>,
): any {
  if (isFunction(fns)) {
    return fns(data, headers, status);
  }

  if (isArray(fns)) {
    (fns as Array<(...args: any[]) => any>).forEach((fn) => {
      data = fn(data, headers, status);
    });
  }

  return data;
}

/** Returns `true` when an HTTP status is in the success range. */
function isSuccess(status: number): boolean {
  return status >= Http._OK && status < Http._MultipleChoices;
}

/** Configures the default behavior of the {@link ng.$http $http} service. */
export function HttpProvider(this: any): void {
  /**
   * Default values applied to all {@link ng.$http $http} requests unless a request overrides them.
   *
   * This includes cache behavior, default headers, request/response transforms, XSRF names,
   * credentials defaults, and parameter serialization.
   */
  const defaults: HttpProviderDefaults = (this.defaults = {
    // transform incoming response data
    transformResponse: [defaultHttpResponseTransform],
    // transform outgoing request data
    transformRequest: [
      function (data: any) {
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
    paramSerializer: $t._httpParamSerializer,
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
  this.useApplyAsync = function (value?: boolean) {
    if (isDefined(value)) {
      useApplyAsync = !!value;

      return this;
    }

    return useApplyAsync;
  };

  /**
   * Array containing service factories for all synchronous or asynchronous {@link ng.$http $http}
   * pre-processing of request or postprocessing of responses.
   *
   * These service factories are ordered by request, i.e. they are applied in the same order as the
   * array, on request, but reverse order, on response.
   *
   * {@link ng.$http#interceptors Interceptors detailed info}
   */
  this.interceptors = [] as Array<
    string | ng.Injectable<HttpInterceptorFactory>
  >;

  /**
   * Array containing URLs whose origins are trusted to receive the XSRF token. See the
   * {@link ng.$http#security-considerations Security Considerations} sections for more details on
   * XSRF.
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
  this.xsrfTrustedOrigins = [] as string[];

  const that = this as {
    interceptors: Array<string | ng.Injectable<HttpInterceptorFactory>>;
    xsrfTrustedOrigins: string[];
    defaults: HttpProviderDefaults;
  };

  this.$get = [
    $t._injector,
    $t._sce,
    $t._cookie,
    /** Creates the runtime `$http` service. */
    function (
      $injector: ng.InjectorService,
      $sce: ng.SceService,
      $cookie: ng.CookieService,
    ) {
      const defaultCache = new Map<string, any>();

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
      const reversedInterceptors: any[] = [];

      that.interceptors.forEach((interceptorFactory: any) => {
        reversedInterceptors.unshift(
          isString(interceptorFactory)
            ? $injector.get(interceptorFactory)
            : $injector.invoke(interceptorFactory),
        );
      });

      /**
       * Creates the origin check used for XSRF header inclusion.
       */
      const urlIsAllowedOrigin = urlIsAllowedOriginFactory(
        that.xsrfTrustedOrigins,
      );

      /**
       * Issues an HTTP request using the provider defaults and configured interceptors.
       */
      const $http = function (requestConfig: ng.RequestConfig) {
        if (!isObject(requestConfig)) {
          throw minErr("$http")(
            "badreq",
            "Http request configuration must be an object.  Received: {0}",
            requestConfig,
          );
        }

        if (!isString($sce.valueOf(requestConfig.url))) {
          throw minErr("$http")(
            "badreq",
            "Http request configuration url must be a string or a $sce trusted object.  Received: {0}",
            requestConfig.url,
          );
        }

        const config = extend(
          {
            method: "get",
            transformRequest: defaults.transformRequest,
            transformResponse: defaults.transformResponse,
            paramSerializer: defaults.paramSerializer,
          },
          requestConfig,
        ) as ng.RequestConfig;

        config.headers = mergeHeaders(requestConfig);
        config.method = uppercase(config.method) as ng.HttpMethod;
        config.paramSerializer = isString(config.paramSerializer)
          ? $injector.get(config.paramSerializer)
          : config.paramSerializer;

        const requestInterceptors: Array<((value: any) => any) | undefined> =
          [];

        const responseInterceptors: Array<((value: any) => any) | undefined> =
          [];

        let promise: Promise<any> = Promise.resolve(config);

        // apply interceptors
        reversedInterceptors.forEach((interceptor) => {
          if (interceptor.request || interceptor.requestError) {
            requestInterceptors.unshift(
              interceptor.request,
              interceptor.requestError,
            );
          }

          if (interceptor.response || interceptor.responseError) {
            responseInterceptors.push(
              interceptor.response,
              interceptor.responseError,
            );
          }
        });

        promise = chainInterceptors(promise, requestInterceptors);
        promise = promise.then(serverRequest);
        promise = chainInterceptors(promise, responseInterceptors);

        return promise as HttpPromise<any>;

        /** Applies a list of interceptor success/error pairs to a promise chain. */
        function chainInterceptors(
          promiseParam: Promise<any>,
          interceptors: Array<((value: any) => any) | undefined>,
        ): Promise<any> {
          for (let i = 0, ii = interceptors.length; i < ii; ) {
            const thenFn = interceptors[i++];

            const rejectFn = interceptors[i++];

            promiseParam = promiseParam.then(thenFn, rejectFn);
          }

          interceptors.length = 0;

          return promiseParam;
        }

        /** Resolves any header factory functions against the current request configuration. */
        function executeHeaderFns(
          headers: HttpHeaderType,
          configParam: ng.RequestConfig,
        ): Record<string, string> {
          let headerContent: any;

          const processedHeaders: Record<string, string> = {};

          entries(headers).forEach(([header, headerFn]) => {
            if (isFunction(headerFn)) {
              headerContent = headerFn(configParam);

              if (!isNullOrUndefined(headerContent)) {
                processedHeaders[header] = headerContent;
              }
            } else {
              processedHeaders[header] = headerFn;
            }
          });

          return processedHeaders;
        }

        /** Merges provider defaults with request-specific headers for a single request. */
        function mergeHeaders(
          configParam: ng.RequestConfig,
        ): Record<string, string> {
          let defHeaders = (defaults.headers || {}) as HttpRequestConfigHeaders;

          const reqHeaders = extend(
            {},
            configParam.headers || {},
          ) as HttpHeaderType;

          defHeaders = extend(
            {},
            defHeaders.common || {},
            defHeaders[lowercase(configParam.method)] || {},
          );

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
        function serverRequest(configParam: ng.RequestConfig): Promise<any> {
          const headers = configParam.headers || {};

          configParam.headers = headers;

          const reqData = transformData(
            configParam.data,
            headersGetter(headers),
            undefined,
            (configParam.transformRequest as
              | ((...args: any[]) => any)
              | Array<(...args: any[]) => any>
              | undefined) || [],
          );

          // strip content-type if data is undefined
          if (isUndefined(reqData)) {
            keys(headers).forEach((header) => {
              if (lowercase(header) === "content-type") {
                delete headers[header];
              }
            });
          }

          const providerDefaults = defaults as HttpProviderDefaults;

          if (
            isUndefined(configParam.withCredentials) &&
            !isUndefined(providerDefaults.withCredentials)
          ) {
            configParam.withCredentials = providerDefaults.withCredentials;
          }

          // send request
          return sendReq(configParam, reqData).then(
            transformResponse,
            transformResponse,
          );
        }

        /** Applies response transforms and rejects responses outside the success range. */
        function transformResponse(response: any) {
          const httpResponse = response as HttpResponse<any>;

          // make a copy since the response must be cacheable
          const resp = extend({}, httpResponse) as HttpResponse<any>;

          resp.data = transformData(
            httpResponse.data,
            httpResponse.headers,
            httpResponse.status,
            (config.transformResponse as
              | ((...args: any[]) => any)
              | Array<(...args: any[]) => any>
              | undefined) || [],
          );

          return isSuccess(httpResponse.status) ? resp : Promise.reject(resp);
        }
      } as unknown as ng.HttpService & {
        pendingRequests: ng.RequestConfig[];
        defaults: HttpProviderDefaults;
        [key: string]: any;
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
      function createShortMethods(
        ...names: Array<"get" | "delete" | "head">
      ): void {
        names.forEach((name) => {
          $http[name] = function (url: string, config?: RequestShortcutConfig) {
            return $http(
              extend({}, config || {}, {
                method: name,
                url,
              }) as ng.RequestConfig,
            );
          };
        });
      }

      /** Generates shorthand methods for requests that send a request body. */
      function createShortMethodsWithData(
        ...names: Array<"post" | "put" | "patch">
      ): void {
        names.forEach((name) => {
          $http[name] = function (
            url: string,
            data: string | object,
            config?: RequestShortcutConfig,
          ) {
            return $http(
              extend({}, config || {}, {
                method: name,
                url,
                data,
              }) as ng.RequestConfig,
            );
          };
        });
      }

      /** Sends the request through the low-level HTTP backend and cache layer. */
      function sendReq(config: ng.RequestConfig, reqData: any) {
        const { promise, resolve, reject } = withResolvers();

        let cache: any;

        let cachedResp: any;

        const reqHeaders = config.headers || {};

        config.headers = reqHeaders;

        let { url } = config;

        if (!isString(url)) {
          // If it is not a string then the URL must be a $sce trusted object
          url = $sce.valueOf(url);
        }

        const paramSerializer = config.paramSerializer as HttpParamSerializer;

        url = buildUrl(url, paramSerializer(config.params));

        $http.pendingRequests.push(config);
        promise.then(removePendingReq, removePendingReq);

        if (
          (config.cache || (defaults as HttpProviderDefaults).cache) &&
          config.cache !== false &&
          config.method === "GET"
        ) {
          const providerDefaults = defaults as HttpProviderDefaults;

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
              cachedResp.then(
                resolvePromiseWithResult,
                resolvePromiseWithResult,
              );
            } else {
              // serving from cache
              if (isArray(cachedResp)) {
                resolvePromise(
                  cachedResp[1],
                  cachedResp[0] as number,
                  shallowCopy(cachedResp[2]) as Record<string, string>,
                  cachedResp[3] as string,
                  cachedResp[4] as HttpResponseStatus,
                );
              } else {
                resolvePromise(cachedResp, Http._OK, {}, "OK", "complete");
              }
            }
          } else {
            // put the promise for the non-transformed response into cache as a placeholder
            cache.set(url, promise);
          }
        }

        // if we won't have the response in cache, set the xsrf headers and
        // send the request to the backend
        if (isUndefined(cachedResp)) {
          const xsrfCookieName =
            config.xsrfCookieName || defaults.xsrfCookieName;

          const xsrfValue =
            xsrfCookieName && urlIsAllowedOrigin(config.url)
              ? $cookie.getAll()[xsrfCookieName]
              : undefined;

          if (xsrfValue) {
            const xsrfHeaderName =
              config.xsrfHeaderName || defaults.xsrfHeaderName;

            if (xsrfHeaderName) {
              reqHeaders[xsrfHeaderName] = xsrfValue;
            }
          }

          http(
            config.method,
            url,
            reqData,
            done,
            reqHeaders,
            config.timeout,
            config.withCredentials,
            config.responseType as XMLHttpRequestResponseType | undefined,
            createApplyHandlers(config.eventHandlers),
            createApplyHandlers(config.uploadEventHandlers),
          );
        }

        return promise;

        /** Wraps raw XHR event handlers so they execute within Angular's apply flow. */
        function createApplyHandlers(
          eventHandlers:
            | ng.RequestConfig["eventHandlers"]
            | ng.RequestConfig["uploadEventHandlers"],
        ): Record<string, EventListener> {
          if (eventHandlers) {
            const applyHandlers: Record<string, EventListener> = {};

            entries(eventHandlers).forEach(([key, eventHandler]) => {
              applyHandlers[key] = function (event: Event) {
                if (useApplyAsync) {
                  setTimeout(() => callEventHandler());
                } else {
                  callEventHandler();
                }

                function callEventHandler() {
                  if (typeof eventHandler === "function") {
                    eventHandler(event);
                  } else if (
                    eventHandler &&
                    typeof eventHandler === "object" &&
                    "handleEvent" in eventHandler
                  ) {
                    (eventHandler as EventListenerObject).handleEvent(event);
                  }
                }
              };
            });

            return applyHandlers;
          } else {
            return {};
          }
        }

        /** Handles a low-level XHR completion, updates cache state, and settles the raw `$http` promise. */
        function done(
          status: number,
          response: any,
          headersString: string | null,
          statusText: string,
          xhrStatus: HttpResponseStatus,
        ): void {
          if (cache) {
            if (isSuccess(status)) {
              cache.set(url, [
                status,
                response,
                parseHeaders(headersString || ""),
                statusText,
                xhrStatus,
              ]);
            } else {
              // remove promise from the cache
              cache.delete(url);
            }
          }

          function resolveHttpPromise() {
            resolvePromise(
              response,
              status,
              headersString,
              statusText,
              xhrStatus,
            );
          }

          if (useApplyAsync) {
            setTimeout(resolveHttpPromise);
          } else {
            resolveHttpPromise();
          }
        }

        /** Resolves or rejects the raw `$http` promise from a low-level XHR callback payload. */
        function resolvePromise(
          response: any,
          status: number,
          headers: string | Record<string, string> | null,
          statusText: string,
          xhrStatus: HttpResponseStatus,
        ): void {
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
        function resolvePromiseWithResult(result: HttpResponse<any>): void {
          resolvePromise(
            result.data,
            result.status,
            shallowCopy(result.headers()),
            result.statusText,
            result.xhrStatus,
          );
        }

        /** Removes the finished request config from `$http.pendingRequests`. */
        function removePendingReq() {
          const idx = $http.pendingRequests.indexOf(config);

          if (idx !== -1) $http.pendingRequests.splice(idx, 1);
        }
      }

      /** Appends a serialized query string to a URL when request parameters are present. */
      function buildUrl(url: string, serializedParams: string): string {
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
export function http(
  method: string,
  url?: string,
  post?: any,
  callback?: (
    status: number,
    response: any,
    headersString: string | null,
    statusText: string,
    xhrStatus: HttpResponseStatus,
  ) => void,
  headers?: Record<string, string | undefined>,
  timeout?: number | Promise<any>,
  withCredentials?: boolean,
  responseType?: XMLHttpRequestResponseType,
  eventHandlers?: ng.RequestConfig["eventHandlers"],
  uploadEventHandlers?: ng.RequestConfig["uploadEventHandlers"],
): void {
  url = url || trimEmptyHash(window.location.href);

  const xhr = new XMLHttpRequest();

  let abortedByTimeout = false;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

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

    completeRequest(
      status,
      xhr.response,
      xhr.getAllResponseHeaders(),
      statusText,
      "complete",
    );
  };

  xhr.onerror = () => completeRequest(-1, null, null, "", "error");
  xhr.ontimeout = () => completeRequest(-1, null, null, "", "timeout");

  xhr.onabort = () => {
    completeRequest(-1, null, null, "", abortedByTimeout ? "timeout" : "abort");
  };

  if (eventHandlers) {
    for (const [key, handler] of entries(eventHandlers)) {
      xhr.addEventListener(key, handler as EventListenerOrEventListenerObject);
    }
  }

  if (uploadEventHandlers) {
    for (const [key, handler] of entries(uploadEventHandlers)) {
      xhr.upload.addEventListener(
        key,
        handler as EventListenerOrEventListenerObject,
      );
    }
  }

  if (withCredentials) {
    xhr.withCredentials = true;
  }

  if (responseType) {
    try {
      xhr.responseType = responseType;
    } catch (err) {
      if (responseType !== "json") throw err;
    }
  }

  xhr.send(isUndefined(post) ? null : post);

  if (typeof timeout === "number" && timeout > 0) {
    timeoutId = setTimeout(() => timeoutRequest("timeout"), timeout);
  } else if (isPromiseLike(timeout)) {
    (timeout as Promise<any>).then(() => {
      timeoutRequest("abort");
    });
  }

  /** Aborts the underlying XHR due to timeout expiry or external cancellation. */
  function timeoutRequest(reason: "timeout" | "abort"): void {
    abortedByTimeout = reason === "timeout";

    if (xhr) xhr.abort();
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
  function completeRequest(
    status: number,
    response: any,
    headersString: string | null,
    statusText: string,
    xhrStatus: HttpResponseStatus,
  ): void {
    if (isDefined(timeoutId)) {
      clearTimeout(timeoutId);
    }

    if (callback) {
      callback(status, response, headersString, statusText, xhrStatus);
    }
  }
}
