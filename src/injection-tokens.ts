/**
 * Canonical token names for the built-in injectables exposed by the core `ng`
 * module.
 *
 * These constants keep runtime registration, JSDoc, and ambient type surfaces
 * aligned around one source of truth for both service and provider names.
 */
export const _angular = "$angular" as const;
export const _attrs = "$attrs" as const;
export const _scope = "$scope" as const;
export const _element = "$element" as const;
export const _animateCssDriver = "$$animateCssDriver" as const;
export const _animateJs = "$$animateJs" as const;
export const _animateJsDriver = "$$animateJsDriver" as const;
export const _animateQueue = "$$animateQueue" as const;
export const _animation = "$$animation" as const;
export const _taskTrackerFactory = "$$taskTrackerFactory" as const;
export const _anchorScroll = "$anchorScroll" as const;
export const _animate = "$animate" as const;
export const _animateCss = "$animateCss" as const;
export const _aria = "$aria" as const;
export const _compile = "$compile" as const;
export const _cookie = "$cookie" as const;
export const _controller = "$controller" as const;
export const _document = "$document" as const;
export const _eventBus = "$eventBus" as const;
export const _exceptionHandler = "$exceptionHandler" as const;
export const _filter = "$filter" as const;
export const _http = "$http" as const;
export const _httpParamSerializer = "$httpParamSerializer" as const;
export const _interpolate = "$interpolate" as const;
export const _location = "$location" as const;
export const _log = "$log" as const;
export const _parse = "$parse" as const;
export const _rest = "$rest" as const;
export const _rootScope = "$rootScope" as const;
export const _rootElement = "$rootElement" as const;
export const _router = "$$r" as const;
export const _sce = "$sce" as const;
export const _sceDelegate = "$sceDelegate" as const;
export const _state = "$state" as const;
export const _stateRegistry = "$stateRegistry" as const;
export const _sse = "$sse" as const;
export const _templateCache = "$templateCache" as const;
export const _templateFactory = "$templateFactory" as const;
export const _templateRequest = "$templateRequest" as const;
export const _transitions = "$transitions" as const;
export const _urlConfig = "$urlConfig" as const;
export const _url = "$url" as const;
export const _view = "$view" as const;
export const _window = "$window" as const;
export const _websocket = "$websocket" as const;
export const _worker = "$worker" as const;
export const _wasm = "$wasm" as const;
export const _provide = "$provide" as const;
export const _injector = "$injector" as const;
export const _angularProvider = "$angularProvider" as const;
export const _anchorScrollProvider = "$anchorScrollProvider" as const;
export const _animateCssProvider = "$animateCssProvider" as const;
export const _ariaProvider = "$ariaProvider" as const;
export const _compileProvider = "$compileProvider" as const;
export const _animateProvider = "$animateProvider" as const;
export const _cookieProvider = "$cookieProvider" as const;
export const _eventBusProvider = "$eventBusProvider" as const;
export const _exceptionHandlerProvider = "$exceptionHandlerProvider" as const;
export const _filterProvider = "$filterProvider" as const;
export const _httpProvider = "$httpProvider" as const;
export const _httpParamSerializerProvider =
  "$httpParamSerializerProvider" as const;
export const _interpolateProvider = "$interpolateProvider" as const;
export const _locationProvider = "$locationProvider" as const;
export const _logProvider = "$logProvider" as const;
export const _parseProvider = "$parseProvider" as const;
export const _restProvider = "$restProvider" as const;
export const _rootScopeProvider = "$rootScopeProvider" as const;
export const _routerProvider = "$$rProvider" as const;
export const _sceProvider = "$sceProvider" as const;
export const _sceDelegateProvider = "$sceDelegateProvider" as const;
export const _sseProvider = "$sseProvider" as const;
export const _stateProvider = "$stateProvider" as const;
export const _stateRegistryProvider = "$stateRegistryProvider" as const;
export const _templateCacheProvider = "$templateCacheProvider" as const;
export const _templateFactoryProvider = "$templateFactoryProvider" as const;
export const _templateRequestProvider = "$templateRequestProvider" as const;
export const _transitionsProvider = "$transitionsProvider" as const;
export const _urlConfigProvider = "$urlConfigProvider" as const;
export const _urlProvider = "$urlProvider" as const;
export const _viewProvider = "$viewProvider" as const;
export const _websocketProvider = "$websocketProvider" as const;
export const _workerProvider = "$workerProvider" as const;
export const _wasmProvider = "$wasmProvider" as const;
export const _controllerProvider = "$controllerProvider" as const;

/**
 * Runtime token registry. Prefer importing individual token constants in source
 * files; use this aggregate only when configuring the runtime token map.
 */
export const $injectTokens = {
  _angular,
  _attrs,
  _scope,
  _element,
  _animateCssDriver,
  _animateJs,
  _animateJsDriver,
  _animateQueue,
  _animation,
  _taskTrackerFactory,
  _anchorScroll,
  _animate,
  _animateCss,
  _aria,
  _compile,
  _cookie,
  _controller,
  _document,
  _eventBus,
  _exceptionHandler,
  _filter,
  _http,
  _httpParamSerializer,
  _interpolate,
  _location,
  _log,
  _parse,
  _rest,
  _rootScope,
  _rootElement,
  _router,
  _sce,
  _sceDelegate,
  _state,
  _stateRegistry,
  _sse,
  _templateCache,
  _templateFactory,
  _templateRequest,
  _transitions,
  _urlConfig,
  _url,
  _view,
  _window,
  _websocket,
  _worker,
  _wasm,
  _provide,
  _injector,
  _angularProvider,
  _anchorScrollProvider,
  _animateCssProvider,
  _ariaProvider,
  _compileProvider,
  _animateProvider,
  _cookieProvider,
  _eventBusProvider,
  _exceptionHandlerProvider,
  _filterProvider,
  _httpProvider,
  _httpParamSerializerProvider,
  _interpolateProvider,
  _locationProvider,
  _logProvider,
  _parseProvider,
  _restProvider,
  _rootScopeProvider,
  _routerProvider,
  _sceProvider,
  _sceDelegateProvider,
  _sseProvider,
  _stateProvider,
  _stateRegistryProvider,
  _templateCacheProvider,
  _templateFactoryProvider,
  _templateRequestProvider,
  _transitionsProvider,
  _urlConfigProvider,
  _urlProvider,
  _viewProvider,
  _websocketProvider,
  _workerProvider,
  _wasmProvider,
  _controllerProvider,
} as const satisfies Readonly<Record<string, string>>;
