package angular.ts

import angular.ts.generated.Angular as RawAngular
import angular.ts.generated.AnchorScrollService as RawAnchorScrollService
import angular.ts.generated.AnimateService as RawAnimateService
import angular.ts.generated.AriaService as RawAriaService
import angular.ts.generated.Attributes as RawAttributes
import angular.ts.generated.AttributesService as RawAttributesService
import angular.ts.generated.CompileService as RawCompileService
import angular.ts.generated.ControllerService as RawControllerService
import angular.ts.generated.CookieService as RawCookieService
import angular.ts.generated.ExceptionHandlerService as RawExceptionHandlerService
import angular.ts.generated.FilterProvider as RawFilterProvider
import angular.ts.generated.FilterService as RawFilterService
import angular.ts.generated.HttpParamSerializerProvider as RawHttpParamSerializerProvider
import angular.ts.generated.HttpParamSerializerSerService as RawHttpParamSerializerSerService
import angular.ts.generated.HttpService as RawHttpService
import angular.ts.generated.InjectorService as RawInjectorService
import angular.ts.generated.InterpolateService as RawInterpolateService
import angular.ts.generated.LocationService as RawLocationService
import angular.ts.generated.LogService as RawLogService
import angular.ts.generated.ParseService as RawParseService
import angular.ts.generated.ProvideService as RawProvideService
import angular.ts.generated.RestFactory as RawRestFactory
import angular.ts.generated.Scope as RawScope
import angular.ts.generated.SseService as RawSseService
import angular.ts.generated.StateRegistryService as RawStateRegistryService
import angular.ts.generated.StateService as RawStateService
import angular.ts.generated.TemplateCacheService as RawTemplateCacheService
import angular.ts.generated.TemplateRequestService as RawTemplateRequestService
import angular.ts.generated.TransitionService as RawTransitionService
import angular.ts.generated.WasmService as RawWasmService
import angular.ts.generated.WebSocketService as RawWebSocketService
import angular.ts.generated.WebTransportService as RawWebTransportService
import org.w3c.dom.Element

public val angularToken: Token<AngularService> =
    Token("\$angular") { value -> AngularService(value.unsafeCast<RawAngular>()) }

public val attrsToken: Token<Attributes> =
    Token("\$attrs") { value -> Attributes(value.unsafeCast<RawAttributes>()) }

public val attributesToken: Token<AttributesService> =
    Token("\$attributes") { value -> AttributesService(value.unsafeCast<RawAttributesService>()) }

public val anchorScrollToken: Token<AnchorScrollService> =
    Token("\$anchorScroll") { value -> AnchorScrollService(value.unsafeCast<RawAnchorScrollService>()) }

public val animateToken: Token<AnimateService> =
    Token("\$animate") { value -> AnimateService(value.unsafeCast<RawAnimateService>()) }

public val ariaToken: Token<AriaService> =
    Token("\$aria") { value -> AriaService(value.unsafeCast<RawAriaService>()) }

public val scopeToken: Token<Scope<Any>> =
    Token("\$scope") { value -> Scope(value.unsafeCast<RawScope>()) }

public val rootScopeToken: Token<Scope<Any>> =
    Token("\$rootScope") { value -> Scope(value.unsafeCast<RawScope>()) }

public val rootElementToken: Token<Element> =
    Token("\$rootElement") { value -> value.unsafeCast<Element>() }

public val compileToken: Token<CompileService> =
    Token("\$compile") { value -> CompileService(value.unsafeCast<RawCompileService>()) }

public val controllerToken: Token<ControllerService> =
    Token("\$controller") { value -> ControllerService(value.unsafeCast<RawControllerService>()) }

public val cookieToken: Token<CookieService> =
    Token("\$cookie") { value -> CookieService(value.unsafeCast<RawCookieService>()) }

public val exceptionHandlerToken: Token<ExceptionHandlerService> =
    Token("\$exceptionHandler") { value -> ExceptionHandlerService(value.unsafeCast<RawExceptionHandlerService>()) }

public val filterToken: Token<FilterService> =
    Token("\$filter") { value -> FilterService(value.unsafeCast<RawFilterService>()) }

public val httpToken: Token<HttpService> =
    Token("\$http") { value -> HttpService(value.unsafeCast<RawHttpService>()) }

public val httpParamSerializerToken: Token<HttpParamSerializerService> =
    Token("\$httpParamSerializer") { value ->
        HttpParamSerializerService(value.unsafeCast<RawHttpParamSerializerSerService>())
    }

public val injectorToken: Token<Injector> =
    Token("\$injector") { value -> Injector(value.unsafeCast<RawInjectorService>()) }

public val interpolateToken: Token<InterpolateService> =
    Token("\$interpolate") { value -> InterpolateService(value.unsafeCast<RawInterpolateService>()) }

public val logToken: Token<LogService> =
    Token("\$log") { value -> LogService(value.unsafeCast<RawLogService>()) }

public val locationToken: Token<LocationService> =
    Token("\$location") { value -> LocationService(value.unsafeCast<RawLocationService>()) }

public val parseToken: Token<ParseService> =
    Token("\$parse") { value -> ParseService(value.unsafeCast<RawParseService>()) }

public val restToken: Token<RestFactory> =
    Token("\$rest") { value -> RestFactory(value.unsafeCast<RawRestFactory>()) }

public val stateToken: Token<StateService> =
    Token("\$state") { value -> StateService(value.unsafeCast<RawStateService>()) }

public val stateRegistryToken: Token<StateRegistryService> =
    Token("\$stateRegistry") { value -> StateRegistryService(value.unsafeCast<RawStateRegistryService>()) }

public val sseToken: Token<SseService> =
    Token("\$sse") { value -> SseService(value.unsafeCast<RawSseService>()) }

public val provideToken: Token<ProvideService> =
    Token("\$provide") { value -> ProvideService(value.unsafeCast<RawProvideService>()) }

public val templateCacheToken: Token<TemplateCacheService> =
    Token("\$templateCache") { value -> TemplateCacheService(value.unsafeCast<RawTemplateCacheService>()) }

public val templateRequestToken: Token<TemplateRequestService> =
    Token("\$templateRequest") { value -> TemplateRequestService(value.unsafeCast<RawTemplateRequestService>()) }

public val transitionsToken: Token<TransitionService> =
    Token("\$transitions") { value -> TransitionService(value.unsafeCast<RawTransitionService>()) }

public val websocketToken: Token<WebSocketService> =
    Token("\$websocket") { value -> WebSocketService(value.unsafeCast<RawWebSocketService>()) }

public val webTransportToken: Token<WebTransportService> =
    Token("\$webTransport") { value -> WebTransportService(value.unsafeCast<RawWebTransportService>()) }

public val workerToken: Token<WorkerService> =
    Token("\$worker") { value -> WorkerService(value) }

public val wasmToken: Token<WasmService> =
    Token("\$wasm") { value -> WasmService(value.unsafeCast<RawWasmService>()) }

public val filterProviderToken: Token<FilterProvider> =
    Token("\$filterProvider") { value -> FilterProvider(value.unsafeCast<RawFilterProvider>()) }

public val animateProviderToken: Token<AnimateProvider> =
    Token("\$animateProvider") { value -> AnimateProvider(value) }

public val httpProviderToken: Token<HttpProvider> =
    Token("\$httpProvider") { value -> HttpProvider(value) }

public val httpParamSerializerProviderToken: Token<HttpParamSerializerProvider> =
    Token("\$httpParamSerializerProvider") { value ->
        HttpParamSerializerProvider(value.unsafeCast<RawHttpParamSerializerProvider>())
    }

public val restProviderToken: Token<RestProvider> =
    Token("\$restProvider") { value -> RestProvider(value) }

public val sseProviderToken: Token<SseProvider> =
    Token("\$sseProvider") { value -> SseProvider(value) }

public val stateProviderToken: Token<StateService> =
    Token("\$stateProvider") { value -> StateService(value.unsafeCast<RawStateService>()) }

public val stateRegistryProviderToken: Token<StateRegistryService> =
    Token("\$stateRegistryProvider") { value -> StateRegistryService(value.unsafeCast<RawStateRegistryService>()) }

public val transitionsProviderToken: Token<TransitionService> =
    Token("\$transitionsProvider") { value -> TransitionService(value.unsafeCast<RawTransitionService>()) }

public val websocketProviderToken: Token<WebSocketProvider> =
    Token("\$websocketProvider") { value -> WebSocketProvider(value) }

public val webTransportProviderToken: Token<WebTransportProvider> =
    Token("\$webTransportProvider") { value -> WebTransportProvider(value) }

public val workerProviderToken: Token<WorkerProvider> =
    Token("\$workerProvider") { value -> WorkerProvider(value) }

public val wasmProviderToken: Token<WasmProvider> =
    Token("\$wasmProvider") { value -> WasmProvider(value) }
