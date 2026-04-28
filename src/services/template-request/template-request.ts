import { _http, _templateCache } from "../../injection-tokens.ts";
import { defaultHttpResponseTransform } from "../http/http.ts";
import { extend, isArray } from "../../shared/utils.ts";

export interface TemplateRequestService {
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
  (templateUrl: string): Promise<string>;
}

/**
 * Provider for the `$templateRequest` service.
 *
 * Fetches templates via HTTP and caches them in `$templateCache`.
 * Templates are assumed trusted.
 *
 * This provider allows configuring per-request `$http` options such as headers,
 * timeout, or transform functions via `httpOptions`.
 *
 * Option A:
 * - Provide a sensible default for template fetching (e.g. `Accept: text/html`)
 * - Keep `httpOptions` overridable during config phase
 */
export class TemplateRequestProvider {
  /**
   * Optional `$http.get()` config applied to every template request.
   *
   * This is merged on top of the default template request config:
   * - `cache: $templateCache`
   * - `transformResponse`: with `defaultHttpResponseTransform` removed
   *
   * Use this to set template-specific defaults such as custom headers,
   * timeouts, credentials, etc.
   *
   */
  httpOptions: ng.RequestShortcutConfig;

  constructor() {
    /**
     * Default options for template requests.
     * Keeps behavior aligned with callers that previously used `$http` directly
     * and set `Accept: text/html`.
     */
    this.httpOptions = {
      headers: {
        Accept: "text/html",
      },
    };
  }

  $get = [
    _templateCache,
    _http,
    /**
     * Creates the `$templateRequest` service.
     */
    ($templateCache: ng.TemplateCacheService, $http: ng.HttpService) => {
      /**
       * Fetch a template via HTTP and cache it.
       *
       * @param templateUrl URL of the template.
       * @returns Resolves with template content.
       */
      const fetchTemplate = (templateUrl: string): Promise<string> => {
        // Filter out default transformResponse for template requests
        let transformResponse = $http.defaults?.transformResponse ?? null;

        if (isArray(transformResponse)) {
          transformResponse = transformResponse.filter(
            (x) => x !== defaultHttpResponseTransform,
          );
        } else if (transformResponse === defaultHttpResponseTransform) {
          transformResponse = null;
        }

        const config = extend(
          {
            cache: $templateCache,
            transformResponse,
          },
          this.httpOptions || {},
        ) as ng.RequestShortcutConfig;

        return $http.get<string>(templateUrl, config).then(
          (response) => {
            $templateCache.set(templateUrl, response.data);

            return response.data;
          },
          (resp) => {
            return Promise.reject(resp);
          },
        );
      };

      return fetchTemplate;
    },
  ];
}
