import {
  defaultHttpResponseTransform,
  mergeHttpHeaderDefaults,
} from "../http/http.ts";
import { extend, isArray, isString } from "../../shared/utils.ts";

/** Options for one template consumer. */
export interface TemplateRequestOptions {
  /** Cancels this consumer without cancelling other consumers of the same URL. */
  signal?: AbortSignal;
}

/**
 * Returns cached template text or downloads it through `$http` and stores it in
 * `$templateCache`. Concurrent requests for the same URL share one download.
 * A consumer signal cancels only its own wait; the download is aborted after
 * every consumer has cancelled. Calls without a signal keep the download alive.
 * `$compile.resourceUrlPolicy` validates or rewrites the URL before lookup.
 * HTTP failures reject; an empty successful response is returned unchanged.
 *
 * @param templateUrl The template URL.
 * @param options Cancellation for this consumer.
 *
 * @returns A promise whose value is the template content.
 */
export type TemplateRequestService = (
  templateUrl: string,
  options?: TemplateRequestOptions,
) => Promise<string>;

interface PendingTemplateRequest {
  controller: AbortController;
  promise: Promise<string>;
  consumers: Set<object>;
  keepAlive: boolean;
  finished: boolean;
}

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
  const pendingRequests = new Map<string, PendingTemplateRequest>();

  return (templateUrl, options): Promise<string> => {
    const signal = options?.signal;
    try {
      if (!isString(templateUrl))
        throw new TypeError("Template URL must be a string.");
      templateUrl = resourceUrlPolicy(templateUrl);
      if (!isString(templateUrl))
        throw new TypeError("$compile.resourceUrlPolicy must return a string.");
      signal?.throwIfAborted();
    } catch (error) {
      return Promise.resolve().then(() => {
        throw error;
      });
    }
    let pending = pendingRequests.get(templateUrl);
    if (!pending) {
      const controller = new AbortController();
      const transportSignal = httpOptions.signal
        ? AbortSignal.any([controller.signal, httpOptions.signal])
        : controller.signal;
      const entry: PendingTemplateRequest = {
        controller,
        consumers: new Set(),
        keepAlive: false,
        finished: false,
        promise: Promise.resolve()
          .then(async () => {
            controller.signal.throwIfAborted();
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
              { signal: transportSignal },
            ) as ng.HttpRequestOptions;

            const response = await $http.get<string>(templateUrl, config);

            transportSignal.throwIfAborted();
            $templateCache.set(templateUrl, response.data);

            return response.data;
          })
          .finally(() => {
            entry.finished = true;
            if (pendingRequests.get(templateUrl) === entry)
              pendingRequests.delete(templateUrl);
          }),
      };
      pendingRequests.set(templateUrl, entry);
      pending = entry;
    }
    const entry = pending;
    if (!signal) {
      entry.keepAlive = true;
      return entry.promise;
    }
    return new Promise<string>((resolve, reject) => {
      const consumer = {};
      entry.consumers.add(consumer);
      const cleanup = () => {
        signal.removeEventListener("abort", abort);
        entry.consumers.delete(consumer);
      };
      const abort = () => {
        cleanup();
        // AbortSignal reasons may be arbitrary values; preserve the native contract.
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(signal.reason);
        if (!entry.finished && !entry.keepAlive && entry.consumers.size === 0) {
          if (pendingRequests.get(templateUrl) === entry)
            pendingRequests.delete(templateUrl);
          entry.controller.abort();
        }
      };
      signal.addEventListener("abort", abort, { once: true });
      void entry.promise
        .then(
          (template) => {
            cleanup();
            resolve(template);
            return undefined;
          },
          (error: unknown) => {
            cleanup();
            // HTTP can reject with a response object; keep it intact.
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            reject(error);
            return undefined;
          },
        )
        .catch(reject);
    });
  };
}
