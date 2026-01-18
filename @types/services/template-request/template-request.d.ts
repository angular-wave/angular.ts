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
  httpOptions: ng.RequestShortcutConfig;
  $get: (
    | string
    | ((
        $templateCache: ng.TemplateCacheService,
        $http: ng.HttpService,
      ) => ng.TemplateRequestService)
  )[];
}
