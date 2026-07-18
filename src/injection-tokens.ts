/**
 * Canonical token names for the built-in injectables exposed by the core `ng`
 * module.
 *
 * These constants keep runtime registration, JSDoc, and ambient type surfaces
 * aligned around one source of truth for both service and provider names.
 */
export const _angular = "$angular" as const;
export const _scope = "$scope" as const;
export const _element = "$element" as const;
export const _anchorScroll = "$anchorScroll" as const;
export const _animate = "$animate" as const;
export const _aria = "$aria" as const;
export const _compile = "$compile" as const;
export const _cookie = "$cookie" as const;
export const _controller = "$controller" as const;
export const _document = "$document" as const;
export const _eventBus = "$eventBus" as const;
export const _exceptionHandler = "$exceptionHandler" as const;
export const _filter = "$filter" as const;
export const _htmlCanvas = "$htmlCanvas" as const;
export const _http = "$http" as const;
export const _httpParamSerializer = "$httpParamSerializer" as const;
export const _interpolate = "$interpolate" as const;
export const _location = "$location" as const;
export const _log = "$log" as const;
export const _machine = "$machine" as const;
export const _parse = "$parse" as const;
export const _rest = "$rest" as const;
export const _rootScope = "$rootScope" as const;
export const _rootElement = "$rootElement" as const;
export const _sce = "$sce" as const;
export const _sceDelegate = "$sceDelegate" as const;
export const _state = "$state" as const;
export const _stateRegistry = "$stateRegistry" as const;
export const _security = "$security" as const;
export const _serviceWorker = "$serviceWorker" as const;
export const _stream = "$stream" as const;
export const _sse = "$sse" as const;
export const _templateCache = "$templateCache" as const;
export const _templateRequest = "$templateRequest" as const;
export const _transitions = "$transitions" as const;
export const _window = "$window" as const;
export const _webComponent = "$webComponent" as const;
export const _webTransport = "$webTransport" as const;
export const _websocket = "$websocket" as const;
export const _worker = "$worker" as const;
export const _wasm = "$wasm" as const;
export const _workflow = "$workflow" as const;
export const _injector = "$injector" as const;

/**
 * Runtime token registry. Prefer importing individual token constants in source
 * files; use this aggregate only when configuring the runtime token map.
 */
export const $injectTokens = {
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
} as const satisfies Readonly<Record<string, string>>;
