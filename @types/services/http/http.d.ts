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
export declare function HttpParamSerializerProvider(this: {
  $get?: () => import("./interface.ts").HttpParamSerializer;
}): void;
/**
 * @param {unknown} data
 * @param {(arg0: string) => any} headers
 */
export declare function defaultHttpResponseTransform(
  data: unknown,
  headers: (arg0: string) => any,
): unknown;
/**
 * Use `$httpProvider` to change the default behavior of the {@link ng.$http $http} service.
 */
export declare function HttpProvider(this: any): void;
/**
 * Makes an HTTP request using XMLHttpRequest with flexible options.
 *
 * @param {string} method - The HTTP method (e.g., "GET", "POST").
 * @param {string} [url] - The URL to send the request to. Defaults to the current page URL.
 * @param {*} [post] - The body to send with the request, if any.
 * @param {(status: number, response: any, headersString: string|null, statusText: string, xhrStatus: import("./interface.ts").HttpResponseStatus) => void} [callback] - Callback invoked when the request completes.
 * @param {Object<string, string|undefined>} [headers] - Headers to set on the request.
 * @param {number|Promise<any>} [timeout] - Timeout in ms or a cancellable promise.
 * @param {boolean} [withCredentials] - Whether to send credentials with the request.
 * @param {XMLHttpRequestResponseType} [responseType] - The type of data expected in the response.
 * @param {ng.RequestConfig["eventHandlers"]} [eventHandlers] - Event listeners for the XMLHttpRequest object.
 * @param {ng.RequestConfig["uploadEventHandlers"]} [uploadEventHandlers] - Event listeners for the XMLHttpRequest.upload object.
 * @returns {void}
 */
export declare function http(
  method: string,
  url?: string,
  post?: any,
  callback?: (
    status: number,
    response: any,
    headersString: string | null,
    statusText: string,
    xhrStatus: import("./interface.ts").HttpResponseStatus,
  ) => void,
  headers?: Record<string, string | undefined>,
  timeout?: number | Promise<any>,
  withCredentials?: boolean,
  responseType?: XMLHttpRequestResponseType,
  eventHandlers?: ng.RequestConfig["eventHandlers"],
  uploadEventHandlers?: ng.RequestConfig["uploadEventHandlers"],
): void;
