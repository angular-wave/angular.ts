import 'dart:js_interop';

import 'facade.dart';
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
final angularToken = token<Angular>(
  '\$angular',
  fromJs: (value) => _facade(value, Angular.new),
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
final eventBusToken = token<EventBusService>(
  '\$eventBus',
  fromJs: (value) => _facade(value, EventBusService.new),
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
final stateToken = token<JSObject>('\$state');

/// The state registry token.
final stateRegistryToken = token<JSObject>('\$stateRegistry');

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
final transitionsToken = token<TransitionsService>(
  '\$transitions',
  fromJs: (value) => _facade(value, TransitionsService.new),
);

/// The internal router view token.
final viewToken = token<JSObject>('\$view');

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
final provideToken = token<JSObject>('\$provide');

/// The injector token.
final injectorToken = token<Injector>(
  '\$injector',
  fromJs: (value) => Injector(value as JSObject),
);
