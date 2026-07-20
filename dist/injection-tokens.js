/**
 * Canonical token names for the built-in injectables exposed by the core `ng`
 * module.
 *
 * These constants keep runtime registration, JSDoc, and ambient type surfaces
 * aligned around one source of truth for both service and provider names.
 */
const _angular = "$angular";
const _scope = "$scope";
const _element = "$element";
const _anchorScroll = "$anchorScroll";
const _animate = "$animate";
const _aria = "$aria";
const _compile = "$compile";
const _cookie = "$cookie";
const _controller = "$controller";
const _document = "$document";
const _eventBus = "$eventBus";
const _exceptionHandler = "$exceptionHandler";
const _filter = "$filter";
const _htmlCanvas = "$htmlCanvas";
const _http = "$http";
const _httpParamSerializer = "$httpParamSerializer";
const _interpolate = "$interpolate";
const _location = "$location";
const _log = "$log";
const _machine = "$machine";
const _parse = "$parse";
const _rest = "$rest";
const _rootScope = "$rootScope";
const _rootElement = "$rootElement";
const _sce = "$sce";
const _sceDelegate = "$sceDelegate";
const _state = "$state";
const _stateRegistry = "$stateRegistry";
const _security = "$security";
const _serviceWorker = "$serviceWorker";
const _stream = "$stream";
const _sse = "$sse";
const _templateCache = "$templateCache";
const _templateRequest = "$templateRequest";
const _transitions = "$transitions";
const _window = "$window";
const _webComponent = "$webComponent";
const _webTransport = "$webTransport";
const _websocket = "$websocket";
const _worker = "$worker";
const _wasm = "$wasm";
const _workflow = "$workflow";
const _injector = "$injector";
/**
 * Runtime token registry. Prefer importing individual token constants in source
 * files; use this aggregate only when configuring the runtime token map.
 */
const $injectTokens = {
    _angular,
    _scope,
    _element,
    _anchorScroll,
    _animate,
    _aria,
    _compile,
    _cookie,
    _controller,
    _document,
    _eventBus,
    _exceptionHandler,
    _filter,
    _htmlCanvas,
    _http,
    _httpParamSerializer,
    _interpolate,
    _location,
    _log,
    _machine,
    _parse,
    _rest,
    _rootScope,
    _rootElement,
    _sce,
    _sceDelegate,
    _security,
    _serviceWorker,
    _state,
    _stateRegistry,
    _stream,
    _sse,
    _templateCache,
    _templateRequest,
    _transitions,
    _window,
    _webComponent,
    _webTransport,
    _websocket,
    _worker,
    _wasm,
    _workflow,
    _injector,
};

export { $injectTokens, _anchorScroll, _angular, _animate, _aria, _compile, _controller, _cookie, _document, _element, _eventBus, _exceptionHandler, _filter, _htmlCanvas, _http, _httpParamSerializer, _injector, _interpolate, _location, _log, _machine, _parse, _rest, _rootElement, _rootScope, _sce, _sceDelegate, _scope, _security, _serviceWorker, _sse, _state, _stateRegistry, _stream, _templateCache, _templateRequest, _transitions, _wasm, _webComponent, _webTransport, _websocket, _window, _worker, _workflow };
