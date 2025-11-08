/**
 * A helper list of tokens matching the standard injectables that come predefined in the core `ng` module.
 * These string tokens are commonly injected into services, directives, or components via `$inject`.
 *
 * Example:
 * ```js
 *
 * myDirective.$inject = [
 *   angular.$injectTokens.$animate,
 *   angular.$injectTokens.$templateRequest,
 * ];
 *
 * function myDirective($animate, $templateRequest) { ... }
 *
 * ```
 * @type Readonly<Record<string, string>>
 */
export const $injectTokens = Object.freeze({
  $attrs: "$attrs",
  $scope: "$scope",
  $element: "$element",
  $$AnimateRunner: "$$AnimateRunner",
  $$animateCache: "$$animateCache",
  $$animateCssDriver: "$$animateCssDriver",
  $$animateJs: "$$animateJs",
  $$animateJsDriver: "$$animateJsDriver",
  $$animateQueue: "$$animateQueue",
  $$animation: "$$animation",
  $$rAFScheduler: "$$rAFScheduler",
  $$taskTrackerFactory: "$$taskTrackerFactory",
  $anchorScroll: "$anchorScroll",
  $animate: "$animate",
  $animateCss: "$animateCss",
  $aria: "$aria",
  $compile: "$compile",
  $controller: "$controller",
  $document: "$document",
  $eventBus: "$eventBus",
  $exceptionHandler: "$exceptionHandler",
  $filter: "$filter",
  $http: "$http",
  $httpParamSerializer: "$httpParamSerializer",
  $interpolate: "$interpolate",
  $location: "$location",
  $log: "$log",
  $viewScroll: "$viewScroll",
  $parse: "$parse",
  $rootScope: "$rootScope",
  $rootElement: "$rootElement",
  $router: "$router",
  $sce: "$sce",
  $sceDelegate: "$sceDelegate",
  $state: "$state",
  $stateRegistry: "$stateRegistry",
  $sse: "$sse",
  $$sanitizeUri: "$$sanitizeUri",
  $$sanitizeUriProvider: "$$sanitizeUriProvider",
  $templateCache: "$templateCache",
  $templateFactory: "$templateFactory",
  $templateRequest: "$templateRequest",
  $transitions: "$transitions",
  $urlConfig: "$urlConfig",
  $url: "$url",
  $view: "$view",
  $window: "$window",
  // provide literals
  $provide: "$provide",
  $injector: "$injector",
  $compileProvider: "$compileProvider",
  $animateProvider: "$animateProvider",
  $filterProvider: "$filterProvider",
  $controllerProvider: "$controllerProvider",
});

/**
 * Utility for mapping to service-names to providers
 * @param {String[]} services
 */
export function provider(services) {
  return services.map((x) => x + "Provider");
}
