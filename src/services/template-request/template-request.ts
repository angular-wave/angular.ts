import {
  defaultHttpResponseTransform,
  mergeHttpHeaderDefaults,
} from "../http/http.ts";
import { extend, isArray, isString } from "../../shared/utils.ts";

/**
 * Returns cached template text or downloads it through `$http` and stores it in
 * `$templateCache`. Concurrent requests for the same URL share one promise.
 * `$compile.resourceUrlPolicy` validates or rewrites the URL before lookup.
 * HTTP failures reject; an empty successful response is returned unchanged.
 *
 * @param templateUrl The template URL.
 *
 * @returns A promise whose value is the template content.
 */
export type TemplateRequestService = (templateUrl: string) => Promise<string>;

/**
 * Declarative configuration accepted by
 * `NgModule.config({ $templateRequest: ... })`.
 */
export interface TemplateRequestConfig {
  /**
   * `$http.get()` options merged into every template request, including Fetch
   * credentials, a numeric timeout, and a native cancellation signal.
   */
  httpOptions?: ng.HttpRequestOptions;
}

/** @internal */
export function createTemplateRequestHttpOptions(): ng.HttpRequestOptions {
  return {
    headers: {
      Accept: "text/html",
    },
  };
}

/** @internal */
export function applyTemplateRequestConfig(
  current: ng.HttpRequestOptions,
  config: TemplateRequestConfig,
): ng.HttpRequestOptions {
  const httpOptions = config.httpOptions;

  if (httpOptions === undefined) return current;

  const headers = httpOptions.headers;
  const currentHeaders = current.headers;
  const next = {
    ...current,
    ...httpOptions,
  };

  if (headers !== undefined) {
    next.headers = mergeHttpHeaderDefaults(currentHeaders, headers);
  }

  return next;
}

/** @internal */
export function createTemplateRequestService(
  $templateCache: ng.TemplateCacheService,
  $http: ng.HttpService,
  httpOptions: ng.HttpRequestOptions,
  resourceUrlPolicy: (url: string) => string,
): TemplateRequestService {
  const pendingRequests = new Map<string, Promise<string>>();

  return (templateUrl: string): Promise<string> => {
    try {
      if (!isString(templateUrl))
        throw new TypeError("Template URL must be a string.");
      templateUrl = resourceUrlPolicy(templateUrl);
      if (!isString(templateUrl))
        throw new TypeError("$compile.resourceUrlPolicy must return a string.");
    } catch (error) {
      return Promise.resolve().then(() => {
        throw error;
      });
    }
    const pendingRequest = pendingRequests.get(templateUrl);

    if (pendingRequest) return pendingRequest;

    const request = Promise.resolve()
      .then(async () => {
        const cachedTemplate = $templateCache.get(templateUrl);

        if (cachedTemplate !== undefined) return cachedTemplate;

        let transformResponse = $http.defaults.transformResponse ?? null;

        if (isArray(transformResponse)) {
          transformResponse = transformResponse.filter(
            (transform) => transform !== defaultHttpResponseTransform,
          );
        } else if (transformResponse === defaultHttpResponseTransform) {
          transformResponse = null;
        }

        const config = extend(
          {
            transformResponse,
          },
          httpOptions,
        ) as ng.HttpRequestOptions;

        const response = await $http.get<string>(templateUrl, config);

        $templateCache.set(templateUrl, response.data);

        return response.data;
      })
      .finally(() => {
        pendingRequests.delete(templateUrl);
      });

    pendingRequests.set(templateUrl, request);

    return request;
  };
}
