package angular.ts

import angular.ts.generated.Angular as RawAngular
import angular.ts.generated.AnchorScrollService as RawAnchorScrollService
import angular.ts.generated.AnimateService as RawAnimateService
import angular.ts.generated.AriaService as RawAriaService
import angular.ts.generated.CompileService as RawCompileService
import angular.ts.generated.ControllerService as RawControllerService
import angular.ts.generated.CookieService as RawCookieService
import angular.ts.generated.ExceptionHandlerService as RawExceptionHandlerService
import angular.ts.generated.FilterService as RawFilterService
import angular.ts.generated.HttpParamSerializerService as RawHttpParamSerializerService
import angular.ts.generated.HttpService as RawHttpService
import angular.ts.generated.InjectorService as RawInjectorService
import angular.ts.generated.InterpolateService as RawInterpolateService
import angular.ts.generated.LocationService as RawLocationService
import angular.ts.generated.LogService as RawLogService
import angular.ts.generated.ParseService as RawParseService
import angular.ts.generated.RestFactory as RawRestFactory
import angular.ts.generated.Scope as RawScope
import angular.ts.generated.SseService as RawSseService
import angular.ts.generated.StateRegistryService as RawStateRegistryService
import angular.ts.generated.StateService as RawStateService
import angular.ts.generated.TemplateCacheService as RawTemplateCacheService
import angular.ts.generated.TemplateRequestService as RawTemplateRequestService
import angular.ts.generated.TransitionsService as RawTransitionsService
import angular.ts.generated.WebComponentService as RawWebComponentService
import angular.ts.generated.WebSocketService as RawWebSocketService
import angular.ts.generated.WebTransportService as RawWebTransportService
import org.w3c.dom.Element

public val angularToken: Token<Angular> =
    Token("\$angular") { value -> Angular(value.unsafeCast<RawAngular>()) }

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
        HttpParamSerializerService(value.unsafeCast<RawHttpParamSerializerService>())
    }

public val injectorToken: Token<Injector> =
    Token("\$injector") { value ->
        Injector(value.unsafeCast<RawInjectorService<Any?>>())
    }

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
    Token("\$state") { value -> StateService(value.unsafeCast<RawStateService<Any?>>()) }

public val stateRegistryToken: Token<StateRegistryService> =
    Token("\$stateRegistry") { value -> StateRegistryService(value.unsafeCast<RawStateRegistryService>()) }

public val sseToken: Token<SseService> =
    Token("\$sse") { value -> SseService(value.unsafeCast<RawSseService>()) }

public val templateCacheToken: Token<TemplateCacheService> =
    Token("\$templateCache") { value -> TemplateCacheService(value.unsafeCast<RawTemplateCacheService>()) }

public val templateRequestToken: Token<TemplateRequestService> =
    Token("\$templateRequest") { value -> TemplateRequestService(value.unsafeCast<RawTemplateRequestService>()) }

public val transitionsToken: Token<TransitionsService> =
    Token("\$transitions") { value -> TransitionsService(value.unsafeCast<RawTransitionsService>()) }

public val websocketToken: Token<WebSocketService> =
    Token("\$websocket") { value -> WebSocketService(value.unsafeCast<RawWebSocketService>()) }

public val webTransportToken: Token<WebTransportService> =
    Token("\$webTransport") { value -> WebTransportService(value.unsafeCast<RawWebTransportService>()) }

public val webComponentToken: Token<WebComponentService> =
    Token("\$webComponent") { value -> WebComponentService(value.unsafeCast<RawWebComponentService>()) }

public val workerToken: Token<WorkerService> =
    Token("\$worker") { value -> WorkerService(value) }

public val wasmToken: Token<WasmService> =
    Token("\$wasm") { value -> WasmService(value) }
