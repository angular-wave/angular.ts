export interface HttpHeadersGetter {
  (): { [name: string]: string };
  (headerName: string): string;
}

export interface HttpPromiseCallback<T> {
  (
    data: T,
    status: number,
    headers: HttpHeadersGetter,
    config: RequestConfig,
  ): void;
}

export interface HttpRequestConfigHeaders {
  [requestType: string]: any;
  common?: any;
  get?: any;
  post?: any;
  put?: any;
  patch?: any;
}

// See the jsdoc for transformData() at https://github.com/angular/angular.js/blob/master/src/ng/http.js#L228
export interface HttpRequestTransformer {
  (data: any, headersGetter: HttpHeadersGetter): any;
}

// The definition of fields are the same as HttpResponse
export interface HttpResponseTransformer {
  (data: any, headersGetter: HttpHeadersGetter, status: number): any;
}

export interface HttpHeaderType {
  [requestType: string]: string | ((config: RequestConfig) => string);
}

/**
 * Object that controls the defaults for $http provider. Not all fields of RequestShortcutConfig can be configured
 * via defaults and the docs do not say which. The following is based on the inspection of the source code.
 * https://docs.angularjs.org/api/ng/service/$http#defaults
 * https://docs.angularjs.org/api/ng/service/$http#usage
 * https://docs.angularjs.org/api/ng/provider/$httpProvider The properties section
 */
export interface HttpProviderDefaults {
  /**
   * {boolean|Cache}
   * If true, a default $http cache will be used to cache the GET request, otherwise if a cache instance built with $cacheFactory, this cache will be used for caching.
   */
  cache?: any;

  /**
   * Transform function or an array of such functions. The transform function takes the http request body and
   * headers and returns its transformed (typically serialized) version.
   * @see {@link https://docs.angularjs.org/api/ng/service/$http#transforming-requests-and-responses}
   */
  transformRequest?:
    | HttpRequestTransformer
    | HttpRequestTransformer[]
    | undefined;

  /**
   * Transform function or an array of such functions. The transform function takes the http response body and
   * headers and returns its transformed (typically deserialized) version.
   */
  transformResponse?:
    | HttpResponseTransformer
    | HttpResponseTransformer[]
    | undefined;

  /**
   * Map of strings or functions which return strings representing HTTP headers to send to the server. If the
   * return value of a function is null, the header will not be sent.
   * The key of the map is the request verb in lower case. The "common" key applies to all requests.
   * @see {@link https://docs.angularjs.org/api/ng/service/$http#setting-http-headers}
   */
  headers?: HttpRequestConfigHeaders | undefined;

  /** Name of HTTP header to populate with the XSRF token. */
  xsrfHeaderName?: string | undefined;

  /** Name of cookie containing the XSRF token. */
  xsrfCookieName?: string | undefined;

  /**
   * whether to to set the withCredentials flag on the XHR object. See [requests with credentials]https://developer.mozilla.org/en/http_access_control#section_5 for more information.
   */
  withCredentials?: boolean | undefined;

  /**
   * A function used to the prepare string representation of request parameters (specified as an object). If
   * specified as string, it is interpreted as a function registered with the $injector. Defaults to
   * $httpParamSerializer.
   */
  paramSerializer?: string | ((obj: any) => string) | undefined;
}

/**
 * Object describing the request to be made and how it should be processed.
 * see http://docs.angularjs.org/api/ng/service/$http#usage
 */
export interface RequestShortcutConfig extends HttpProviderDefaults {
  /**
   * {Object.<string|Object>}
   * Map of strings or objects which will be turned to ?key1=value1&key2=value2 after the url. If the value is not a string, it will be JSONified.
   */
  params?: any;

  /**
   * {string|Object}
   * Data to be sent as the request message data.
   */
  data?: any;

  /**
   * Timeout in milliseconds, or promise that should abort the request when resolved.
   */
  timeout?: number | Promise<any> | undefined;

  /**
   * See [XMLHttpRequest.responseType]https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#xmlhttprequest-responsetype
   */
  responseType?: string | undefined;
}

/**
 * Object describing the request to be made and how it should be processed.
 * see http://docs.angularjs.org/api/ng/service/$http#usage
 */
export interface RequestConfig extends RequestShortcutConfig {
  /**
   * HTTP method (e.g. 'GET', 'POST', etc)
   */
  method: string;
  /**
   * Absolute or relative URL of the resource that is being requested.
   */
  url: string;
  /**
   * Event listeners to be bound to the XMLHttpRequest object.
   * To bind events to the XMLHttpRequest upload object, use uploadEventHandlers. The handler will be called in the context of a $apply block.
   */
  eventHandlers?:
    | { [type: string]: EventListenerOrEventListenerObject }
    | undefined;
  /**
   * Event listeners to be bound to the XMLHttpRequest upload object.
   * To bind events to the XMLHttpRequest object, use eventHandlers. The handler will be called in the context of a $apply block.
   */
  uploadEventHandlers?:
    | { [type: string]: EventListenerOrEventListenerObject }
    | undefined;
}

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

/**
 * HttpService
 */
export interface HttpService {
  /**
   * Object describing the request to be made and how it should be processed.
   */
  <T>(config: RequestConfig): HttpPromise<T>;

  /**
   * Shortcut method to perform GET request.
   *
   * @param url Relative or absolute URL specifying the destination of the request
   * @param config Optional configuration object
   */
  get<T>(url: string, config?: RequestShortcutConfig): HttpPromise<T>;

  /**
   * Shortcut method to perform DELETE request.
   *
   * @param url Relative or absolute URL specifying the destination of the request
   * @param config Optional configuration object
   */
  delete<T>(url: string, config?: RequestShortcutConfig): HttpPromise<T>;

  /**
   * Shortcut method to perform HEAD request.
   *
   * @param url Relative or absolute URL specifying the destination of the request
   * @param config Optional configuration object
   */
  head<T>(url: string, config?: RequestShortcutConfig): HttpPromise<T>;

  /**
   * Shortcut method to perform JSONP request.
   *
   * @param url Relative or absolute URL specifying the destination of the request
   * @param config Optional configuration object
   */
  jsonp<T>(url: string, config?: RequestShortcutConfig): HttpPromise<T>;

  /**
   * Shortcut method to perform POST request.
   *
   * @param url Relative or absolute URL specifying the destination of the request
   * @param data Request content
   * @param config Optional configuration object
   */
  post<T>(
    url: string,
    data: any,
    config?: RequestShortcutConfig,
  ): HttpPromise<T>;

  /**
   * Shortcut method to perform PUT request.
   *
   * @param url Relative or absolute URL specifying the destination of the request
   * @param data Request content
   * @param config Optional configuration object
   */
  put<T>(
    url: string,
    data: any,
    config?: RequestShortcutConfig,
  ): HttpPromise<T>;

  /**
   * Shortcut method to perform PATCH request.
   *
   * @param url Relative or absolute URL specifying the destination of the request
   * @param data Request content
   * @param config Optional configuration object
   */
  patch<T>(
    url: string,
    data: any,
    config?: RequestShortcutConfig,
  ): HttpPromise<T>;

  /**
   * Runtime equivalent of the $httpProvider.defaults property. Allows configuration of default headers, withCredentials as well as request and response transformations.
   */
  defaults: HttpProviderDefaults;

  /**
   * Array of config objects for currently pending requests. This is primarily meant to be used for debugging purposes.
   */
  pendingRequests: RequestConfig[];
}

/**
 * Represents an object of key-value pairs to be serialized into an HTTP query string.
 */
export type HttpParams = Record<
  string,
  string | number | boolean | null | undefined | unknown[]
>;

/**
 * A function that serializes an object into a URL-encoded query string.
 */
export type HttpParamSerializer = (params?: HttpParams) => string;

export interface HttpInterceptor {
  request?(config: RequestConfig): RequestConfig | Promise<RequestConfig>;
  requestError?(rejection: any): RequestConfig | Promise<RequestConfig>;
  response?<T>(
    response: HttpResponse<T>,
  ): Promise<HttpResponse<T>> | HttpResponse<T>;
  responseError?<T>(rejection: any): Promise<HttpResponse<T>> | HttpResponse<T>;
}

export interface HttpInterceptorFactory {
  (...args: any[]): HttpInterceptor;
}
