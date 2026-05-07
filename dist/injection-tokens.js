/**
 * Canonical token names for the built-in injectables exposed by the core `ng`
 * module.
 *
 * These constants keep runtime registration, JSDoc, and ambient type surfaces
 * aligned around one source of truth for both service and provider names.
 */
const _angular = "$angular";
const _attrs = "$attrs";
const _scope = "$scope";
const _element = "$element";
const _animateCssDriver = "$$animateCssDriver";
const _animateJs = "$$animateJs";
const _animateJsDriver = "$$animateJsDriver";
const _animateQueue = "$$animateQueue";
const _animation = "$$animation";
const _taskTrackerFactory = "$$taskTrackerFactory";
const _anchorScroll = "$anchorScroll";
const _animate = "$animate";
const _animateCss = "$animateCss";
const _aria = "$aria";
const _compile = "$compile";
const _cookie = "$cookie";
const _controller = "$controller";
const _document = "$document";
const _eventBus = "$eventBus";
const _exceptionHandler = "$exceptionHandler";
const _filter = "$filter";
const _http = "$http";
const _httpParamSerializer = "$httpParamSerializer";
const _interpolate = "$interpolate";
const _location = "$location";
const _log = "$log";
const _parse = "$parse";
const _rest = "$rest";
const _rootScope = "$rootScope";
const _rootElement = "$rootElement";
const _router = "$$r";
const _sce = "$sce";
const _sceDelegate = "$sceDelegate";
const _state = "$state";
const _stateRegistry = "$stateRegistry";
const _stream = "$stream";
const _sse = "$sse";
const _templateCache = "$templateCache";
const _templateFactory = "$templateFactory";
const _templateRequest = "$templateRequest";
const _transitions = "$transitions";
const _view = "$view";
const _window = "$window";
const _webTransport = "$webTransport";
const _websocket = "$websocket";
const _worker = "$worker";
const _wasm = "$wasm";
const _provide = "$provide";
const _injector = "$injector";
const _angularProvider = "$angularProvider";
const _anchorScrollProvider = "$anchorScrollProvider";
const _animateCssProvider = "$animateCssProvider";
const _ariaProvider = "$ariaProvider";
const _compileProvider = "$compileProvider";
const _animateProvider = "$animateProvider";
const _cookieProvider = "$cookieProvider";
const _eventBusProvider = "$eventBusProvider";
const _exceptionHandlerProvider = "$exceptionHandlerProvider";
const _filterProvider = "$filterProvider";
const _httpProvider = "$httpProvider";
const _httpParamSerializerProvider = "$httpParamSerializerProvider";
const _interpolateProvider = "$interpolateProvider";
const _locationProvider = "$locationProvider";
const _logProvider = "$logProvider";
const _parseProvider = "$parseProvider";
const _restProvider = "$restProvider";
const _rootScopeProvider = "$rootScopeProvider";
const _routerProvider = "$$rProvider";
const _sceProvider = "$sceProvider";
const _sceDelegateProvider = "$sceDelegateProvider";
const _sseProvider = "$sseProvider";
const _stateProvider = "$stateProvider";
const _stateRegistryProvider = "$stateRegistryProvider";
const _streamProvider = "$streamProvider";
const _templateCacheProvider = "$templateCacheProvider";
const _templateFactoryProvider = "$templateFactoryProvider";
const _templateRequestProvider = "$templateRequestProvider";
const _transitionsProvider = "$transitionsProvider";
const _viewProvider = "$viewProvider";
const _webTransportProvider = "$webTransportProvider";
const _websocketProvider = "$websocketProvider";
const _workerProvider = "$workerProvider";
const _wasmProvider = "$wasmProvider";
const _controllerProvider = "$controllerProvider";
/**
 * Runtime token registry. Prefer importing individual token constants in source
 * files; use this aggregate only when configuring the runtime token map.
 */
const $injectTokens = {
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
    _stream,
    _sse,
    _templateCache,
    _templateFactory,
    _templateRequest,
    _transitions,
    _view,
    _window,
    _webTransport,
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
    _streamProvider,
    _templateCacheProvider,
    _templateFactoryProvider,
    _templateRequestProvider,
    _transitionsProvider,
    _viewProvider,
    _webTransportProvider,
    _websocketProvider,
    _workerProvider,
    _wasmProvider,
    _controllerProvider,
};

export { $injectTokens, _anchorScroll, _anchorScrollProvider, _angular, _angularProvider, _animate, _animateCss, _animateCssDriver, _animateCssProvider, _animateJs, _animateJsDriver, _animateProvider, _animateQueue, _animation, _aria, _ariaProvider, _attrs, _compile, _compileProvider, _controller, _controllerProvider, _cookie, _cookieProvider, _document, _element, _eventBus, _eventBusProvider, _exceptionHandler, _exceptionHandlerProvider, _filter, _filterProvider, _http, _httpParamSerializer, _httpParamSerializerProvider, _httpProvider, _injector, _interpolate, _interpolateProvider, _location, _locationProvider, _log, _logProvider, _parse, _parseProvider, _provide, _rest, _restProvider, _rootElement, _rootScope, _rootScopeProvider, _router, _routerProvider, _sce, _sceDelegate, _sceDelegateProvider, _sceProvider, _scope, _sse, _sseProvider, _state, _stateProvider, _stateRegistry, _stateRegistryProvider, _stream, _streamProvider, _taskTrackerFactory, _templateCache, _templateCacheProvider, _templateFactory, _templateFactoryProvider, _templateRequest, _templateRequestProvider, _transitions, _transitionsProvider, _view, _viewProvider, _wasm, _wasmProvider, _webTransport, _webTransportProvider, _websocket, _websocketProvider, _window, _worker, _workerProvider };
