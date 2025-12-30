/**
 * A helper list of tokens matching the standard injectables that come predefined in the core `ng` module.
 * These string tokens are commonly injected into services, directives, or components via `$inject`.
 *
 * Example:
 * ```js
 *
 * myDirective.$inject = [
 *   angular.$t.$animate,
 *   angular.$t.$templateRequest,
 * ];
 *
 * function myDirective($animate, $templateRequest) { ... }
 *
 * ```
 * @private
 * @type Readonly<Record<string, string>>
 */
export const $injectTokens = {
  _angular: "$angular",
  _attrs: "$attrs",
  _scope: "$scope",
  _element: "$element",
  _animateCache: "$$animateCache",
  _animateCssDriver: "$$animateCssDriver",
  _animateJs: "$$animateJs",
  _animateJsDriver: "$$animateJsDriver",
  _animateQueue: "$$animateQueue",
  _animation: "$$animation",
  _rAFScheduler: "$$rAFScheduler",
  _taskTrackerFactory: "$$taskTrackerFactory",
  _anchorScroll: "$anchorScroll",
  _animate: "$animate",
  _animateCss: "$animateCss",
  _aria: "$aria",
  _compile: "$compile",
  _cookie: "$cookie",
  _controller: "$controller",
  _document: "$document",
  _eventBus: "$eventBus",
  _exceptionHandler: "$exceptionHandler",
  _filter: "$filter",
  _http: "$http",
  _httpParamSerializer: "$httpParamSerializer",
  _interpolate: "$interpolate",
  _location: "$location",
  _log: "$log",
  _viewScroll: "$viewScroll",
  _parse: "$parse",
  _rest: "$rest",
  _rootScope: "$rootScope",
  _rootElement: "$rootElement",
  _router: "$router",
  _sce: "$sce",
  _sceDelegate: "$sceDelegate",
  _state: "$state",
  _stateRegistry: "$stateRegistry",
  _sse: "$sse",
  _sanitizeUri: "$$sanitizeUri",
  _sanitizeUriProvider: "$$sanitizeUriProvider",
  _templateCache: "$templateCache",
  _templateFactory: "$templateFactory",
  _templateRequest: "$templateRequest",
  _transitions: "$transitions",
  _urlConfig: "$urlConfig",
  _url: "$url",
  _view: "$view",
  _window: "$window",
  _websocket: "$websocket",

  // provide literals
  _provide: "$provide",
  _injector: "$injector",
  _compileProvider: "$compileProvider",
  _animateProvider: "$animateProvider",
  _filterProvider: "$filterProvider",
  _controllerProvider: "$controllerProvider",
};

/**
 * Utility for mapping to service-names to providers
 * @param {String[]} services
 */
export function provider(services) {
  return services.map((x) => `${x}Provider`);
}
