import {
  defaultHttpResponseTransform,
  mergeHttpHeaderDefaults,
} from "../http/http.ts";
import { extend, isArray } from "../../shared/utils.ts";

/**
 * Downloads a template using $http and, upon success, stores the
 * contents inside of $templateCache.
 *
 * If the HTTP request fails or the response data of the HTTP request is
 * empty then a $compile error will be thrown (unless
 * {ignoreRequestError} is set to true).
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
   * `$http.get()` options merged into every template request.
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
): TemplateRequestService {
  const pendingRequests = new Map<string, Promise<string>>();

  return (templateUrl: string): Promise<string> => {
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
