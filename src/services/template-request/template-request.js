import { defaultHttpResponseTransform } from "../http/http.js";
import { extend, isArray } from "../../shared/utils.js";
import { $injectTokens } from "../../injection-tokens.js";

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
   * @type {ng.RequestShortcutConfig}
   */
  httpOptions;

  constructor() {
    /**
     * Default options for template requests.
     * Keeps behavior aligned with callers that previously used `$http` directly
     * and set `Accept: text/html`.
     *
     * @type {ng.RequestShortcutConfig}
     */
    this.httpOptions = {
      headers: {
        Accept: "text/html",
      },
    };
  }

  $get = [
    $injectTokens._templateCache,
    $injectTokens._http,
    /**
     * @param {ng.TemplateCacheService} $templateCache
     * @param {ng.HttpService} $http
     * @returns {ng.TemplateRequestService}
     */
    ($templateCache, $http) => {
      /**
       * Fetch a template via HTTP and cache it.
       *
       * @param {string} templateUrl URL of the template
       * @returns {Promise<string>} Resolves with template content
       */
      const fetchTemplate = (templateUrl) => {
        // Filter out default transformResponse for template requests
        let transformResponse = $http.defaults?.transformResponse ?? null;

        if (isArray(transformResponse)) {
          transformResponse = transformResponse.filter(
            (x) => x !== defaultHttpResponseTransform,
          );
        } else if (transformResponse === defaultHttpResponseTransform) {
          transformResponse = null;
        }

        /** @type {ng.RequestShortcutConfig} */
        const config = extend(
          {
            cache: $templateCache,
            transformResponse,
          },
          this.httpOptions || {},
        );

        return $http.get(templateUrl, config).then(
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
