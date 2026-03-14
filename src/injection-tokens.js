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
  _animateCssDriver: "$$animateCssDriver",
  _animateJs: "$$animateJs",
  _animateJsDriver: "$$animateJsDriver",
  _animateQueue: "$$animateQueue",
  _animation: "$$animation",
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
  _angularProvider: "$angularProvider",
  _anchorScrollProvider: "$anchorScrollProvider",
  _animateCssProvider: "$animateCssProvider",
  _ariaProvider: "$ariaProvider",
  _compileProvider: "$compileProvider",
  _animateProvider: "$animateProvider",
  _cookieProvider: "$cookieProvider",
  _eventBusProvider: "$eventBusProvider",
  _exceptionHandlerProvider: "$exceptionHandlerProvider",
  _filterProvider: "$filterProvider",
  _httpProvider: "$httpProvider",
  _httpParamSerializerProvider: "$httpParamSerializerProvider",
  _interpolateProvider: "$interpolateProvider",
  _locationProvider: "$locationProvider",
  _logProvider: "$logProvider",
  _parseProvider: "$parseProvider",
  _restProvider: "$restProvider",
  _rootScopeProvider: "$rootScopeProvider",
  _routerProvider: "$routerProvider",
  _sceProvider: "$sceProvider",
  _sceDelegateProvider: "$sceDelegateProvider",
  _sseProvider: "$sseProvider",
  _stateProvider: "$stateProvider",
  _stateRegistryProvider: "$stateRegistryProvider",
  _templateCacheProvider: "$templateCacheProvider",
  _templateFactoryProvider: "$templateFactoryProvider",
  _templateRequestProvider: "$templateRequestProvider",
  _transitionsProvider: "$transitionsProvider",
  _urlConfigProvider: "$urlConfigProvider",
  _urlProvider: "$urlProvider",
  _viewProvider: "$viewProvider",
  _websocketProvider: "$websocketProvider",
  _controllerProvider: "$controllerProvider",
};
