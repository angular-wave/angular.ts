import 'dart:js_interop';

import 'injector.dart';
import 'scope.dart';
import 'services.dart';
import 'token.dart';

T _facade<T extends AngularTsJsFacade>(
  JSAny? value,
  T Function(JSObject raw) create,
) {
  return create(value as JSObject);
}

/// The angular token.
final angularToken = token<AngularService>(
  '\$angular',
  fromJs: (value) => _facade(value, AngularService.new),
);

/// The attrs token.
final attrsToken = token<Attributes>(
  '\$attrs',
  fromJs: (value) => _facade(value, Attributes.new),
);

/// The scope token.
final scopeToken = token<Scope<Object>>(
  '\$scope',
  fromJs: Scope<Object>.unsafe,
);

/// The element token.
final elementToken = token<JSObject>('\$element');

/// The anchor scroll token.
final anchorScrollToken = token<AnchorScrollService>(
  '\$anchorScroll',
  fromJs: (value) => _facade(value, AnchorScrollService.new),
);

/// The animate token.
final animateToken = token<AnimateService>(
  '\$animate',
  fromJs: (value) => _facade(value, AnimateService.new),
);

/// The aria token.
final ariaToken = token<AriaService>(
  '\$aria',
  fromJs: (value) => _facade(value, AriaService.new),
);

/// The compile token.
final compileToken = token<CompileService>(
  '\$compile',
  fromJs: (value) => _facade(value, CompileService.new),
);

/// The cookie token.
final cookieToken = token<CookieService>(
  '\$cookie',
  fromJs: (value) => _facade(value, CookieService.new),
);

/// The controller token.
final controllerToken = token<ControllerService>(
  '\$controller',
  fromJs: (value) => _facade(value, ControllerService.new),
);

/// The document token.
final documentToken = token<JSObject>('\$document');

/// The event bus token.
final eventBusToken = token<PubSubService>(
  '\$eventBus',
  fromJs: (value) => _facade(value, PubSubService.new),
);

/// The exception handler token.
final exceptionHandlerToken = token<ExceptionHandlerService>(
  '\$exceptionHandler',
  fromJs: (value) => _facade(value, ExceptionHandlerService.new),
);

/// The filter token.
final filterToken = token<FilterService>(
  '\$filter',
  fromJs: (value) => _facade(value, FilterService.new),
);

/// The http token.
final httpToken = token<HttpService>(
  '\$http',
  fromJs: (value) => _facade(value, HttpService.new),
);

/// The http param serializer token.
final httpParamSerializerToken = token<HttpParamSerializerService>(
  '\$httpParamSerializer',
  fromJs: (value) => _facade(value, HttpParamSerializerService.new),
);

/// The interpolate token.
final interpolateToken = token<InterpolateService>(
  '\$interpolate',
  fromJs: (value) => _facade(value, InterpolateService.new),
);

/// The location token.
final locationToken = token<LocationService>(
  '\$location',
  fromJs: (value) => _facade(value, LocationService.new),
);

/// The log token.
final logToken = token<LogService>(
  '\$log',
  fromJs: (value) => _facade(value, LogService.new),
);

/// The parse token.
final parseToken = token<ParseService>(
  '\$parse',
  fromJs: (value) => _facade(value, ParseService.new),
);

/// The rest token.
final restToken = token<RestServiceFacade>(
  '\$rest',
  fromJs: (value) => _facade(value, RestServiceFacade.new),
);

/// The root scope token.
final rootScopeToken = token<Scope<Object>>(
  '\$rootScope',
  fromJs: Scope<Object>.unsafe,
);

/// The root element token.
final rootElementToken = token<JSObject>('\$rootElement');

/// The sce token.
final sceToken = token<SceService>(
  '\$sce',
  fromJs: (value) => _facade(value, SceService.new),
);

/// The sce delegate token.
final sceDelegateToken = token<SceDelegateService>(
  '\$sceDelegate',
  fromJs: (value) => _facade(value, SceDelegateService.new),
);

/// The state token.
final stateToken = token<StateService>(
  '\$state',
  fromJs: (value) => _facade(value, StateService.new),
);

/// The state registry token.
final stateRegistryToken = token<StateRegistryService>(
  '\$stateRegistry',
  fromJs: (value) => _facade(value, StateRegistryService.new),
);

/// The sse token.
final sseToken = token<SseService>(
  '\$sse',
  fromJs: (value) => _facade(value, SseService.new),
);

/// The template cache token.
final templateCacheToken = token<TemplateCacheService>(
  '\$templateCache',
  fromJs: (value) => _facade(value, TemplateCacheService.new),
);

/// The template factory token.
final templateFactoryToken = token<JSObject>('\$templateFactory');

/// The template request token.
final templateRequestToken = token<TemplateRequestService>(
  '\$templateRequest',
  fromJs: (value) => _facade(value, TemplateRequestService.new),
);

/// The transitions token.
final transitionsToken = token<TransitionService>(
  '\$transitions',
  fromJs: (value) => _facade(value, TransitionService.new),
);

/// The view token.
final viewToken = token<ViewService>(
  '\$view',
  fromJs: (value) => _facade(value, ViewService.new),
);

/// The window token.
final windowToken = token<JSObject>('\$window');

/// The websocket token.
final websocketToken = token<WebSocketService>(
  '\$websocket',
  fromJs: (value) => _facade(value, WebSocketService.new),
);

/// The worker token.
final workerToken = token<WorkerService>(
  '\$worker',
  fromJs: (value) => _facade(value, WorkerService.new),
);

/// The wasm token.
final wasmToken = token<WasmService>(
  '\$wasm',
  fromJs: (value) => _facade(value, WasmService.new),
);

/// The provide token.
final provideToken = token<ProvideService>(
  '\$provide',
  fromJs: (value) => _facade(value, ProvideService.new),
);

/// The injector token.
final injectorToken = token<Injector>(
  '\$injector',
  fromJs: (value) => Injector(value as JSObject),
);

/// The angular provider token.
final angularProviderToken = token<AngularServiceProvider>(
  '\$angularProvider',
  fromJs: (value) => _facade(value, AngularServiceProvider.new),
);

/// The anchor scroll provider token.
final anchorScrollProviderToken = token<AnchorScrollProvider>(
  '\$anchorScrollProvider',
  fromJs: (value) => _facade(value, AnchorScrollProvider.new),
);

/// The compile provider token.
final compileProviderToken = token<CompileProvider>(
  '\$compileProvider',
  fromJs: (value) => _facade(value, CompileProvider.new),
);

/// The animate provider token.
final animateProviderToken = token<AnimateProvider>(
  '\$animateProvider',
  fromJs: (value) => _facade(value, AnimateProvider.new),
);

/// The aria provider token.
final ariaProviderToken = token<AriaProvider>(
  '\$ariaProvider',
  fromJs: (value) => _facade(value, AriaProvider.new),
);

/// The cookie provider token.
final cookieProviderToken = token<CookieProvider>(
  '\$cookieProvider',
  fromJs: (value) => _facade(value, CookieProvider.new),
);

/// The event bus provider token.
final eventBusProviderToken = token<EventBusProvider>(
  '\$eventBusProvider',
  fromJs: (value) => _facade(value, EventBusProvider.new),
);

/// The exception handler provider token.
final exceptionHandlerProviderToken = token<ExceptionHandlerProvider>(
  '\$exceptionHandlerProvider',
  fromJs: (value) => _facade(value, ExceptionHandlerProvider.new),
);

/// The filter provider token.
final filterProviderToken = token<FilterProvider>(
  '\$filterProvider',
  fromJs: (value) => _facade(value, FilterProvider.new),
);

/// The http provider token.
final httpProviderToken = token<HttpProvider>(
  '\$httpProvider',
  fromJs: (value) => _facade(value, HttpProvider.new),
);

/// The http param serializer provider token.
final httpParamSerializerProviderToken = token<HttpParamSerializerProvider>(
  '\$httpParamSerializerProvider',
  fromJs: (value) => _facade(value, HttpParamSerializerProvider.new),
);

/// The interpolate provider token.
final interpolateProviderToken = token<InterpolateProvider>(
  '\$interpolateProvider',
  fromJs: (value) => _facade(value, InterpolateProvider.new),
);

/// The location provider token.
final locationProviderToken = token<LocationProvider>(
  '\$locationProvider',
  fromJs: (value) => _facade(value, LocationProvider.new),
);

/// The log provider token.
final logProviderToken = token<LogProvider>(
  '\$logProvider',
  fromJs: (value) => _facade(value, LogProvider.new),
);

/// The parse provider token.
final parseProviderToken = token<ParseProvider>(
  '\$parseProvider',
  fromJs: (value) => _facade(value, ParseProvider.new),
);

/// The rest provider token.
final restProviderToken = token<RestProvider>(
  '\$restProvider',
  fromJs: (value) => _facade(value, RestProvider.new),
);

/// The root scope provider token.
final rootScopeProviderToken = token<RootScopeProvider>(
  '\$rootScopeProvider',
  fromJs: (value) => _facade(value, RootScopeProvider.new),
);

/// The sce provider token.
final sceProviderToken = token<SceProvider>(
  '\$sceProvider',
  fromJs: (value) => _facade(value, SceProvider.new),
);

/// The sce delegate provider token.
final sceDelegateProviderToken = token<SceDelegateProvider>(
  '\$sceDelegateProvider',
  fromJs: (value) => _facade(value, SceDelegateProvider.new),
);

/// The sse provider token.
final sseProviderToken = token<SseProvider>(
  '\$sseProvider',
  fromJs: (value) => _facade(value, SseProvider.new),
);

/// The state provider token.
final stateProviderToken = token<StateProvider>(
  '\$stateProvider',
  fromJs: (value) => _facade(value, StateProvider.new),
);

/// The state registry provider token.
final stateRegistryProviderToken = token<StateRegistryProvider>(
  '\$stateRegistryProvider',
  fromJs: (value) => _facade(value, StateRegistryProvider.new),
);

/// The template cache provider token.
final templateCacheProviderToken = token<TemplateCacheProvider>(
  '\$templateCacheProvider',
  fromJs: (value) => _facade(value, TemplateCacheProvider.new),
);

/// The template factory provider token.
final templateFactoryProviderToken = token<TemplateFactoryProvider>(
  '\$templateFactoryProvider',
  fromJs: (value) => _facade(value, TemplateFactoryProvider.new),
);

/// The template request provider token.
final templateRequestProviderToken = token<TemplateRequestProvider>(
  '\$templateRequestProvider',
  fromJs: (value) => _facade(value, TemplateRequestProvider.new),
);

/// The transitions provider token.
final transitionsProviderToken = token<TransitionsProvider>(
  '\$transitionsProvider',
  fromJs: (value) => _facade(value, TransitionsProvider.new),
);

/// The view provider token.
final viewProviderToken = token<ViewProvider>(
  '\$viewProvider',
  fromJs: (value) => _facade(value, ViewProvider.new),
);

/// The websocket provider token.
final websocketProviderToken = token<WebSocketProvider>(
  '\$websocketProvider',
  fromJs: (value) => _facade(value, WebSocketProvider.new),
);

/// The worker provider token.
final workerProviderToken = token<WorkerProvider>(
  '\$workerProvider',
  fromJs: (value) => _facade(value, WorkerProvider.new),
);

/// The wasm provider token.
final wasmProviderToken = token<WasmProvider>(
  '\$wasmProvider',
  fromJs: (value) => _facade(value, WasmProvider.new),
);

/// The controller provider token.
final controllerProviderToken = token<ControllerProvider>(
  '\$controllerProvider',
  fromJs: (value) => _facade(value, ControllerProvider.new),
);
