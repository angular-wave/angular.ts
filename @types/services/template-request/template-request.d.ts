/**
 * Provider for the `$templateRequest` service.
 *
 * Fetches templates via HTTP and caches them in `$templateCache`.
 * Templates are assumed trusted. This provider allows configuring
 * per-request `$http` options such as headers, timeout, or transform functions.
 */
export class TemplateRequestProvider {
  /** @type {ng.RequestShortcutConfig|undefined} */
  httpOptions: ng.RequestShortcutConfig | undefined;
  $get: (
    | string
    | ((
        $templateCache: ng.TemplateCacheService,
        $http: ng.HttpService,
      ) => ng.TemplateRequestService)
  )[];
}
