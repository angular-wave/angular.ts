;; Generated from ../externs/angular.js by scripts/generate-cljs-types.mjs.
;; Do not edit directly.
(ns angular-ts.generated)

(set! *warn-on-infer* true)

(def public-type-tags
  "AngularTS public Closure extern types available as ClojureScript tags."
  #{"js/ng.AnchorScrollProvider"
    "js/ng.AnchorScrollService"
    "js/ng.Angular"
    "js/ng.AngularElementDefinition"
    "js/ng.AngularElementModuleOptions"
    "js/ng.AngularElementOptions"
    "js/ng.AngularProvider"
    "js/ng.AngularService"
    "js/ng.AngularServiceProvider"
    "js/ng.AnimateProvider"
    "js/ng.AnimateService"
    "js/ng.AnimationContext"
    "js/ng.AnimationHandle"
    "js/ng.AnimationLifecycleCallback"
    "js/ng.AnimationOptions"
    "js/ng.AnimationPhase"
    "js/ng.AnimationPreset"
    "js/ng.AnimationPresetHandler"
    "js/ng.AnimationResult"
    "js/ng.AnnotatedDirectiveFactory"
    "js/ng.AnnotatedFactory"
    "js/ng.AppComponentOptions"
    "js/ng.AriaProvider"
    "js/ng.AriaService"
    "js/ng.CachedRestBackendOptions"
    "js/ng.ClassMap"
    "js/ng.ClassValue"
    "js/ng.CompileLifecycleProvider"
    "js/ng.CompileLifecycleService"
    "js/ng.CompileProvider"
    "js/ng.CompileService"
    "js/ng.Component"
    "js/ng.ConnectionConfig"
    "js/ng.ConnectionEvent"
    "js/ng.Controller"
    "js/ng.ControllerConstructor"
    "js/ng.ControllerProvider"
    "js/ng.ControllerService"
    "js/ng.CookieOptions"
    "js/ng.CookieProvider"
    "js/ng.CookieService"
    "js/ng.CookieStoreOptions"
    "js/ng.CurrencyFilterOptions"
    "js/ng.DateFilterOptions"
    "js/ng.Directive"
    "js/ng.DirectiveFactory"
    "js/ng.DirectiveRestrict"
    "js/ng.DocumentService"
    "js/ng.ElementScopeOptions"
    "js/ng.ElementService"
    "js/ng.EntityClass"
    "js/ng.EntryFilterItem"
    "js/ng.ErrorHandlingConfig"
    "js/ng.EventBusProvider"
    "js/ng.EventBusService"
    "js/ng.ExceptionHandlerProvider"
    "js/ng.ExceptionHandlerService"
    "js/ng.Expression"
    "js/ng.FilterFactory"
    "js/ng.FilterFn"
    "js/ng.FilterProvider"
    "js/ng.FilterService"
    "js/ng.HttpMethod"
    "js/ng.HttpParamSerializerProvider"
    "js/ng.HttpParamSerializerService"
    "js/ng.HttpPromise"
    "js/ng.HttpProvider"
    "js/ng.HttpProviderDefaults"
    "js/ng.HttpResponse"
    "js/ng.HttpResponseStatus"
    "js/ng.HttpService"
    "js/ng.Injectable"
    "js/ng.InjectionTokens"
    "js/ng.InjectorService"
    "js/ng.InterpolateProvider"
    "js/ng.InterpolateService"
    "js/ng.InterpolationFunction"
    "js/ng.InvocationDetail"
    "js/ng.ListenerFn"
    "js/ng.LocationProvider"
    "js/ng.LocationService"
    "js/ng.LogProvider"
    "js/ng.LogService"
    "js/ng.Machine"
    "js/ng.MachineConfig"
    "js/ng.MachineMode"
    "js/ng.MachineProvider"
    "js/ng.MachineService"
    "js/ng.MachineTransition"
    "js/ng.MachineTransitionMap"
    "js/ng.MachineTransitionResult"
    "js/ng.NativeAnimationOptions"
    "js/ng.NativeWebTransport"
    "js/ng.NgModelController"
    "js/ng.NgModule"
    "js/ng.NumberFilterOptions"
    "js/ng.ParseProvider"
    "js/ng.ParseService"
    "js/ng.ProvideService"
    "js/ng.PubSubProvider"
    "js/ng.PubSubService"
    "js/ng.PublicLinkFn"
    "js/ng.RealtimeProtocolEventDetail"
    "js/ng.RealtimeProtocolMessage"
    "js/ng.RelativeTimeFilterOptions"
    "js/ng.RequestConfig"
    "js/ng.RequestShortcutConfig"
    "js/ng.RestBackend"
    "js/ng.RestCacheStore"
    "js/ng.RestCacheStrategy"
    "js/ng.RestDefinition"
    "js/ng.RestFactory"
    "js/ng.RestOptions"
    "js/ng.RestProvider"
    "js/ng.RestRequest"
    "js/ng.RestResponse"
    "js/ng.RestRevalidateEvent"
    "js/ng.RestService"
    "js/ng.RootElementService"
    "js/ng.RootScopeProvider"
    "js/ng.RootScopeService"
    "js/ng.RouterProvider"
    "js/ng.SceDelegateProvider"
    "js/ng.SceDelegateService"
    "js/ng.SceProvider"
    "js/ng.SceService"
    "js/ng.Scope"
    "js/ng.ScopeElement"
    "js/ng.ScopeElementConstructor"
    "js/ng.ScopeEvent"
    "js/ng.ScopeService"
    "js/ng.ServiceProvider"
    "js/ng.SseConfig"
    "js/ng.SseConnection"
    "js/ng.SseProtocolEventDetail"
    "js/ng.SseProtocolMessage"
    "js/ng.SseProvider"
    "js/ng.SseService"
    "js/ng.StateDeclaration"
    "js/ng.StateProvider"
    "js/ng.StateRegistryProvider"
    "js/ng.StateRegistryService"
    "js/ng.StateResolveArray"
    "js/ng.StateResolveObject"
    "js/ng.StateService"
    "js/ng.StorageBackend"
    "js/ng.StorageType"
    "js/ng.StreamProvider"
    "js/ng.StreamService"
    "js/ng.SwapModeType"
    "js/ng.TemplateCacheProvider"
    "js/ng.TemplateCacheService"
    "js/ng.TemplateFactoryProvider"
    "js/ng.TemplateFactoryService"
    "js/ng.TemplateRequestProvider"
    "js/ng.TemplateRequestService"
    "js/ng.TranscludeFn"
    "js/ng.Transition"
    "js/ng.TransitionProvider"
    "js/ng.TransitionService"
    "js/ng.TransitionsProvider"
    "js/ng.TransitionsService"
    "js/ng.Validator"
    "js/ng.ViewProvider"
    "js/ng.ViewService"
    "js/ng.WasmAbiExports"
    "js/ng.WasmInstantiationResult"
    "js/ng.WasmOptions"
    "js/ng.WasmProvider"
    "js/ng.WasmScope"
    "js/ng.WasmScopeAbi"
    "js/ng.WasmScopeAbiImportObject"
    "js/ng.WasmScopeAbiImports"
    "js/ng.WasmScopeBindingOptions"
    "js/ng.WasmScopeOptions"
    "js/ng.WasmScopeReference"
    "js/ng.WasmScopeUpdate"
    "js/ng.WasmScopeWatchOptions"
    "js/ng.WasmService"
    "js/ng.WebComponentContext"
    "js/ng.WebComponentInput"
    "js/ng.WebComponentInputConfig"
    "js/ng.WebComponentInputs"
    "js/ng.WebComponentProvider"
    "js/ng.WebComponentService"
    "js/ng.WebSocketConfig"
    "js/ng.WebSocketConnection"
    "js/ng.WebSocketProvider"
    "js/ng.WebSocketService"
    "js/ng.WebTransportBufferInput"
    "js/ng.WebTransportCertificateHash"
    "js/ng.WebTransportConfig"
    "js/ng.WebTransportConnection"
    "js/ng.WebTransportDatagramEvent"
    "js/ng.WebTransportOptions"
    "js/ng.WebTransportProvider"
    "js/ng.WebTransportReconnectEvent"
    "js/ng.WebTransportRetryDelay"
    "js/ng.WebTransportService"
    "js/ng.WindowService"
    "js/ng.WorkerConfig"
    "js/ng.WorkerConnection"
    "js/ng.WorkerProvider"
    "js/ng.WorkerService"})

(comment
  (def public-type-docs
    "Source-only documentation preserved from AngularTS Closure externs, keyed by ClojureScript type tag."
    {"js/ng.AnchorScrollProvider" "Public AngularTS AnchorScrollProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnchorScrollService" "Public AngularTS AnchorScrollService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Angular" "AngularTS runtime instance used to create modules, bootstrap DOM trees, create injectors, and recover scopes from native elements."
     "js/ng.AngularElementDefinition" "Runtime metadata returned after defining a standalone custom element."
     "js/ng.AngularElementModuleOptions" "Configuration for the application module that owns the custom element."
     "js/ng.AngularElementOptions" "Public AngularTS AngularElementOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AngularProvider" "Public AngularTS AngularProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AngularService" "Main AngularTS runtime entry point with the full built-in `ng` module configured by default."
     "js/ng.AngularServiceProvider" "Public AngularTS AngularServiceProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimateProvider" "Public AngularTS AnimateProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimateService" "Public AngularTS AnimateService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimationContext" "Public AngularTS AnimationContext contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimationHandle" "Public AngularTS AnimationHandle contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimationLifecycleCallback" "Public AngularTS AnimationLifecycleCallback contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimationOptions" "Public AngularTS AnimationOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimationPhase" "Public AngularTS AnimationPhase contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimationPreset" "Public AngularTS AnimationPreset contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimationPresetHandler" "Public AngularTS AnimationPresetHandler contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnimationResult" "Public AngularTS AnimationResult contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnnotatedDirectiveFactory" "Dependency-annotated directive factory array containing dependency token names followed by a directive factory function."
     "js/ng.AnnotatedFactory" "Dependency-annotated injectable array containing dependency token names followed by the factory or constructor function."
     "js/ng.AppComponentOptions" "Public AngularTS AppComponentOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AriaProvider" "Used for configuring the ARIA attributes injected and managed by ngAria. ```js angular.module('myApp', ['ngAria'], function config($ariaProvider) { $ariaProvider.config({ ariaValue: true, tabindex: false }); }); ``` ## Dependencies Requires the {@link ngAria } module to be installed."
     "js/ng.AriaService" "Public AngularTS AriaService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.CachedRestBackendOptions" "Configuration for {@link CachedRestBackend}."
     "js/ng.ClassMap" "Boolean class map consumed by `ng-class`. Each key is a CSS class name. Truthy values add the class; `false`, `null`, and `undefined` remove it."
     "js/ng.ClassValue" "Public shape accepted by `ng-class` for class binding expressions."
     "js/ng.CompileLifecycleProvider" "Publishes controller creation/destruction events from `$compile`."
     "js/ng.CompileLifecycleService" "Publishes controller creation/destruction events from `$compile`."
     "js/ng.CompileProvider" "Public AngularTS CompileProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.CompileService" "Entry point for the `$compile` service."
     "js/ng.Component" "Defines a component's configuration object (a simplified directive definition object)."
     "js/ng.ConnectionConfig" "Public AngularTS ConnectionConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ConnectionEvent" "Public AngularTS ConnectionEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Controller" "AngularTS component lifecycle interface. Directive controllers have a well-defined lifecycle. Each controller can implement \"lifecycle hooks\". These are methods that will be called by Angular at certain points in the life cycle of the directive. https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks https://docs.angularjs.org/guide/component"
     "js/ng.ControllerConstructor" "A controller constructor function used in AngularTS."
     "js/ng.ControllerProvider" "Public AngularTS ControllerProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ControllerService" "Public AngularTS ControllerService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.CookieOptions" "Public AngularTS CookieOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.CookieProvider" "Service provider that creates a {@link CookieService$cookie} service."
     "js/ng.CookieService" "High-level API for reading, writing, serializing, and removing browser cookies through the injectable `$cookie` service."
     "js/ng.CookieStoreOptions" "Serialization options for cookie-backed stores."
     "js/ng.CurrencyFilterOptions" "Public AngularTS CurrencyFilterOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.DateFilterOptions" "Public AngularTS DateFilterOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Directive" "Public AngularTS Directive contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.DirectiveFactory" "Directive registration factory that returns either a directive definition object or a link function."
     "js/ng.DirectiveRestrict" "Supported directive matching locations."
     "js/ng.DocumentService" "The **`Document`** interface represents any web page loaded in the browser and serves as an entry point into the web page's content, which is the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document)"
     "js/ng.ElementScopeOptions" "Public AngularTS ElementScopeOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ElementService" "**`Element`** is the most general base class from which all element objects (i.e., objects that represent elements) in a Document inherit. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element)"
     "js/ng.EntityClass" "Constructor used by REST resources to map raw response data into entity instances."
     "js/ng.EntryFilterItem" "Public AngularTS EntryFilterItem contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ErrorHandlingConfig" "Error configuration object. May only contain the options that need to be updated."
     "js/ng.EventBusProvider" "Configurable provider for the application-wide {@link PubSub} event bus. The provider creates the singleton `$eventBus` service and also exposes it on the global Angular service for integrations that publish from outside dependency injection."
     "js/ng.EventBusService" "Public AngularTS EventBusService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ExceptionHandlerProvider" "Provider for the `$exceptionHandler` service. The default implementation rethrows exceptions, enabling strict fail-fast behavior. Applications may replace the handler via by setting `errorHandler`property or by providing their own `$exceptionHandler` factory."
     "js/ng.ExceptionHandlerService" "A callback type for handling errors."
     "js/ng.Expression" "Public AngularTS Expression contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterFactory" "Public AngularTS FilterFactory contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterFn" "Public AngularTS FilterFn contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterProvider" "Public AngularTS FilterProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterService" "Public AngularTS FilterService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpMethod" "Public AngularTS HttpMethod contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpParamSerializerProvider" "Default params serializer that converts objects to strings according to the following rules: * `{'foo': 'bar'}` results in `foo=bar` * `{'foo': Date.now()}` results in `foo=2015-04-01T09%3A50%3A49.262Z` (`toISOString()` and encoded representation of a Date object) * `{'foo': ['bar', 'baz']}` results in `foo=bar&foo=baz` (repeated key for each array element) * `{'foo': {'bar':'baz'}}` results in `foo=%7B%22bar%22%3A%22baz%22%7D` (stringified and encoded representation of an object) Note that serializer will sort the request parameters alphabetically. Provider configuration surface available as `$httpParamSerializerProvider`."
     "js/ng.HttpParamSerializerService" "Function that serializes query params into a URL-encoded string."
     "js/ng.HttpPromise" "Public AngularTS HttpPromise contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpProvider" "Configures the default behavior of the `$http` service. Provider configuration surface available as `$httpProvider`."
     "js/ng.HttpProviderDefaults" "Default request settings exposed through `$httpProvider.defaults`. Not every `RequestShortcutConfig` field is supported here; this shape only includes the fields that the runtime reads from provider-level defaults. https://docs.angularjs.org/api/ng/service/$http#defaults https://docs.angularjs.org/api/ng/service/$http#usage https://docs.angularjs.org/api/ng/provider/$httpProvider The properties section"
     "js/ng.HttpResponse" "Public AngularTS HttpResponse contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpResponseStatus" "Final transport status reported by transport completion handlers."
     "js/ng.HttpService" "Runtime `$http` service contract for full request configs, HTTP verb shortcuts, defaults, and pending request tracking."
     "js/ng.Injectable" "AngularTS dependency-injectable function or dependency-annotated factory array."
     "js/ng.InjectionTokens" "Public AngularTS InjectionTokens contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.InjectorService" "Injector for factories and services"
     "js/ng.InterpolateProvider" "Public AngularTS InterpolateProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.InterpolateService" "Public AngularTS InterpolateService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.InterpolationFunction" "Public AngularTS InterpolationFunction contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.InvocationDetail" "Public AngularTS InvocationDetail contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ListenerFn" "Public AngularTS ListenerFn contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.LocationProvider" "Public AngularTS LocationProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.LocationService" "Public AngularTS LocationService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.LogProvider" "Configuration provider for `$log` service"
     "js/ng.LogService" "Service for logging messages at various levels."
     "js/ng.Machine" "Public AngularTS Machine contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineConfig" "Public AngularTS MachineConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineMode" "Public AngularTS MachineMode contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineProvider" "Provides reactive mode machines backed by AngularTS scope proxies."
     "js/ng.MachineService" "Public AngularTS MachineService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineTransition" "Public AngularTS MachineTransition contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineTransitionMap" "Make all properties in T optional"
     "js/ng.MachineTransitionResult" "Public AngularTS MachineTransitionResult contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.NativeAnimationOptions" "Public AngularTS NativeAnimationOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.NativeWebTransport" "Public AngularTS NativeWebTransport contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.NgModelController" "Public AngularTS NgModelController contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.NgModule" "AngularTS module registration surface for controllers, directives, services, factories, providers, filters, run blocks, and config blocks."
     "js/ng.NumberFilterOptions" "Public AngularTS NumberFilterOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ParseProvider" "Public AngularTS ParseProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ParseService" "Parses a string or expression function into a compiled expression."
     "js/ng.ProvideService" "The API for registering different types of providers with the injector. This interface is used within AngularTS's `$provide` service to define services, factories, constants, values, decorators, etc."
     "js/ng.PubSubProvider" "Provider used during module configuration to register and expose the application-wide AngularTS pub/sub event bus service."
     "js/ng.PubSubService" "Topic-based publish/subscribe service for decoupled application events."
     "js/ng.PublicLinkFn" "A function returned by the `$compile` service that links a compiled template to a scope."
     "js/ng.RealtimeProtocolEventDetail" "Public AngularTS RealtimeProtocolEventDetail contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RealtimeProtocolMessage" "Public AngularTS RealtimeProtocolMessage contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RelativeTimeFilterOptions" "An object with some or all of properties of `options` parameter of `Intl.RelativeTimeFormat` constructor. [MDN](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat/RelativeTimeFormat#Parameters)."
     "js/ng.RequestConfig" "Full request configuration accepted by `$http(...)`. See http://docs.angularjs.org/api/ng/service/$http#usage"
     "js/ng.RequestShortcutConfig" "Request options shared by the `$http` shortcut methods. See http://docs.angularjs.org/api/ng/service/$http#usage"
     "js/ng.RestBackend" "Backend abstraction used by {@link RestService}. Implement this interface to route REST operations through `$http`, IndexedDB, the Cache API, a test double, or a composed backend such as {@link CachedRestBackend}."
     "js/ng.RestCacheStore" "Async cache store used by {@link CachedRestBackend}. The interface is deliberately small so implementations can be backed by IndexedDB, the browser Cache API, local storage, memory, or test fixtures."
     "js/ng.RestCacheStrategy" "Read strategy used by {@link CachedRestBackend} for `GET` requests. - `cache-first`: return cached data when present, otherwise fetch network. - `network-first`: fetch network first, falling back to stale cache on error. - `stale-while-revalidate`: return cache immediately and refresh in the background."
     "js/ng.RestDefinition" "Public AngularTS RestDefinition contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestFactory" "Factory service exposed as `$rest`. Creates a typed {@link RestService} for a base URL, optional entity mapper, and optional backend request defaults."
     "js/ng.RestOptions" "Extra backend options merged into requests made by a REST resource."
     "js/ng.RestProvider" "Public AngularTS RestProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestRequest" "Normalized request object passed from {@link RestService} to a {@link RestBackend}. Backends receive expanded URLs and already-separated request options, so they can focus on transport, persistence, or cache policy."
     "js/ng.RestResponse" "Public AngularTS RestResponse contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestRevalidateEvent" "Public AngularTS RestRevalidateEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestService" "Public AngularTS RestService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RootElementService" "**`Element`** is the most general base class from which all element objects (i.e., objects that represent elements) in a Document inherit. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element)"
     "js/ng.RootScopeProvider" "Public AngularTS RootScopeProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RootScopeService" "Scope class for the Proxy. It intercepts operations like property access (get) and property setting (set), and adds support for deep change tracking and observer-like behavior."
     "js/ng.RouterProvider" "Mutable router state/config shared across state, URL, and transition services."
     "js/ng.SceDelegateProvider" "' ]); // The banned resource URL list overrides the trusted resource URL list so the open redirect // here is blocked. $sceDelegateProvider.bannedResourceUrlList([ 'http://myapp.example.com/clickThru**' ]); }); ``` Note that an empty trusted resource URL list will block every resource URL from being loaded, and will require you to manually mark each one as trusted with `$sce.trustAsResourceUrl`. However, templates requested by {@link ng.$templateRequest $templateRequest} that are present in {@link ng.$templateCache $templateCache} will not go through this check. If you have a mechanism to populate your templates in that cache at config time, then it is a good idea to remove 'self' from the trusted resource URL lsit. This helps to mitigate the security impact of certain types of issues, like for instance attacker-controlled `ng-includes`."
     "js/ng.SceDelegateService" "Public AngularTS SceDelegateService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SceProvider" "Provider configuration surface available as `$sceProvider`."
     "js/ng.SceService" "Public AngularTS SceService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Scope" "Reactive scope object used by AngularTS templates, directives, event propagation, listener registration, and queued change delivery."
     "js/ng.ScopeElement" "Public AngularTS ScopeElement contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ScopeElementConstructor" "Public AngularTS ScopeElementConstructor contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ScopeEvent" "Event object passed to `$emit` and `$broadcast` listeners. Tracks target scope, current scope, name, propagation/default flags, and control methods."
     "js/ng.ScopeService" "Scope class for the Proxy. It intercepts operations like property access (get) and property setting (set), and adds support for deep change tracking and observer-like behavior."
     "js/ng.ServiceProvider" "An object that defines how a service is constructed. It must define a `$get` property that provides the instance of the service, either as a plain factory function or as an {@link AnnotatedFactory}."
     "js/ng.SseConfig" "SSE-specific configuration"
     "js/ng.SseConnection" "Managed SSE connection object returned by $sse. Provides a safe way to close the connection and stop reconnection attempts."
     "js/ng.SseProtocolEventDetail" "Public AngularTS SseProtocolEventDetail contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SseProtocolMessage" "Public AngularTS SseProtocolMessage contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SseProvider" "Public AngularTS SseProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SseService" "$sse service type Returns a managed SSE connection that automatically reconnects when needed."
     "js/ng.StateDeclaration" "The StateDeclaration object is used to define a state or nested state. #### Example: ```js // StateDeclaration object var foldersState = { name: 'folders', url: '/folders', component: FoldersComponent, resolve: { allfolders: function(FolderService) { return FolderService.list(); } }, } registry.register(foldersState); ```"
     "js/ng.StateProvider" "Provides services related to ng-router states. This API is located at `$state`."
     "js/ng.StateRegistryProvider" "A registry for all of the application's [[StateDeclaration]]s This API is found at `$stateRegistry`."
     "js/ng.StateRegistryService" "A registry for all of the application's [[StateDeclaration]]s This API is found at `$stateRegistry`."
     "js/ng.StateResolveArray" "Array-style state resolves. Use this when you need explicit resolve metadata such as `token`, `deps`, `eager`, or pre-resolved `data`. Example: ```js resolve: [ { token: \"user\", deps: [\"UserService\", Transition], resolveFn: (UserService, trans) => UserService.fetchUser(trans.params().userId), eager: true, }, ] ```"
     "js/ng.StateResolveObject" "Object-style state resolves. Use this when resolve tokens are string keys and each value is a normal AngularTS injectable function or annotated factory. Example: ```js resolve: { user: [\"UserService\", (UserService) => UserService.current()], featureFlags: () => fetchFlags(), } ```"
     "js/ng.StateService" "Provides services related to ng-router states. This API is located at `$state`."
     "js/ng.StorageBackend" "Public AngularTS StorageBackend contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.StorageType" "Built-in persistent storage backends understood by `NgModule.store()`."
     "js/ng.StreamProvider" "Public AngularTS StreamProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.StreamService" "Public AngularTS StreamService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SwapModeType" "Public AngularTS SwapModeType contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.TemplateCacheProvider" "Provides an instance of a cache that can be used to store and retrieve template content."
     "js/ng.TemplateCacheService" "Public AngularTS TemplateCacheService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.TemplateFactoryProvider" "Resolves route templates and components from state view declarations."
     "js/ng.TemplateFactoryService" "Resolves route templates and components from state view declarations."
     "js/ng.TemplateRequestProvider" "Provider for the `$templateRequest` service. Fetches templates via HTTP and caches them in `$templateCache`. Templates are assumed trusted. This provider allows configuring per-request `$http` options such as headers, timeout, or transform functions via `httpOptions`. Option A: - Provide a sensible default for template fetching (e.g. `Accept: text/html`) - Keep `httpOptions` overridable during config phase"
     "js/ng.TemplateRequestService" "Downloads a template using $http and, upon success, stores the contents inside of $templateCache. If the HTTP request fails or the response data of the HTTP request is empty then a $compile error will be thrown (unless {ignoreRequestError} is set to true)."
     "js/ng.TranscludeFn" "A function passed to directive link functions for transcluded content. It behaves like a linking function, with the `scope` argument automatically created as a new child of the transcluded parent scope. The function returns the DOM content to be injected (transcluded) into the directive."
     "js/ng.Transition" "Represents a transition between two states. When navigating to a state, we are transitioning **from** the current state **to** the new state. This object contains all contextual information about the to/from states, parameters, resolves. It has information about all states being entered and exited as a result of the transition."
     "js/ng.TransitionProvider" "Central registry and factory for transition events, hooks, and transition instances."
     "js/ng.TransitionService" "This interface specifies the api for registering Transition Hooks. Both the [[TransitionService]] and also the [[Transition]] object itself implement this interface. Note: the Transition object only allows hooks to be registered before the Transition is started."
     "js/ng.TransitionsProvider" "Central registry and factory for transition events, hooks, and transition instances."
     "js/ng.TransitionsService" "This interface specifies the api for registering Transition Hooks. Both the [[TransitionService]] and also the [[Transition]] object itself implement this interface. Note: the Transition object only allows hooks to be registered before the Transition is started."
     "js/ng.Validator" "Public AngularTS Validator contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ViewProvider" "Tracks active `ng-view` instances and matches them with registered view configs produced during state transitions."
     "js/ng.ViewService" "Tracks active `ng-view` instances and matches them with registered view configs produced during state transitions."
     "js/ng.WasmAbiExports" "WebAssembly exports required by the language-neutral AngularTS ABI."
     "js/ng.WasmInstantiationResult" "Public AngularTS WasmInstantiationResult contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WasmOptions" "Options for loading a WebAssembly module through `$wasm`."
     "js/ng.WasmProvider" "Public AngularTS WasmProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WasmScope" "Host-side wrapper around one AngularTS scope exposed to Wasm clients. The wrapper mutates the real AngularTS scope. It does not use event bus, scope-sync, DOM hydration, or object merging."
     "js/ng.WasmScopeAbi" "Language-neutral AngularTS scope ABI for raw Wasm clients. The ABI exchanges strings and JSON-compatible values through guest linear memory. Guest modules provide `ng_abi_alloc` and `ng_abi_free`; AngularTS uses those exports whenever it needs to place callback or return payloads in guest memory."
     "js/ng.WasmScopeAbiImportObject" "Full import object returned by `WasmScopeAbi.imports`."
     "js/ng.WasmScopeAbiImports" "Imports exposed to a language-neutral Wasm client."
     "js/ng.WasmScopeBindingOptions" "Options for binding an AngularTS scope to Wasm lifecycle callbacks."
     "js/ng.WasmScopeOptions" "Options for creating an AngularTS scope wrapper for Wasm clients."
     "js/ng.WasmScopeReference" "Logical scope reference used by host-side helpers."
     "js/ng.WasmScopeUpdate" "Scope update delivered from AngularTS to a Wasm client callback."
     "js/ng.WasmScopeWatchOptions" "Options for registering one scope watch."
     "js/ng.WasmService" "Callable `$wasm` service plus helpers for the scope ABI."
     "js/ng.WebComponentContext" "Public AngularTS WebComponentContext contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentInput" "Public AngularTS WebComponentInput contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentInputConfig" "Public AngularTS WebComponentInputConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentInputs" "Public AngularTS WebComponentInputs contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentProvider" "Provider for scoped custom element integration."
     "js/ng.WebComponentService" "Public AngularTS WebComponentService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebSocketConfig" "WebSocket-specific configuration"
     "js/ng.WebSocketConnection" "Managed WebSocket connection returned by $websocket."
     "js/ng.WebSocketProvider" "WebSocketProvider Provides a pre-configured WebSocket connection as an injectable."
     "js/ng.WebSocketService" "Public AngularTS WebSocketService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportBufferInput" "Public AngularTS WebTransportBufferInput contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportCertificateHash" "Public AngularTS WebTransportCertificateHash contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportConfig" "Options passed to `$webTransport`."
     "js/ng.WebTransportConnection" "Managed WebTransport connection returned by `$webTransport`. The connection wraps the browser-native `WebTransport` object and keeps its promise/stream model visible while adding small conveniences for sending bytes, text, datagrams, and unidirectional streams."
     "js/ng.WebTransportDatagramEvent" "Public AngularTS WebTransportDatagramEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportOptions" "Public AngularTS WebTransportOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportProvider" "Provider for the `$webTransport` service."
     "js/ng.WebTransportReconnectEvent" "Event passed to WebTransport reconnect and renegotiation hooks."
     "js/ng.WebTransportRetryDelay" "Delay, in milliseconds, before a reconnect attempt is opened."
     "js/ng.WebTransportService" "Factory function exposed as `$webTransport`."
     "js/ng.WindowService" "The **`Window`** interface represents a window containing a DOM document; the `document` property points to the DOM document loaded in that window. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window)"
     "js/ng.WorkerConfig" "Public AngularTS WorkerConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerConnection" "Public AngularTS WorkerConnection contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerProvider" "Public AngularTS WorkerProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerService" "Public AngularTS WorkerService contract exposed through the global ng namespace for Closure-annotated applications."}))

(def strict-wrapper-names
  "Extern methods with fully concrete ClojureScript wrapper signatures."
  #{"angular-call"
    "angular-dispatch-event"
    "angular-emit"
    "angular-error-handling-config"
    "angular-get-controller"
    "angular-get-injector"
    "angular-get-scope"
    "angular-get-scope-by-name"
    "angular-injector"
    "angular-module"
    "angular-provider-dollarget"
    "angular-register-ng-module"
    "angular-service-call"
    "angular-service-dispatch-event"
    "angular-service-emit"
    "angular-service-error-handling-config"
    "angular-service-get-controller"
    "angular-service-get-injector"
    "angular-service-get-scope"
    "angular-service-get-scope-by-name"
    "angular-service-injector"
    "angular-service-module"
    "angular-service-provider-dollarget"
    "angular-service-register-ng-module"
    "animate-service-add-class"
    "animate-service-animate"
    "animate-service-cancel"
    "animate-service-define"
    "animate-service-enter"
    "animate-service-leave"
    "animate-service-move"
    "animate-service-remove-class"
    "animate-service-set-class"
    "animation-handle-cancel"
    "animation-handle-complete"
    "animation-handle-finish"
    "animation-handle-pause"
    "animation-handle-play"
    "aria-provider-config"
    "compile-lifecycle-provider-dollarget"
    "compile-lifecycle-service-dollarget"
    "compile-provider-add-property-security-context"
    "controller-provider-has"
    "cookie-provider-dollarget"
    "cookie-service-get"
    "cookie-service-get-all"
    "cookie-service-put"
    "cookie-service-remove"
    "event-bus-provider-dollarget"
    "event-bus-service-dispose"
    "event-bus-service-get-count"
    "event-bus-service-is-disposed"
    "event-bus-service-publish"
    "event-bus-service-reset"
    "http-response-headers"
    "http-service-call"
    "http-service-delete"
    "http-service-get"
    "http-service-head"
    "injector-service-has"
    "injector-service-load-new-modules"
    "interpolate-service-call"
    "interpolate-service-end-symbol"
    "interpolate-service-start-symbol"
    "location-provider-cache-state"
    "location-provider-get-browser-url"
    "location-service-get-hash"
    "location-service-get-path"
    "location-service-get-search"
    "location-service-get-url"
    "location-service-hash"
    "location-service-parse"
    "location-service-parse-link-url"
    "location-service-path"
    "location-service-search"
    "location-service-set-url"
    "location-service-url"
    "log-provider-dollarget"
    "log-service-debug"
    "log-service-error"
    "log-service-info"
    "log-service-log"
    "log-service-warn"
    "machine-can"
    "machine-matches"
    "machine-provider-dollarget"
    "ng-model-controller-dollarcommit-view-value"
    "ng-model-controller-dollaroverride-model-options"
    "ng-model-controller-dollarprocess-model-value"
    "ng-model-controller-dollarrender"
    "ng-model-controller-dollarrollback-view-value"
    "ng-model-controller-dollarset-custom-validity"
    "ng-model-controller-dollarset-dirty"
    "ng-model-controller-dollarset-native-validity"
    "ng-model-controller-dollarset-pristine"
    "ng-model-controller-dollarset-touched"
    "ng-model-controller-dollarset-untouched"
    "ng-model-controller-dollarset-validity"
    "ng-model-controller-dollarvalidate"
    "ng-module-animation"
    "ng-module-app-component"
    "ng-module-component"
    "ng-module-config"
    "ng-module-controller"
    "ng-module-decorator"
    "ng-module-directive"
    "ng-module-factory"
    "ng-module-machine"
    "ng-module-provider"
    "ng-module-run"
    "ng-module-service"
    "ng-module-sse"
    "ng-module-state"
    "ng-module-wasm"
    "ng-module-web-component"
    "ng-module-web-transport"
    "ng-module-websocket"
    "provide-service-decorator"
    "provide-service-directive"
    "provide-service-factory"
    "provide-service-service"
    "pub-sub-provider-dollarget"
    "pub-sub-service-dispose"
    "pub-sub-service-get-count"
    "pub-sub-service-is-disposed"
    "pub-sub-service-publish"
    "pub-sub-service-reset"
    "rest-backend-request"
    "rest-cache-store-delete"
    "rest-cache-store-delete-prefix"
    "rest-cache-store-get"
    "rest-cache-store-set"
    "rest-service-build-url"
    "rest-service-list"
    "root-scope-service-dollarbroadcast"
    "root-scope-service-dollardestroy"
    "root-scope-service-dollaremit"
    "root-scope-service-dollarmerge"
    "root-scope-service-dollarnew"
    "root-scope-service-dollarnew-isolate"
    "root-scope-service-dollarsearch-by-name"
    "root-scope-service-dollartranscluded"
    "sce-delegate-provider-banned-resource-url-list"
    "sce-delegate-provider-trusted-resource-url-list"
    "sce-provider-enabled"
    "sce-service-is-enabled"
    "sce-service-parse"
    "sce-service-parse-as-html"
    "sce-service-parse-as-media-url"
    "sce-service-parse-as-resource-url"
    "sce-service-parse-as-url"
    "scope-dollarbroadcast"
    "scope-dollardestroy"
    "scope-dollaremit"
    "scope-dollarmerge"
    "scope-dollarnew"
    "scope-dollarnew-isolate"
    "scope-dollarsearch-by-name"
    "scope-dollartranscluded"
    "scope-element-attribute-changed-callback"
    "scope-element-connected-callback"
    "scope-element-disconnected-callback"
    "scope-event-prevent-default"
    "scope-service-dollarbroadcast"
    "scope-service-dollardestroy"
    "scope-service-dollaremit"
    "scope-service-dollarnew"
    "scope-service-dollarnew-isolate"
    "scope-service-dollarsearch-by-name"
    "scope-service-dollartranscluded"
    "sse-connection-close"
    "sse-connection-connect"
    "state-provider-get-current-path"
    "state-provider-state"
    "state-registry-provider-get-all"
    "state-registry-provider-register-root"
    "state-registry-provider-root"
    "state-registry-service-get-all"
    "state-registry-service-register-root"
    "state-registry-service-root"
    "state-service-get-current-path"
    "state-service-state"
    "storage-backend-get"
    "storage-backend-remove"
    "storage-backend-set"
    "stream-provider-dollarget"
    "stream-service-consume-json-lines"
    "stream-service-consume-text"
    "stream-service-read-json-lines"
    "stream-service-read-lines"
    "stream-service-read-text"
    "template-cache-provider-dollarget"
    "transition-abort"
    "transition-apply-view-configs"
    "transition-dollarfrom"
    "transition-dollarto"
    "transition-dynamic"
    "transition-entering"
    "transition-error"
    "transition-exiting"
    "transition-from"
    "transition-is-active"
    "transition-params"
    "transition-provider-create"
    "transition-provider-dollarget"
    "transition-redirect"
    "transition-run"
    "transition-to"
    "transition-to-string"
    "transition-valid"
    "transitions-provider-create"
    "transitions-provider-dollarget"
    "wasm-abi-exports-ng-abi-alloc"
    "wasm-abi-exports-ng-abi-free"
    "wasm-provider-dollarget"
    "wasm-scope-abi-attach"
    "wasm-scope-abi-create-scope"
    "wasm-scope-abi-free-buffer"
    "wasm-scope-abi-imports-buffer-free"
    "wasm-scope-abi-imports-buffer-len"
    "wasm-scope-abi-imports-buffer-ptr"
    "wasm-scope-abi-imports-scope-delete"
    "wasm-scope-abi-imports-scope-delete-named"
    "wasm-scope-abi-imports-scope-get"
    "wasm-scope-abi-imports-scope-get-named"
    "wasm-scope-abi-imports-scope-resolve"
    "wasm-scope-abi-imports-scope-set"
    "wasm-scope-abi-imports-scope-set-named"
    "wasm-scope-abi-imports-scope-sync"
    "wasm-scope-abi-imports-scope-sync-named"
    "wasm-scope-abi-imports-scope-unbind"
    "wasm-scope-abi-imports-scope-unbind-named"
    "wasm-scope-abi-imports-scope-unwatch"
    "wasm-scope-abi-imports-scope-watch"
    "wasm-scope-abi-imports-scope-watch-named"
    "wasm-scope-abi-notify-bind"
    "wasm-scope-abi-notify-unbind"
    "wasm-scope-abi-notify-update"
    "wasm-scope-abi-unregister-scope"
    "wasm-scope-delete"
    "wasm-scope-dispose"
    "wasm-scope-is-disposed"
    "wasm-scope-sync"
    "wasm-service-call"
    "wasm-service-create-scope-abi"
    "wasm-service-scope"
    "web-socket-connection-close"
    "web-socket-connection-connect"
    "web-transport-connection-close"
    "web-transport-connection-create-bidirectional-stream"
    "web-transport-connection-send-text"
    "worker-connection-restart"
    "worker-connection-terminate"})

(def strict-property-reader-names
  "Extern properties with fully concrete ClojureScript reader signatures."
  #{"anchor-scroll-provider-auto-scrolling-enabled"
    "anchor-scroll-provider-dollarget"
    "angular-dollarevent-bus"
    "angular-dollarinjector"
    "angular-dollarroot-scope"
    "angular-dollart"
    "angular-element-definition-angular"
    "angular-element-definition-element-module"
    "angular-element-definition-injector"
    "angular-element-definition-name"
    "angular-element-definition-ng-module"
    "angular-element-module-options-name"
    "angular-element-module-options-requires"
    "angular-element-options-component"
    "angular-element-options-element-module"
    "angular-element-options-ng-module"
    "angular-element-options-register-builtins"
    "angular-element-options-subapp"
    "angular-service-dollarevent-bus"
    "angular-service-dollarinjector"
    "angular-service-dollarroot-scope"
    "angular-service-dollart"
    "angular-service-subapps"
    "angular-service-version"
    "angular-subapps"
    "angular-version"
    "animate-provider-dollarget"
    "animation-context-add-class"
    "animation-context-class-name"
    "animation-context-from"
    "animation-context-phase"
    "animation-context-remove-class"
    "animation-context-signal"
    "animation-context-to"
    "animation-handle-controller"
    "animation-handle-finished"
    "animation-options-add-class"
    "animation-options-animation"
    "animation-options-from"
    "animation-options-remove-class"
    "animation-options-to"
    "app-component-options-inputs"
    "app-component-options-isolate"
    "app-component-options-template"
    "cached-rest-backend-options-cache"
    "cached-rest-backend-options-network"
    "cached-rest-backend-options-strategy"
    "component-bindings"
    "component-controller-as"
    "component-replace"
    "component-require"
    "connection-config-event-types"
    "connection-config-heartbeat-timeout"
    "connection-config-max-retries"
    "connection-config-retry-delay"
    "connection-event-type"
    "controller-name"
    "controller-provider-dollarget"
    "cookie-options-domain"
    "cookie-options-path"
    "cookie-options-samesite"
    "cookie-options-secure"
    "cookie-provider-defaults"
    "cookie-store-options-cookie"
    "directive-controller-as"
    "directive-count"
    "directive-name"
    "directive-priority"
    "directive-replace"
    "directive-restrict"
    "directive-template-namespace"
    "directive-terminal"
    "element-scope-options-isolate"
    "element-scope-options-parent-scope"
    "error-handling-config-object-max-depth"
    "event-bus-provider-event-bus"
    "filter-provider-dollarget"
    "http-provider-defaults"
    "http-provider-defaults-headers"
    "http-provider-defaults-with-credentials"
    "http-provider-defaults-xsrf-cookie-name"
    "http-provider-defaults-xsrf-header-name"
    "http-provider-interceptors"
    "http-provider-xsrf-trusted-origins"
    "http-response-config"
    "http-response-status"
    "http-response-status-text"
    "http-response-xhr-status"
    "http-service-defaults"
    "http-service-pending-requests"
    "injection-tokens-dollaranchor-scroll"
    "injection-tokens-dollaranchor-scroll-provider"
    "injection-tokens-dollarangular"
    "injection-tokens-dollarangular-provider"
    "injection-tokens-dollaranimate"
    "injection-tokens-dollaranimate-provider"
    "injection-tokens-dollararia"
    "injection-tokens-dollararia-provider"
    "injection-tokens-dollarcompile"
    "injection-tokens-dollarcompile-lifecycle"
    "injection-tokens-dollarcompile-provider"
    "injection-tokens-dollarcontroller"
    "injection-tokens-dollarcontroller-provider"
    "injection-tokens-dollarcookie"
    "injection-tokens-dollarcookie-provider"
    "injection-tokens-dollardocument"
    "injection-tokens-dollarelement"
    "injection-tokens-dollarevent-bus"
    "injection-tokens-dollarevent-bus-provider"
    "injection-tokens-dollarexception-handler"
    "injection-tokens-dollarexception-handler-provider"
    "injection-tokens-dollarfilter"
    "injection-tokens-dollarfilter-provider"
    "injection-tokens-dollarhttp"
    "injection-tokens-dollarhttp-param-serializer"
    "injection-tokens-dollarhttp-param-serializer-provider"
    "injection-tokens-dollarhttp-provider"
    "injection-tokens-dollarinjector"
    "injection-tokens-dollarinterpolate"
    "injection-tokens-dollarinterpolate-provider"
    "injection-tokens-dollarlocation"
    "injection-tokens-dollarlocation-provider"
    "injection-tokens-dollarlog"
    "injection-tokens-dollarlog-provider"
    "injection-tokens-dollarmachine"
    "injection-tokens-dollarmachine-provider"
    "injection-tokens-dollarparse"
    "injection-tokens-dollarparse-provider"
    "injection-tokens-dollarprovide"
    "injection-tokens-dollarrest"
    "injection-tokens-dollarrest-provider"
    "injection-tokens-dollarroot-element"
    "injection-tokens-dollarroot-scope"
    "injection-tokens-dollarroot-scope-provider"
    "injection-tokens-dollarsce"
    "injection-tokens-dollarsce-delegate"
    "injection-tokens-dollarsce-delegate-provider"
    "injection-tokens-dollarsce-provider"
    "injection-tokens-dollarscope"
    "injection-tokens-dollarsse"
    "injection-tokens-dollarsse-provider"
    "injection-tokens-dollarstate"
    "injection-tokens-dollarstate-provider"
    "injection-tokens-dollarstate-registry"
    "injection-tokens-dollarstate-registry-provider"
    "injection-tokens-dollarstream"
    "injection-tokens-dollarstream-provider"
    "injection-tokens-dollartemplate-cache"
    "injection-tokens-dollartemplate-cache-provider"
    "injection-tokens-dollartemplate-factory"
    "injection-tokens-dollartemplate-factory-provider"
    "injection-tokens-dollartemplate-request"
    "injection-tokens-dollartemplate-request-provider"
    "injection-tokens-dollartransitions"
    "injection-tokens-dollartransitions-provider"
    "injection-tokens-dollarview"
    "injection-tokens-dollarview-provider"
    "injection-tokens-dollarwasm"
    "injection-tokens-dollarwasm-provider"
    "injection-tokens-dollarweb-component"
    "injection-tokens-dollarweb-component-provider"
    "injection-tokens-dollarweb-transport"
    "injection-tokens-dollarweb-transport-provider"
    "injection-tokens-dollarwebsocket"
    "injection-tokens-dollarwebsocket-provider"
    "injection-tokens-dollarwindow"
    "injection-tokens-dollarworker"
    "injection-tokens-dollarworker-provider"
    "injector-service-strict-di"
    "interpolate-provider-dollarget"
    "interpolate-provider-end-symbol"
    "interpolate-provider-start-symbol"
    "interpolation-function-exp"
    "interpolation-function-expressions"
    "invocation-detail-expr"
    "invocation-detail-reply"
    "location-provider-dollarget"
    "location-provider-hash-prefix-conf"
    "location-provider-html5-mode-conf"
    "location-service-abs-url"
    "location-service-app-base"
    "location-service-app-base-no-file"
    "location-service-base-prefix"
    "location-service-hash-prefix"
    "location-service-html5"
    "log-provider-debug"
    "machine-config-initial"
    "machine-config-transitions"
    "machine-current"
    "native-animation-options-add-class"
    "native-animation-options-animation"
    "native-animation-options-from"
    "native-animation-options-remove-class"
    "native-animation-options-to"
    "ng-model-controller-dollarasync-validators"
    "ng-model-controller-dollardirty"
    "ng-model-controller-dollarerror"
    "ng-model-controller-dollarformatters"
    "ng-model-controller-dollarinvalid"
    "ng-model-controller-dollaroptions"
    "ng-model-controller-dollarparsers"
    "ng-model-controller-dollarpending"
    "ng-model-controller-dollarpristine"
    "ng-model-controller-dollartarget"
    "ng-model-controller-dollartouched"
    "ng-model-controller-dollaruntouched"
    "ng-model-controller-dollarvalid"
    "ng-model-controller-dollarvalidation-message"
    "ng-model-controller-dollarvalidators"
    "ng-model-controller-dollarvalidity"
    "ng-model-controller-dollarview-change-listeners"
    "ng-module-name"
    "parse-provider-dollarget"
    "pub-sub-provider-event-bus"
    "realtime-protocol-event-detail-url"
    "realtime-protocol-message-swap"
    "realtime-protocol-message-target"
    "request-config-event-handlers"
    "request-config-headers"
    "request-config-method"
    "request-config-params"
    "request-config-response-type"
    "request-config-upload-event-handlers"
    "request-config-url"
    "request-config-with-credentials"
    "request-config-xsrf-cookie-name"
    "request-config-xsrf-header-name"
    "request-shortcut-config-headers"
    "request-shortcut-config-params"
    "request-shortcut-config-response-type"
    "request-shortcut-config-with-credentials"
    "request-shortcut-config-xsrf-cookie-name"
    "request-shortcut-config-xsrf-header-name"
    "rest-definition-name"
    "rest-definition-options"
    "rest-definition-url"
    "rest-options-backend"
    "rest-provider-dollarget"
    "rest-request-collection-url"
    "rest-request-method"
    "rest-request-options"
    "rest-request-params"
    "rest-request-url"
    "rest-response-config"
    "rest-response-source"
    "rest-response-stale"
    "rest-response-status"
    "rest-response-status-text"
    "rest-response-xhr-status"
    "rest-revalidate-event-key"
    "rest-revalidate-event-request"
    "rest-revalidate-event-response"
    "root-scope-provider-dollarget"
    "root-scope-service-dollarid"
    "root-scope-service-dollarparent"
    "root-scope-service-dollarproxy"
    "root-scope-service-dollarroot"
    "root-scope-service-dollarscopename"
    "root-scope-service-dollartarget"
    "router-provider-dollarget"
    "sce-delegate-provider-dollarget"
    "scope-dollarid"
    "scope-dollarparent"
    "scope-dollarproxy"
    "scope-dollarroot"
    "scope-dollarscopename"
    "scope-dollartarget"
    "scope-element-constructor-inputs"
    "scope-element-constructor-isolate"
    "scope-element-constructor-template"
    "scope-element-injector"
    "scope-element-scope"
    "scope-event-default-prevented"
    "scope-event-name"
    "scope-event-stopped"
    "scope-service-dollarid"
    "scope-service-dollarparent"
    "scope-service-dollarproxy"
    "scope-service-dollarroot"
    "scope-service-dollarscopename"
    "scope-service-dollartarget"
    "service-provider-dollarget"
    "sse-config-event-types"
    "sse-config-headers"
    "sse-config-heartbeat-timeout"
    "sse-config-max-retries"
    "sse-config-params"
    "sse-config-retry-delay"
    "sse-config-with-credentials"
    "sse-protocol-event-detail-source"
    "sse-protocol-event-detail-url"
    "sse-protocol-message-swap"
    "sse-protocol-message-target"
    "sse-provider-defaults"
    "sse-provider-dollarget"
    "state-declaration-abstract"
    "state-declaration-bindings"
    "state-declaration-dynamic"
    "state-declaration-name"
    "state-declaration-params"
    "state-declaration-url"
    "state-declaration-views"
    "state-provider-current"
    "state-provider-dollarcurrent"
    "state-provider-dollarget"
    "state-provider-params"
    "state-registry-provider-dollarget"
    "state-registry-service-dollarget"
    "state-service-current"
    "state-service-dollarcurrent"
    "state-service-dollarget"
    "state-service-params"
    "template-cache-provider-cache"
    "template-factory-provider-dollarget"
    "template-factory-service-dollarget"
    "template-request-provider-dollarget"
    "template-request-provider-http-options"
    "transition-dollarid"
    "transition-promise"
    "transition-success"
    "view-provider-dollarget"
    "view-service-dollarget"
    "wasm-abi-exports-memory"
    "wasm-instantiation-result-exports"
    "wasm-instantiation-result-instance"
    "wasm-instantiation-result-module"
    "wasm-options-raw"
    "wasm-scope-abi"
    "wasm-scope-abi-import-object-angular-ts"
    "wasm-scope-abi-imports"
    "wasm-scope-binding-options-initial"
    "wasm-scope-binding-options-name"
    "wasm-scope-binding-options-watch"
    "wasm-scope-handle"
    "wasm-scope-name"
    "wasm-scope-options-name"
    "wasm-scope-scope"
    "wasm-scope-update-path"
    "wasm-scope-update-scope-handle"
    "wasm-scope-update-scope-name"
    "wasm-scope-watch-options-initial"
    "web-component-context-host"
    "web-component-context-injector"
    "web-component-context-scope"
    "web-component-context-shadow-root"
    "web-component-input-config-attribute"
    "web-component-input-config-reflect"
    "web-component-provider-defaults"
    "web-component-provider-dollarget"
    "web-socket-config-event-types"
    "web-socket-config-heartbeat-timeout"
    "web-socket-config-max-retries"
    "web-socket-config-protocols"
    "web-socket-config-retry-delay"
    "web-socket-provider-defaults"
    "web-socket-provider-dollarget"
    "web-transport-certificate-hash-algorithm"
    "web-transport-certificate-hash-value"
    "web-transport-config-allow-pooling"
    "web-transport-config-congestion-control"
    "web-transport-config-max-retries"
    "web-transport-config-reconnect"
    "web-transport-config-require-unreliable"
    "web-transport-config-server-certificate-hashes"
    "web-transport-connection-closed"
    "web-transport-connection-ready"
    "web-transport-connection-transport"
    "web-transport-datagram-event-data"
    "web-transport-options-allow-pooling"
    "web-transport-options-congestion-control"
    "web-transport-options-require-unreliable"
    "web-transport-options-server-certificate-hashes"
    "web-transport-provider-defaults"
    "web-transport-provider-dollarget"
    "web-transport-reconnect-event-attempt"
    "web-transport-reconnect-event-connection"
    "web-transport-reconnect-event-url"
    "worker-config-auto-restart"
    "worker-config-auto-terminate"
    "worker-config-logger"
    "worker-connection-config"
    "worker-provider-dollarget"})

(def angular
  "AngularTS global runtime, typed from the generated Closure externs."
  ^js/ng.Angular js/angular)

(defn injectable
  "Create an AngularTS array-annotated injectable."
  ^js/ng.Injectable [^js/Array deps factory]
  (let [annotated (.slice deps)]
    (.push annotated factory)
    annotated))

(defn angular-call
  "Await result. Accepts a single string: `\"<target>.<expression>\"`\n\nParams:\n- input: {string}\n\nReturns: {!Promise<?>}"
  ^js/Promise [^js/ng.Angular target ^string input]
  (.call target input))

(defn angular-dispatch-event
  "Dispatches an invocation event to either an injectable service or a named scope. The event `type` identifies the target and the payload contains the expression to evaluate against that target.\n\nParams:\n- event: {!Event}\n\nReturns: {boolean}"
  ^boolean [^js/ng.Angular target ^js/Event event]
  (.dispatchEvent target event))

(defn angular-emit
  "Fire-and-forget. Accepts a single string: `\"<target>.<expression>\"`\n\nParams:\n- input: {string}\n\nReturns: {void}"
  [^js/ng.Angular target ^string input]
  (.emit target input))

(defn angular-error-handling-config
  "Global framework error-handling configuration.\n\nParams:\n- config: {(!ng.ErrorHandlingConfig|undefined)}\n\nReturns: {!ng.ErrorHandlingConfig}"
  ^js/ng.ErrorHandlingConfig [^js/ng.Angular target ^js/ng.ErrorHandlingConfig config]
  (.errorHandlingConfig target config))

(defn angular-get-controller
  "Retrieve the controller instance cached on a compiled DOM element.\n\nParams:\n- element: {!Element}\n- name: {(string|undefined)}\n\nReturns: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.Angular target ^js/Element element ^string name]
  (.getController target element name))

(defn angular-get-injector
  "Retrieve the injector cached on a bootstrapped DOM element.\n\nParams:\n- element: {!Element}\n\nReturns: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.Angular target ^js/Element element]
  (.getInjector target element))

(defn angular-get-scope
  "Retrieve the scope cached on a compiled DOM element.\n\nParams:\n- element: {!Element}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Angular target ^js/Element element]
  (.getScope target element))

(defn angular-get-scope-by-name
  "Find a scope by its registered `$scopename`.\n\nParams:\n- name: {string}\n\nReturns: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.Angular target ^string name]
  (.getScopeByName target name))

(defn angular-injector
  "Create a standalone injector without bootstrapping the DOM.\n\nParams:\n- modules: {!Array<(string|!ng.Injectable)>}\n- strictDi: {(boolean|undefined)}\n\nReturns: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.Angular target ^js/Array modules ^boolean strictDi]
  (.injector target modules strictDi))

(defn angular-module
  "The `angular.module` is a global place for creating, registering and retrieving AngularTS modules. All modules (AngularTS core or 3rd party) that should be available to an application must be registered using this mechanism. Passing one argument retrieves an existing ng.NgModule, whereas passing more than one argument creates a new ng.NgModule # Module A module is a collection of services, directives, controllers, filters, workers, WebAssembly modules, and configuration information. `angular.module` is used to configure the auto.$injector `$injector`. ```js // Create a new module let myModule = angular.module('myModule', []); // register a new service myModule.value('appName', 'MyCoolApp'); // configure existing services inside initialization blocks. myModule.config(['$locationProvider', function($locationProvider) { // Configure existing providers $locationProvider.hashPrefix('!'); }]); ``` Then you can create an injector and load your modules like this: ```js let injector = angular.injector(['ng', 'myModule']) ``` However it's more likely that you'll use the `ng-app` directive or `bootstrap()` to simplify this process.\n\nParams:\n- name: {string}\n- requires: {(!Array<string>|undefined)}\n- configFn: {(!ng.Injectable|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.Angular target ^string name ^js/Array requires ^js/ng.Injectable configFn]
  (.module target name requires configFn))

(defn angular-provider-dollarget
  "Public AngularProvider.$get member exposed by the AngularTS namespace contract.\n\nParams:\n- var_args: {...?}\n\nReturns: {!ng.Angular}"
  (^js/ng.Angular [^js/ng.AngularProvider target]
   (.$get target))
  (^js/ng.Angular [^js/ng.AngularProvider target value]
   (.$get target value))
  (^js/ng.Angular [^js/ng.AngularProvider target value extra]
   (.$get target value extra))
  (^js/ng.Angular [^js/ng.AngularProvider target value extra more]
   (.$get target value extra more)))

(defn angular-register-ng-module
  "Registers the configured built-in `ng` module for this runtime instance.\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.Angular target]
  (.registerNgModule target))

(defn angular-service-call
  "Await result. Accepts a single string: `\"<target>.<expression>\"`\n\nParams:\n- input: {string}\n\nReturns: {!Promise<?>}"
  ^js/Promise [^js/ng.AngularService target ^string input]
  (.call target input))

(defn angular-service-dispatch-event
  "Dispatches an invocation event to either an injectable service or a named scope. The event `type` identifies the target and the payload contains the expression to evaluate against that target.\n\nParams:\n- event: {!Event}\n\nReturns: {boolean}"
  ^boolean [^js/ng.AngularService target ^js/Event event]
  (.dispatchEvent target event))

(defn angular-service-emit
  "Fire-and-forget. Accepts a single string: `\"<target>.<expression>\"`\n\nParams:\n- input: {string}\n\nReturns: {void}"
  [^js/ng.AngularService target ^string input]
  (.emit target input))

(defn angular-service-error-handling-config
  "Global framework error-handling configuration.\n\nParams:\n- config: {(!ng.ErrorHandlingConfig|undefined)}\n\nReturns: {!ng.ErrorHandlingConfig}"
  ^js/ng.ErrorHandlingConfig [^js/ng.AngularService target ^js/ng.ErrorHandlingConfig config]
  (.errorHandlingConfig target config))

(defn angular-service-get-controller
  "Retrieve the controller instance cached on a compiled DOM element.\n\nParams:\n- element: {!Element}\n- name: {(string|undefined)}\n\nReturns: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.AngularService target ^js/Element element ^string name]
  (.getController target element name))

(defn angular-service-get-injector
  "Retrieve the injector cached on a bootstrapped DOM element.\n\nParams:\n- element: {!Element}\n\nReturns: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.AngularService target ^js/Element element]
  (.getInjector target element))

(defn angular-service-get-scope
  "Retrieve the scope cached on a compiled DOM element.\n\nParams:\n- element: {!Element}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.AngularService target ^js/Element element]
  (.getScope target element))

(defn angular-service-get-scope-by-name
  "Find a scope by its registered `$scopename`.\n\nParams:\n- name: {string}\n\nReturns: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.AngularService target ^string name]
  (.getScopeByName target name))

(defn angular-service-injector
  "Create a standalone injector without bootstrapping the DOM.\n\nParams:\n- modules: {!Array<(string|!ng.Injectable)>}\n- strictDi: {(boolean|undefined)}\n\nReturns: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.AngularService target ^js/Array modules ^boolean strictDi]
  (.injector target modules strictDi))

(defn angular-service-module
  "The `angular.module` is a global place for creating, registering and retrieving AngularTS modules. All modules (AngularTS core or 3rd party) that should be available to an application must be registered using this mechanism. Passing one argument retrieves an existing ng.NgModule, whereas passing more than one argument creates a new ng.NgModule # Module A module is a collection of services, directives, controllers, filters, workers, WebAssembly modules, and configuration information. `angular.module` is used to configure the auto.$injector `$injector`. ```js // Create a new module let myModule = angular.module('myModule', []); // register a new service myModule.value('appName', 'MyCoolApp'); // configure existing services inside initialization blocks. myModule.config(['$locationProvider', function($locationProvider) { // Configure existing providers $locationProvider.hashPrefix('!'); }]); ``` Then you can create an injector and load your modules like this: ```js let injector = angular.injector(['ng', 'myModule']) ``` However it's more likely that you'll use the `ng-app` directive or `bootstrap()` to simplify this process.\n\nParams:\n- name: {string}\n- requires: {(!Array<string>|undefined)}\n- configFn: {(!ng.Injectable|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.AngularService target ^string name ^js/Array requires ^js/ng.Injectable configFn]
  (.module target name requires configFn))

(defn angular-service-provider-dollarget
  "Public AngularServiceProvider.$get member exposed by the AngularTS namespace contract.\n\nParams:\n- var_args: {...?}\n\nReturns: {!ng.Angular}"
  (^js/ng.Angular [^js/ng.AngularServiceProvider target]
   (.$get target))
  (^js/ng.Angular [^js/ng.AngularServiceProvider target value]
   (.$get target value))
  (^js/ng.Angular [^js/ng.AngularServiceProvider target value extra]
   (.$get target value extra))
  (^js/ng.Angular [^js/ng.AngularServiceProvider target value extra more]
   (.$get target value extra more)))

(defn angular-service-register-ng-module
  "Registers the configured built-in `ng` module for this runtime instance.\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.AngularService target]
  (.registerNgModule target))

(defn animate-service-add-class
  "Public AnimateService.addClass member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- className: {string}\n- options: {(!ng.NativeAnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^string className ^js/ng.NativeAnimationOptions options]
  (.addClass target element className options))

(defn animate-service-animate
  "Public AnimateService.animate member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- from: {!Object<string, (number|string)>}\n- to: {(!Object<string, (number|string)>|undefined)}\n- className: {(string|undefined)}\n- options: {(!ng.NativeAnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^js/Object from ^js/Object to ^string className ^js/ng.NativeAnimationOptions options]
  (.animate target element from to className options))

(defn animate-service-cancel
  "Public AnimateService.cancel member exposed by the AngularTS namespace contract.\n\nParams:\n- handle: {(!ng.AnimationHandle|undefined)}\n\nReturns: {void}"
  [^js/ng.AnimateService target ^js/ng.AnimationHandle handle]
  (.cancel target handle))

(defn animate-service-define
  "Public AnimateService.define member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- preset: {!ng.AnimationPreset}\n\nReturns: {void}"
  [^js/ng.AnimateService target ^string name ^js/ng.AnimationPreset preset]
  (.define target name preset))

(defn animate-service-enter
  "Public AnimateService.enter member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- parent: {(!Object|null|undefined)}\n- after: {(!Object|null|undefined)}\n- options: {(!ng.NativeAnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^js/Object parent ^js/Object after ^js/ng.NativeAnimationOptions options]
  (.enter target element parent after options))

(defn animate-service-leave
  "Public AnimateService.leave member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- options: {(!ng.NativeAnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^js/ng.NativeAnimationOptions options]
  (.leave target element options))

(defn animate-service-move
  "Public AnimateService.move member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- parent: {(!Object|null)}\n- after: {(!Object|null|undefined)}\n- options: {(!ng.NativeAnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^js/Object parent ^js/Object after ^js/ng.NativeAnimationOptions options]
  (.move target element parent after options))

(defn animate-service-remove-class
  "Public AnimateService.removeClass member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- className: {string}\n- options: {(!ng.NativeAnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^string className ^js/ng.NativeAnimationOptions options]
  (.removeClass target element className options))

(defn animate-service-set-class
  "Public AnimateService.setClass member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- add: {string}\n- remove: {string}\n- options: {(!ng.NativeAnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^string add ^string remove ^js/ng.NativeAnimationOptions options]
  (.setClass target element add remove options))

(defn animation-handle-cancel
  "Public AnimationHandle.cancel member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.AnimationHandle target]
  (.cancel target))

(defn animation-handle-complete
  "Public AnimationHandle.complete member exposed by the AngularTS namespace contract.\n\nParams:\n- status: {(boolean|undefined)}\n\nReturns: {void}"
  [^js/ng.AnimationHandle target ^boolean status]
  (.complete target status))

(defn animation-handle-finish
  "Public AnimationHandle.finish member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.AnimationHandle target]
  (.finish target))

(defn animation-handle-pause
  "Public AnimationHandle.pause member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.AnimationHandle target]
  (.pause target))

(defn animation-handle-play
  "Public AnimationHandle.play member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.AnimationHandle target]
  (.play target))

(defn aria-provider-config
  "Public AriaProvider.config member exposed by the AngularTS namespace contract.\n\nParams:\n- newConfig: {!Object}\n\nReturns: {void}"
  [^js/ng.AriaProvider target ^js/Object newConfig]
  (.config target newConfig))

(defn compile-lifecycle-provider-dollarget
  "Public CompileLifecycleProvider.$get member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.CompileLifecycleProvider}"
  ^js/ng.CompileLifecycleProvider [^js/ng.CompileLifecycleProvider target]
  (.$get target))

(defn compile-lifecycle-service-dollarget
  "Public CompileLifecycleService.$get member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.CompileLifecycleProvider}"
  ^js/ng.CompileLifecycleProvider [^js/ng.CompileLifecycleService target]
  (.$get target))

(defn compile-provider-add-property-security-context
  "Public CompileProvider.addPropertySecurityContext member exposed by the AngularTS namespace contract.\n\nParams:\n- elementName: {string}\n- propertyName: {string}\n- ctx: {string}\n\nReturns: {!ng.CompileProvider}"
  ^js/ng.CompileProvider [^js/ng.CompileProvider target ^string elementName ^string propertyName ^string ctx]
  (.addPropertySecurityContext target elementName propertyName ctx))

(defn controller-provider-has
  "Public ControllerProvider.has member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n\nReturns: {boolean}"
  ^boolean [^js/ng.ControllerProvider target ^string name]
  (.has target name))

(defn cookie-provider-dollarget
  "Public CookieProvider.$get member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.CookieService}"
  ^js/ng.CookieService [^js/ng.CookieProvider target]
  (.$get target))

(defn cookie-service-get
  "Retrieves a raw cookie value.\n\nParams:\n- key: {string}\n\nReturns: {(null|string)}"
  ^string [^js/ng.CookieService target ^string key]
  (.get target key))

(defn cookie-service-get-all
  "Returns an object containing all raw cookies.\n\nReturns: {!Object<string, string>}"
  ^js/Object [^js/ng.CookieService target]
  (.getAll target))

(defn cookie-service-put
  "Sets a raw cookie value.\n\nParams:\n- key: {string}\n- value: {string}\n- options: {(!ng.CookieOptions|undefined)}\n\nReturns: {void}"
  [^js/ng.CookieService target ^string key ^string value ^js/ng.CookieOptions options]
  (.put target key value options))

(defn cookie-service-remove
  "Removes a cookie by setting an expired date.\n\nParams:\n- key: {string}\n- options: {(!ng.CookieOptions|undefined)}\n\nReturns: {void}"
  [^js/ng.CookieService target ^string key ^js/ng.CookieOptions options]
  (.remove target key options))

(defn event-bus-provider-dollarget
  "Public EventBusProvider.$get member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.PubSubService}"
  ^js/ng.PubSubService [^js/ng.EventBusProvider target]
  (.$get target))

(defn event-bus-service-dispose
  "Dispose the instance, removing all topics and listeners.\n\nReturns: {void}"
  [^js/ng.EventBusService target]
  (.dispose target))

(defn event-bus-service-get-count
  "Get the number of subscribers for a topic.\n\nParams:\n- topic: {string}\n\nReturns: {number}"
  ^number [^js/ng.EventBusService target ^string topic]
  (.getCount target topic))

(defn event-bus-service-is-disposed
  "Checks if instance has been disposed.\n\nReturns: {boolean}"
  ^boolean [^js/ng.EventBusService target]
  (.isDisposed target))

(defn event-bus-service-publish
  "Publish a value to a topic asynchronously. All listeners are invoked in the order they were added. Delivery is scheduled with `queueMicrotask`.\n\nParams:\n- topic: {string}\n- var_args: {...?}\n\nReturns: {boolean}"
  (^boolean [^js/ng.EventBusService target ^string topic]
   (.publish target topic))
  (^boolean [^js/ng.EventBusService target ^string topic value]
   (.publish target topic value))
  (^boolean [^js/ng.EventBusService target ^string topic value extra]
   (.publish target topic value extra))
  (^boolean [^js/ng.EventBusService target ^string topic value extra more]
   (.publish target topic value extra more)))

(defn event-bus-service-reset
  "Reset the bus to its initial state without disposing it. All topics and listeners are removed, and the instance can be reused.\n\nReturns: {void}"
  [^js/ng.EventBusService target]
  (.reset target))

(defn http-response-headers
  "Lazy response header reader.\n\nReturns: {!Object<string, string>}"
  ^js/Object [^js/ng.HttpResponse target]
  (.headers target))

(defn http-service-call
  "Invokes the callable HttpService contract.\n\nParams:\n- config: {!ng.RequestConfig}\n\nReturns: {!Promise<!ng.HttpResponse<T>>}"
  ^js/Promise [^js/ng.HttpService target ^js/ng.RequestConfig config]
  (.call target config))

(defn http-service-delete
  "Send a `DELETE` request.\n\nParams:\n- url: {string}\n- config: {(!ng.RequestShortcutConfig|undefined)}\n\nReturns: {!Promise<!ng.HttpResponse<T>>}"
  ^js/Promise [^js/ng.HttpService target ^string url ^js/ng.RequestShortcutConfig config]
  (.delete target url config))

(defn http-service-get
  "Send a `GET` request.\n\nParams:\n- url: {string}\n- config: {(!ng.RequestShortcutConfig|undefined)}\n\nReturns: {!Promise<!ng.HttpResponse<T>>}"
  ^js/Promise [^js/ng.HttpService target ^string url ^js/ng.RequestShortcutConfig config]
  (.get target url config))

(defn http-service-head
  "Send a `HEAD` request.\n\nParams:\n- url: {string}\n- config: {(!ng.RequestShortcutConfig|undefined)}\n\nReturns: {!Promise<!ng.HttpResponse<T>>}"
  ^js/Promise [^js/ng.HttpService target ^string url ^js/ng.RequestShortcutConfig config]
  (.head target url config))

(defn injector-service-has
  "Public InjectorService.has member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n\nReturns: {boolean}"
  ^boolean [^js/ng.InjectorService target ^string name]
  (.has target name))

(defn injector-service-load-new-modules
  "Public InjectorService.loadNewModules member exposed by the AngularTS namespace contract.\n\nParams:\n- mods: {!Array<(!Array<function(...?): ?>|function(...?): ?|string)>}\n\nReturns: {void}"
  [^js/ng.InjectorService target ^js/Array mods]
  (.loadNewModules target mods))

(defn interpolate-service-call
  "Invokes the callable InterpolateService contract.\n\nParams:\n- text: {string}\n- mustHaveExpression: {(boolean|undefined)}\n- trustedContext: {(string|undefined)}\n- allOrNothing: {(boolean|undefined)}\n\nReturns: {(!ng.InterpolationFunction|undefined)}"
  ^js/ng.InterpolationFunction [^js/ng.InterpolateService target ^string text ^boolean mustHaveExpression ^string trustedContext ^boolean allOrNothing]
  (.call target text mustHaveExpression trustedContext allOrNothing))

(defn interpolate-service-end-symbol
  "Public InterpolateService.endSymbol member exposed by the AngularTS namespace contract.\n\nReturns: {string}"
  ^string [^js/ng.InterpolateService target]
  (.endSymbol target))

(defn interpolate-service-start-symbol
  "Public InterpolateService.startSymbol member exposed by the AngularTS namespace contract.\n\nReturns: {string}"
  ^string [^js/ng.InterpolateService target]
  (.startSymbol target))

(defn location-provider-cache-state
  "Caches the current state.\n\nReturns: {void}"
  [^js/ng.LocationProvider target]
  (.cacheState target))

(defn location-provider-get-browser-url
  "Returns the current browser URL with any empty hash (`#`) removed.\n\nReturns: {string}"
  ^string [^js/ng.LocationProvider target]
  (.getBrowserUrl target))

(defn location-service-get-hash
  "Returns the hash fragment when called without any parameters.\n\nReturns: {string}"
  ^string [^js/ng.LocationService target]
  (.getHash target))

(defn location-service-get-path
  "Returns the path of the current URL.\n\nReturns: {string}"
  ^string [^js/ng.LocationService target]
  (.getPath target))

(defn location-service-get-search
  "Returns the search part of the current URL as an object.\n\nReturns: {!Object<string, ?>}"
  ^js/Object [^js/ng.LocationService target]
  (.getSearch target))

(defn location-service-get-url
  "Return URL (e.g. `/path?a=b#hash`) when called without any parameter.\n\nReturns: {string}"
  ^string [^js/ng.LocationService target]
  (.getUrl target))

(defn location-service-hash
  "Public LocationService.hash member exposed by the AngularTS namespace contract.\n\nReturns: {string}"
  ^string [^js/ng.LocationService target]
  (.hash target))

(defn location-service-parse
  "Parse given HTML5 (regular) URL string into properties\n\nParams:\n- url: {string}\n\nReturns: {void}"
  [^js/ng.LocationService target ^string url]
  (.parse target url))

(defn location-service-parse-link-url
  "Attempts to parse a clicked link into an app-relative URL update.\n\nParams:\n- url: {string}\n- relHref: {(null|string)}\n\nReturns: {boolean}"
  ^boolean [^js/ng.LocationService target ^string url ^string relHref]
  (.parseLinkUrl target url relHref))

(defn location-service-path
  "Public LocationService.path member exposed by the AngularTS namespace contract.\n\nReturns: {string}"
  ^string [^js/ng.LocationService target]
  (.path target))

(defn location-service-search
  "Public LocationService.search member exposed by the AngularTS namespace contract.\n\nReturns: {!Object<string, ?>}"
  ^js/Object [^js/ng.LocationService target]
  (.search target))

(defn location-service-set-url
  "Change path, search and hash, when called with parameter and return `$location`.\n\nParams:\n- url: {string}\n\nReturns: {!ng.LocationService}"
  ^js/ng.LocationService [^js/ng.LocationService target ^string url]
  (.setUrl target url))

(defn location-service-url
  "Public LocationService.url member exposed by the AngularTS namespace contract.\n\nReturns: {string}"
  ^string [^js/ng.LocationService target]
  (.url target))

(defn log-provider-dollarget
  "Creates the runtime `$log` service.\n\nReturns: {!ng.LogService}"
  ^js/ng.LogService [^js/ng.LogProvider target]
  (.$get target))

(defn log-service-debug
  "Log a debug message.\n\nParams:\n- var_args: {...?}\n\nReturns: {void}"
  ([^js/ng.LogService target]
   (.debug target))
  ([^js/ng.LogService target value]
   (.debug target value))
  ([^js/ng.LogService target value extra]
   (.debug target value extra))
  ([^js/ng.LogService target value extra more]
   (.debug target value extra more)))

(defn log-service-error
  "Log an error message.\n\nParams:\n- var_args: {...?}\n\nReturns: {void}"
  ([^js/ng.LogService target]
   (.error target))
  ([^js/ng.LogService target value]
   (.error target value))
  ([^js/ng.LogService target value extra]
   (.error target value extra))
  ([^js/ng.LogService target value extra more]
   (.error target value extra more)))

(defn log-service-info
  "Log an info message.\n\nParams:\n- var_args: {...?}\n\nReturns: {void}"
  ([^js/ng.LogService target]
   (.info target))
  ([^js/ng.LogService target value]
   (.info target value))
  ([^js/ng.LogService target value extra]
   (.info target value extra))
  ([^js/ng.LogService target value extra more]
   (.info target value extra more)))

(defn log-service-log
  "Log a general message.\n\nParams:\n- var_args: {...?}\n\nReturns: {void}"
  ([^js/ng.LogService target]
   (.log target))
  ([^js/ng.LogService target value]
   (.log target value))
  ([^js/ng.LogService target value extra]
   (.log target value extra))
  ([^js/ng.LogService target value extra more]
   (.log target value extra more)))

(defn log-service-warn
  "Log a warning message.\n\nParams:\n- var_args: {...?}\n\nReturns: {void}"
  ([^js/ng.LogService target]
   (.warn target))
  ([^js/ng.LogService target value]
   (.warn target value))
  ([^js/ng.LogService target value extra]
   (.warn target value extra))
  ([^js/ng.LogService target value extra more]
   (.warn target value extra more)))

(defn machine-can
  "Public Machine.can member exposed by the AngularTS namespace contract.\n\nParams:\n- type: {string}\n\nReturns: {boolean}"
  ^boolean [^js/ng.Machine target ^string type]
  (.can target type))

(defn machine-matches
  "Public Machine.matches member exposed by the AngularTS namespace contract.\n\nParams:\n- mode: {string}\n\nReturns: {boolean}"
  ^boolean [^js/ng.Machine target ^string mode]
  (.matches target mode))

(defn machine-provider-dollarget
  "Public MachineProvider.$get member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.MachineService}"
  ^js/ng.MachineService [^js/ng.MachineProvider target]
  (.$get target))

(defn ng-model-controller-dollarcommit-view-value
  "Commit a pending update to the `$modelValue`. Updates may be pending by a debounced event or because the input is waiting for a some future event defined in `ng-model-options`. this method is rarely needed as `NgModelController` usually handles calling this in response to input events.\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$commitViewValue target))

(defn ng-model-controller-dollaroverride-model-options
  "Override the current model options settings programmatically. The previous `ModelOptions` value will not be modified. Instead, a new `ModelOptions` object will inherit from the previous one overriding or inheriting settings that are defined in the given parameter. See {@link ngModelOptions } for information about what options can be specified and how model option inheritance works. <div class=\"alert alert-warning\"> **Note:** this function only affects the options set on the `ngModelController`, and not the options on the {@link ngModelOptions } directive from which they might have been obtained initially. </div> <div class=\"alert alert-danger\"> **Note:** it is not possible to override the `getterSetter` option. </div>\n\nParams:\n- options: {!Object}\n\nReturns: {void}"
  [^js/ng.NgModelController target ^js/Object options]
  (.$overrideModelOptions target options))

(defn ng-model-controller-dollarprocess-model-value
  "Runs the model -> view pipeline on the current {@link ngModel.NgModelController#$modelValue $modelValue}. The following actions are performed by this method: - the `$modelValue` is run through the {@link ngModel.NgModelController#$formatters $formatters} and the result is set to the {@link ngModel.NgModelController#$viewValue $viewValue} - the `ng-empty` or `ng-not-empty` class is set on the element - if the `$viewValue` has changed: - {@link ngModel.NgModelController#$render $render} is called on the control - the {@link ngModel.NgModelController#$validators $validators} are run and the validation status is set. This method is called by ngModel internally when the bound scope value changes. Application developers usually do not have to call this function themselves. This function can be used when the `$viewValue` or the rendered DOM value are not correctly formatted and the `$modelValue` must be run through the `$formatters` again.\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$processModelValue target))

(defn ng-model-controller-dollarrender
  "Called when the view needs to be updated. It is expected that the user of the ng-model directive will implement this method. The `$render()` method is invoked in the following situations: * `$rollbackViewValue()` is called. If we are rolling back the view value to the last committed value then `$render()` is called to update the input control. * The value referenced by `ng-model` is changed programmatically and both the `$modelValue` and the `$viewValue` are different from last time. Since `ng-model` does not do a deep watch, `$render()` is only invoked if the values of `$modelValue` and `$viewValue` are actually different from their previous values. If `$modelValue` or `$viewValue` are objects (rather than a string or number) then `$render()` will not be invoked if you only change a property on the objects.\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$render target))

(defn ng-model-controller-dollarrollback-view-value
  "Cancel an update and reset the input element's value to prevent an update to the `$modelValue`, which may be caused by a pending debounced event or because the input is waiting for some future event. If you have an input that uses `ng-model-options` to set up debounced updates or updates that depend on special events such as `blur`, there can be a period when the `$viewValue` is out of sync with the ngModel's `$modelValue`. In this case, you can use `$rollbackViewValue()` to manually cancel the debounced / future update and reset the input to the last committed view value. It is also possible that you run into difficulties if you try to update the ngModel's `$modelValue` programmatically before these debounced/future events have resolved/occurred, because AngularTS's dirty checking mechanism is not able to tell whether the model has actually changed or not. The `$rollbackViewValue()` method should be called before programmatically changing the model of an input which may have such events pending. This is important in order to make sure that the input field will be updated with the new model value and any pending operations are cancelled.\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$rollbackViewValue target))

(defn ng-model-controller-dollarset-custom-validity
  "Sets the control's single native custom-validity message. Native controls expose this through `ValidityState.customError`; an empty message clears the custom error.\n\nParams:\n- message: {string}\n\nReturns: {void}"
  [^js/ng.NgModelController target ^string message]
  (.$setCustomValidity target message))

(defn ng-model-controller-dollarset-dirty
  "Sets the control to its dirty state. This method can be called to remove the `ng-pristine` class and set the control to its dirty state (`ng-dirty` class). A model is considered to be dirty when the control has been changed from when first compiled.\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$setDirty target))

(defn ng-model-controller-dollarset-native-validity
  "Public NgModelController.$setNativeValidity member exposed by the AngularTS namespace contract.\n\nParams:\n- state: {(boolean|null)}\n\nReturns: {void}"
  [^js/ng.NgModelController target ^boolean state]
  (.$setNativeValidity target state))

(defn ng-model-controller-dollarset-pristine
  "Sets the control to its pristine state. This method can be called to remove the `ng-dirty` class and set the control to its pristine state (`ng-pristine` class). A model is considered to be pristine when the control has not been changed from when first compiled.\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$setPristine target))

(defn ng-model-controller-dollarset-touched
  "Sets the control to its touched state. This method can be called to remove the `ng-untouched` class and set the control to its touched state (`ng-touched` class). A model is considered to be touched when the user has first focused the control element and then shifted focus away from the control (blur event).\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$setTouched target))

(defn ng-model-controller-dollarset-untouched
  "Sets the control to its untouched state. This method can be called to remove the `ng-touched` class and set the control to its untouched state (`ng-untouched` class). Upon compilation, a model is set as untouched by default, however this function can be used to restore that state if the model has already been touched by the user.\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$setUntouched target))

(defn ng-model-controller-dollarset-validity
  "Updates the validation state of the control and propagates it to the parent form.\n\nParams:\n- validationErrorKey: {string}\n- state: {(boolean|null|undefined)}\n\nReturns: {void}"
  [^js/ng.NgModelController target ^string validationErrorKey ^boolean state]
  (.$setValidity target validationErrorKey state))

(defn ng-model-controller-dollarvalidate
  "Runs each of the registered validators (first synchronous validators and then asynchronous validators). If the validity changes to invalid, the model will be set to `undefined`, unless {@link ngModelOptions `ngModelOptions.allowInvalid`} is `true`. If the validity changes to valid, it will set the model to the last available valid `$modelValue`, i.e. either the last parsed value or the last value set from the scope.\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$validate target))

(defn ng-module-animation
  "Public NgModule.animation member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- animationFactory: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.Injectable animationFactory]
  (.animation target name animationFactory))

(defn ng-module-app-component
  "Register an options-backed application host custom element. The definition is installed when the module runs. The host element is a native custom element backed by an AngularTS child scope.\n\nParams:\n- name: {string}\n- options: {!ng.AppComponentOptions<T>}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.AppComponentOptions options]
  (.appComponent target name options))

(defn ng-module-component
  "Public NgModule.component member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- options: {!ng.Component}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.Component options]
  (.component target name options))

(defn ng-module-config
  "Public NgModule.config member exposed by the AngularTS namespace contract.\n\nParams:\n- configFn: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^js/ng.Injectable configFn]
  (.config target configFn))

(defn ng-module-controller
  "The $controller service is used by Angular to create new controllers. This provider allows controller registration via the register method.\n\nParams:\n- name: {string}\n- ctlFn: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.Injectable ctlFn]
  (.controller target name ctlFn))

(defn ng-module-decorator
  "Public NgModule.decorator member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- decorFn: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.Injectable decorFn]
  (.decorator target name decorFn))

(defn ng-module-directive
  "Public NgModule.directive member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- directiveFactory: {!ng.DirectiveFactory}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.DirectiveFactory directiveFactory]
  (.directive target name directiveFactory))

(defn ng-module-factory
  "Public NgModule.factory member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- providerFunction: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.Injectable providerFunction]
  (.factory target name providerFunction))

(defn ng-module-machine
  "Register a named reactive mode machine as an injectable service. The machine is created by `$machine` when the named service is requested. The returned instance is not tied to any one scope lifetime; it registers with AngularTS scope proxies when assigned to a controller or scope.\n\nParams:\n- name: {string}\n- config: {!ng.MachineConfig<TData>}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.MachineConfig config]
  (.machine target name config))

(defn ng-module-provider
  "Public NgModule.provider member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- providerType: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.Injectable providerType]
  (.provider target name providerType))

(defn ng-module-run
  "Public NgModule.run member exposed by the AngularTS namespace contract.\n\nParams:\n- block: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^js/ng.Injectable block]
  (.run target block))

(defn ng-module-service
  "Public NgModule.service member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- serviceFunction: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.Injectable serviceFunction]
  (.service target name serviceFunction))

(defn ng-module-sse
  "Register a pre-configured SSE connection as an injectable service. The connection is created by `$sse` when the named service is requested.\n\nParams:\n- name: {string}\n- url: {string}\n- config: {(!ng.SseConfig|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^string url ^js/ng.SseConfig config]
  (.sse target name url config))

(defn ng-module-state
  "Register a router state during module configuration. This is equivalent to calling `$stateProvider.state(...)` in a config block, but keeps route declarations in the same fluent module API used for components, services, directives, and custom elements. Register a named router state during module configuration. The provided `name` is copied onto the state declaration before it is passed to `$stateProvider`.\n\nParams:\n- definition: {!ng.StateDeclaration}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^js/ng.StateDeclaration definition]
  (.state target definition))

(defn ng-module-wasm
  "Register a named WebAssembly module as an injectable service. The actual loading is delegated to the `$wasm` provider, so custom runtimes can decide whether WebAssembly support is included.\n\nParams:\n- name: {string}\n- src: {string}\n- imports: {(!Object<string, !Object<string, (!Object|number)>>|undefined)}\n- opts: {(!ng.WasmOptions|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^string src ^js/Object imports ^js/ng.WasmOptions opts]
  (.wasm target name src imports opts))

(defn ng-module-web-component
  "Register a user-authored native custom element backed by an AngularTS scope. The element class must extend `ScopeElement`. Its static template, shadow, scope, inputs, and isolate properties configure the AngularTS wiring.\n\nParams:\n- name: {string}\n- elementClass: {!ng.ScopeElementConstructor<T>}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.ScopeElementConstructor elementClass]
  (.webComponent target name elementClass))

(defn ng-module-web-transport
  "Register a pre-configured WebTransport connection as an injectable service. The connection is created by `$webTransport` when the named service is requested.\n\nParams:\n- name: {string}\n- url: {string}\n- config: {(!ng.WebTransportConfig|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^string url ^js/ng.WebTransportConfig config]
  (.webTransport target name url config))

(defn ng-module-websocket
  "Register a pre-configured WebSocket connection as an injectable service. The connection is created by `$websocket` when the named service is requested.\n\nParams:\n- name: {string}\n- url: {string}\n- protocols: {(!Array<string>|undefined)}\n- config: {(!ng.WebSocketConfig|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^string url ^js/Array protocols ^js/ng.WebSocketConfig config]
  (.websocket target name url protocols config))

(defn provide-service-decorator
  "Register a decorator function to modify or replace an existing service.\n\nParams:\n- name: {string}\n- fn: {!ng.Injectable}\n\nReturns: {!ng.ProvideService}"
  ^js/ng.ProvideService [^js/ng.ProvideService target ^string name ^js/ng.Injectable fn]
  (.decorator target name fn))

(defn provide-service-directive
  "Register a directive Register multiple directives\n\nParams:\n- name: {string}\n- directive: {!ng.DirectiveFactory}\n\nReturns: {!ng.ProvideService}"
  ^js/ng.ProvideService [^js/ng.ProvideService target ^string name ^js/ng.DirectiveFactory directive]
  (.directive target name directive))

(defn provide-service-factory
  "Register a factory function to create a service.\n\nParams:\n- name: {string}\n- factoryFn: {!ng.Injectable}\n\nReturns: {!ng.ProvideService}"
  ^js/ng.ProvideService [^js/ng.ProvideService target ^string name ^js/ng.Injectable factoryFn]
  (.factory target name factoryFn))

(defn provide-service-service
  "Register a constructor function to create a service.\n\nParams:\n- name: {string}\n- constructor: {!ng.Injectable}\n\nReturns: {!ng.ProvideService}"
  ^js/ng.ProvideService [^js/ng.ProvideService target ^string name ^js/ng.Injectable constructor]
  (.service target name constructor))

(defn pub-sub-provider-dollarget
  "Public PubSubProvider.$get member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.PubSubService}"
  ^js/ng.PubSubService [^js/ng.PubSubProvider target]
  (.$get target))

(defn pub-sub-service-dispose
  "Dispose the instance, removing all topics and listeners.\n\nReturns: {void}"
  [^js/ng.PubSubService target]
  (.dispose target))

(defn pub-sub-service-get-count
  "Get the number of subscribers for a topic.\n\nParams:\n- topic: {string}\n\nReturns: {number}"
  ^number [^js/ng.PubSubService target ^string topic]
  (.getCount target topic))

(defn pub-sub-service-is-disposed
  "Checks if instance has been disposed.\n\nReturns: {boolean}"
  ^boolean [^js/ng.PubSubService target]
  (.isDisposed target))

(defn pub-sub-service-publish
  "Publish a value to a topic asynchronously. All listeners are invoked in the order they were added. Delivery is scheduled with `queueMicrotask`.\n\nParams:\n- topic: {string}\n- var_args: {...?}\n\nReturns: {boolean}"
  (^boolean [^js/ng.PubSubService target ^string topic]
   (.publish target topic))
  (^boolean [^js/ng.PubSubService target ^string topic value]
   (.publish target topic value))
  (^boolean [^js/ng.PubSubService target ^string topic value extra]
   (.publish target topic value extra))
  (^boolean [^js/ng.PubSubService target ^string topic value extra more]
   (.publish target topic value extra more)))

(defn pub-sub-service-reset
  "Reset the bus to its initial state without disposing it. All topics and listeners are removed, and the instance can be reused.\n\nReturns: {void}"
  [^js/ng.PubSubService target]
  (.reset target))

(defn rest-backend-request
  "Execute one normalized REST request.\n\nParams:\n- request: {!ng.RestRequest}\n\nReturns: {!Promise<!ng.RestResponse<T>>}"
  ^js/Promise [^js/ng.RestBackend target ^js/ng.RestRequest request]
  (.request target request))

(defn rest-cache-store-delete
  "Delete one cached REST response.\n\nParams:\n- key: {string}\n\nReturns: {!Promise<void>}"
  ^js/Promise [^js/ng.RestCacheStore target ^string key]
  (.delete target key))

(defn rest-cache-store-delete-prefix
  "Delete cached REST responses whose keys start with the prefix. `CachedRestBackend` uses prefixes such as `GET /api/users` to invalidate collection and entity entries after successful writes.\n\nParams:\n- prefix: {string}\n\nReturns: {!Promise<void>}"
  ^js/Promise [^js/ng.RestCacheStore target ^string prefix]
  (.deletePrefix target prefix))

(defn rest-cache-store-get
  "Read a cached REST response by deterministic key.\n\nParams:\n- key: {string}\n\nReturns: {!Promise<(!ng.RestResponse<T>|undefined)>}"
  ^js/Promise [^js/ng.RestCacheStore target ^string key]
  (.get target key))

(defn rest-cache-store-set
  "Store a REST response by deterministic key.\n\nParams:\n- key: {string}\n- response: {!ng.RestResponse<T>}\n\nReturns: {!Promise<void>}"
  ^js/Promise [^js/ng.RestCacheStore target ^string key ^js/ng.RestResponse response]
  (.set target key response))

(defn rest-service-build-url
  "Expand an RFC 6570 URI template with the provided parameters.\n\nParams:\n- template: {string}\n- params: {!Object<string, ?>}\n\nReturns: {string}"
  ^string [^js/ng.RestService target ^string template ^js/Object params]
  (.buildUrl target template params))

(defn rest-service-list
  "Fetch a collection. Parameters are used for URI template expansion and are also forwarded to `$http` as query params. Non-array responses resolve to an empty array.\n\nParams:\n- params: {(!Object<string, ?>|undefined)}\n\nReturns: {!Promise<!Array<T>>}"
  ^js/Promise [^js/ng.RestService target ^js/Object params]
  (.list target params))

(defn root-scope-service-dollarbroadcast
  "Broadcasts an event downward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {(!ng.ScopeEvent|undefined)}"
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name]
   (.$broadcast target name))
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name value]
   (.$broadcast target name value))
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name value extra]
   (.$broadcast target name value extra))
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name value extra more]
   (.$broadcast target name value extra more)))

(defn root-scope-service-dollardestroy
  "Public RootScopeService.$destroy member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.RootScopeService target]
  (.$destroy target))

(defn root-scope-service-dollaremit
  "Emits an event upward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {(!ng.ScopeEvent|undefined)}"
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name]
   (.$emit target name))
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name value]
   (.$emit target name value))
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name value extra]
   (.$emit target name value extra))
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name value extra more]
   (.$emit target name value extra more)))

(defn root-scope-service-dollarmerge
  "Merges enumerable properties from the provided object into the current scope target.\n\nParams:\n- newTarget: {!Object}\n\nReturns: {void}"
  [^js/ng.RootScopeService target ^js/Object newTarget]
  (.$merge target newTarget))

(defn root-scope-service-dollarnew
  "Creates a prototypically inherited child scope.\n\nParams:\n- childInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.RootScopeService target ^js/ng.Scope childInstance]
  (.$new target childInstance))

(defn root-scope-service-dollarnew-isolate
  "Creates an isolate child scope that does not inherit watchable properties directly.\n\nParams:\n- instance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.RootScopeService target ^js/ng.Scope instance]
  (.$newIsolate target instance))

(defn root-scope-service-dollarsearch-by-name
  "Searches the scope tree for a scope registered under the provided name.\n\nParams:\n- name: {string}\n\nReturns: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.RootScopeService target ^string name]
  (.$searchByName target name))

(defn root-scope-service-dollartranscluded
  "Creates a transcluded child scope linked to this scope and an optional parent instance.\n\nParams:\n- parentInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.RootScopeService target ^js/ng.Scope parentInstance]
  (.$transcluded target parentInstance))

(defn sce-delegate-provider-banned-resource-url-list
  "Public SceDelegateProvider.bannedResourceUrlList member exposed by the AngularTS namespace contract.\n\nParams:\n- value: {(!Array<(!Object|string)>|null|undefined)}\n\nReturns: {!Array<(!Object|string)>}"
  ^js/Array [^js/ng.SceDelegateProvider target ^js/Array value]
  (.bannedResourceUrlList target value))

(defn sce-delegate-provider-trusted-resource-url-list
  "Public SceDelegateProvider.trustedResourceUrlList member exposed by the AngularTS namespace contract.\n\nParams:\n- value: {(!Array<(!Object|string)>|null|undefined)}\n\nReturns: {!Array<(!Object|string)>}"
  ^js/Array [^js/ng.SceDelegateProvider target ^js/Array value]
  (.trustedResourceUrlList target value))

(defn sce-provider-enabled
  "Enables or disables SCE application-wide and returns the current state.\n\nParams:\n- value: {(boolean|undefined)}\n\nReturns: {boolean}"
  ^boolean [^js/ng.SceProvider target ^boolean value]
  (.enabled target value))

(defn sce-service-is-enabled
  "Public SceService.isEnabled member exposed by the AngularTS namespace contract.\n\nReturns: {boolean}"
  ^boolean [^js/ng.SceService target]
  (.isEnabled target))

(defn sce-service-parse
  "Public SceService.parse member exposed by the AngularTS namespace contract.\n\nParams:\n- type: {string}\n- expression: {string}\n\nReturns: {!Object}"
  ^js/Object [^js/ng.SceService target ^string type ^string expression]
  (.parse target type expression))

(defn sce-service-parse-as-html
  "Public SceService.parseAsHtml member exposed by the AngularTS namespace contract.\n\nParams:\n- expression: {string}\n\nReturns: {!Object}"
  ^js/Object [^js/ng.SceService target ^string expression]
  (.parseAsHtml target expression))

(defn sce-service-parse-as-media-url
  "Public SceService.parseAsMediaUrl member exposed by the AngularTS namespace contract.\n\nParams:\n- expression: {string}\n\nReturns: {!Object}"
  ^js/Object [^js/ng.SceService target ^string expression]
  (.parseAsMediaUrl target expression))

(defn sce-service-parse-as-resource-url
  "Public SceService.parseAsResourceUrl member exposed by the AngularTS namespace contract.\n\nParams:\n- expression: {string}\n\nReturns: {!Object}"
  ^js/Object [^js/ng.SceService target ^string expression]
  (.parseAsResourceUrl target expression))

(defn sce-service-parse-as-url
  "Public SceService.parseAsUrl member exposed by the AngularTS namespace contract.\n\nParams:\n- expression: {string}\n\nReturns: {!Object}"
  ^js/Object [^js/ng.SceService target ^string expression]
  (.parseAsUrl target expression))

(defn scope-dollarbroadcast
  "Broadcasts an event downward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {(!ng.ScopeEvent|undefined)}"
  (^js/ng.ScopeEvent [^js/ng.Scope target ^string name]
   (.$broadcast target name))
  (^js/ng.ScopeEvent [^js/ng.Scope target ^string name value]
   (.$broadcast target name value))
  (^js/ng.ScopeEvent [^js/ng.Scope target ^string name value extra]
   (.$broadcast target name value extra))
  (^js/ng.ScopeEvent [^js/ng.Scope target ^string name value extra more]
   (.$broadcast target name value extra more)))

(defn scope-dollardestroy
  "Public Scope.$destroy member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.Scope target]
  (.$destroy target))

(defn scope-dollaremit
  "Emits an event upward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {(!ng.ScopeEvent|undefined)}"
  (^js/ng.ScopeEvent [^js/ng.Scope target ^string name]
   (.$emit target name))
  (^js/ng.ScopeEvent [^js/ng.Scope target ^string name value]
   (.$emit target name value))
  (^js/ng.ScopeEvent [^js/ng.Scope target ^string name value extra]
   (.$emit target name value extra))
  (^js/ng.ScopeEvent [^js/ng.Scope target ^string name value extra more]
   (.$emit target name value extra more)))

(defn scope-dollarmerge
  "Merges enumerable properties from the provided object into the current scope target.\n\nParams:\n- newTarget: {!Object}\n\nReturns: {void}"
  [^js/ng.Scope target ^js/Object newTarget]
  (.$merge target newTarget))

(defn scope-dollarnew
  "Creates a prototypically inherited child scope.\n\nParams:\n- childInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Scope target ^js/ng.Scope childInstance]
  (.$new target childInstance))

(defn scope-dollarnew-isolate
  "Creates an isolate child scope that does not inherit watchable properties directly.\n\nParams:\n- instance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Scope target ^js/ng.Scope instance]
  (.$newIsolate target instance))

(defn scope-dollarsearch-by-name
  "Searches the scope tree for a scope registered under the provided name.\n\nParams:\n- name: {string}\n\nReturns: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.Scope target ^string name]
  (.$searchByName target name))

(defn scope-dollartranscluded
  "Creates a transcluded child scope linked to this scope and an optional parent instance.\n\nParams:\n- parentInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Scope target ^js/ng.Scope parentInstance]
  (.$transcluded target parentInstance))

(defn scope-element-attribute-changed-callback
  "Public ScopeElement.attributeChangedCallback member exposed by the AngularTS namespace contract.\n\nParams:\n- attribute: {string}\n- oldValue: {(null|string)}\n- newValue: {(null|string)}\n\nReturns: {void}"
  [^js/ng.ScopeElement target ^string attribute ^string oldValue ^string newValue]
  (.attributeChangedCallback target attribute oldValue newValue))

(defn scope-element-connected-callback
  "Public ScopeElement.connectedCallback member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.ScopeElement target]
  (.connectedCallback target))

(defn scope-element-disconnected-callback
  "Public ScopeElement.disconnectedCallback member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.ScopeElement target]
  (.disconnectedCallback target))

(defn scope-event-prevent-default
  "Public ScopeEvent.preventDefault member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.ScopeEvent target]
  (.preventDefault target))

(defn scope-service-dollarbroadcast
  "Broadcasts an event downward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {(!ng.ScopeEvent|undefined)}"
  (^js/ng.ScopeEvent [^js/ng.ScopeService target ^string name]
   (.$broadcast target name))
  (^js/ng.ScopeEvent [^js/ng.ScopeService target ^string name value]
   (.$broadcast target name value))
  (^js/ng.ScopeEvent [^js/ng.ScopeService target ^string name value extra]
   (.$broadcast target name value extra))
  (^js/ng.ScopeEvent [^js/ng.ScopeService target ^string name value extra more]
   (.$broadcast target name value extra more)))

(defn scope-service-dollardestroy
  "Public ScopeService.$destroy member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.ScopeService target]
  (.$destroy target))

(defn scope-service-dollaremit
  "Emits an event upward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {(!ng.ScopeEvent|undefined)}"
  (^js/ng.ScopeEvent [^js/ng.ScopeService target ^string name]
   (.$emit target name))
  (^js/ng.ScopeEvent [^js/ng.ScopeService target ^string name value]
   (.$emit target name value))
  (^js/ng.ScopeEvent [^js/ng.ScopeService target ^string name value extra]
   (.$emit target name value extra))
  (^js/ng.ScopeEvent [^js/ng.ScopeService target ^string name value extra more]
   (.$emit target name value extra more)))

(defn scope-service-dollarnew
  "Creates a prototypically inherited child scope.\n\nParams:\n- childInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.ScopeService target ^js/ng.Scope childInstance]
  (.$new target childInstance))

(defn scope-service-dollarnew-isolate
  "Creates an isolate child scope that does not inherit watchable properties directly.\n\nParams:\n- instance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.ScopeService target ^js/ng.Scope instance]
  (.$newIsolate target instance))

(defn scope-service-dollarsearch-by-name
  "Searches the scope tree for a scope registered under the provided name.\n\nParams:\n- name: {string}\n\nReturns: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.ScopeService target ^string name]
  (.$searchByName target name))

(defn scope-service-dollartranscluded
  "Creates a transcluded child scope linked to this scope and an optional parent instance.\n\nParams:\n- parentInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.ScopeService target ^js/ng.Scope parentInstance]
  (.$transcluded target parentInstance))

(defn sse-connection-close
  "Manually close the SSE connection and stop all reconnect attempts\n\nReturns: {void}"
  [^js/ng.SseConnection target]
  (.close target))

(defn sse-connection-connect
  "Manually restart the SSE connection.\n\nReturns: {void}"
  [^js/ng.SseConnection target]
  (.connect target))

(defn state-provider-get-current-path
  "Public StateProvider.getCurrentPath member exposed by the AngularTS namespace contract.\n\nReturns: {!Array<!Object>}"
  ^js/Array [^js/ng.StateProvider target]
  (.getCurrentPath target))

(defn state-provider-state
  "Register a router state. Register a named router state.\n\nParams:\n- definition: {!ng.StateDeclaration}\n\nReturns: {!ng.StateProvider}"
  ^js/ng.StateProvider [^js/ng.StateProvider target ^js/ng.StateDeclaration definition]
  (.state target definition))

(defn state-registry-provider-get-all
  "Public StateRegistryProvider.getAll member exposed by the AngularTS namespace contract.\n\nReturns: {!Array<!ng.StateDeclaration>}"
  ^js/Array [^js/ng.StateRegistryProvider target]
  (.getAll target))

(defn state-registry-provider-register-root
  "Public StateRegistryProvider.registerRoot member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.StateRegistryProvider target]
  (.registerRoot target))

(defn state-registry-provider-root
  "Gets the implicit root state Gets the root of the state tree. The root state is implicitly created by ng-router. Note: this returns the internal [[StateObject]] representation, not a [[StateDeclaration]]\n\nReturns: {!Object}"
  ^js/Object [^js/ng.StateRegistryProvider target]
  (.root target))

(defn state-registry-service-get-all
  "Public StateRegistryService.getAll member exposed by the AngularTS namespace contract.\n\nReturns: {!Array<!ng.StateDeclaration>}"
  ^js/Array [^js/ng.StateRegistryService target]
  (.getAll target))

(defn state-registry-service-register-root
  "Public StateRegistryService.registerRoot member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.StateRegistryService target]
  (.registerRoot target))

(defn state-registry-service-root
  "Gets the implicit root state Gets the root of the state tree. The root state is implicitly created by ng-router. Note: this returns the internal [[StateObject]] representation, not a [[StateDeclaration]]\n\nReturns: {!Object}"
  ^js/Object [^js/ng.StateRegistryService target]
  (.root target))

(defn state-service-get-current-path
  "Public StateService.getCurrentPath member exposed by the AngularTS namespace contract.\n\nReturns: {!Array<!Object>}"
  ^js/Array [^js/ng.StateService target]
  (.getCurrentPath target))

(defn state-service-state
  "Register a router state. Register a named router state.\n\nParams:\n- definition: {!ng.StateDeclaration}\n\nReturns: {!ng.StateProvider}"
  ^js/ng.StateProvider [^js/ng.StateService target ^js/ng.StateDeclaration definition]
  (.state target definition))

(defn storage-backend-get
  "Read a stored serialized value.\n\nParams:\n- key: {string}\n\nReturns: {(string|undefined)}"
  ^string [^js/ng.StorageBackend target ^string key]
  (.get target key))

(defn storage-backend-remove
  "Remove a stored value.\n\nParams:\n- key: {string}\n\nReturns: {void}"
  [^js/ng.StorageBackend target ^string key]
  (.remove target key))

(defn storage-backend-set
  "Store a serialized value.\n\nParams:\n- key: {string}\n- value: {string}\n\nReturns: {void}"
  [^js/ng.StorageBackend target ^string key ^string value]
  (.set target key value))

(defn stream-provider-dollarget
  "Public StreamProvider.$get member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.StreamService}"
  ^js/ng.StreamService [^js/ng.StreamProvider target]
  (.$get target))

(defn stream-service-consume-json-lines
  "Decodes newline-delimited JSON without retaining parsed values.\n\nParams:\n- stream: {!Object}\n- options: {(!Object|undefined)}\n\nReturns: {!Promise<void>}"
  ^js/Promise [^js/ng.StreamService target ^js/Object stream ^js/Object options]
  (.consumeJsonLines target stream options))

(defn stream-service-consume-text
  "Decodes a byte stream and calls `onChunk` without retaining decoded text.\n\nParams:\n- stream: {!Object}\n- options: {(!Object|undefined)}\n\nReturns: {!Promise<void>}"
  ^js/Promise [^js/ng.StreamService target ^js/Object stream ^js/Object options]
  (.consumeText target stream options))

(defn stream-service-read-json-lines
  "Decodes newline-delimited JSON and returns all parsed values.\n\nParams:\n- stream: {!Object}\n- options: {(!Object|undefined)}\n\nReturns: {!Promise<!Array<T>>}"
  ^js/Promise [^js/ng.StreamService target ^js/Object stream ^js/Object options]
  (.readJsonLines target stream options))

(defn stream-service-read-lines
  "Decodes a byte stream and emits complete lines.\n\nParams:\n- stream: {!Object}\n- options: {(!Object|undefined)}\n\nReturns: {!Promise<!Array<string>>}"
  ^js/Promise [^js/ng.StreamService target ^js/Object stream ^js/Object options]
  (.readLines target stream options))

(defn stream-service-read-text
  "Decodes a byte stream into text chunks.\n\nParams:\n- stream: {!Object}\n- options: {(!Object|undefined)}\n\nReturns: {!Promise<string>}"
  ^js/Promise [^js/ng.StreamService target ^js/Object stream ^js/Object options]
  (.readText target stream options))

(defn template-cache-provider-dollarget
  "Returns the singleton template cache instance.\n\nReturns: {!Map<string, string>}"
  ^js/Map [^js/ng.TemplateCacheProvider target]
  (.$get target))

(defn transition-abort
  "Aborts this transition Imperative API to abort a Transition. This only applies to Transitions that are not yet complete.\n\nReturns: {void}"
  [^js/ng.Transition target]
  (.abort target))

(defn transition-apply-view-configs
  "Public Transition.applyViewConfigs member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.Transition target]
  (.applyViewConfigs target))

(defn transition-dollarfrom
  "Public Transition.$from member exposed by the AngularTS namespace contract.\n\nReturns: {!Object}"
  ^js/Object [^js/ng.Transition target]
  (.$from target))

(defn transition-dollarto
  "Public Transition.$to member exposed by the AngularTS namespace contract.\n\nReturns: {!Object}"
  ^js/Object [^js/ng.Transition target]
  (.$to target))

(defn transition-dynamic
  "Returns true if the transition is dynamic. A transition is dynamic if no states are entered nor exited, but at least one dynamic parameter has changed.\n\nReturns: {boolean}"
  ^boolean [^js/ng.Transition target]
  (.dynamic target))

(defn transition-entering
  "Gets the states being entered.\n\nReturns: {!Array<!ng.StateDeclaration>}"
  ^js/Array [^js/ng.Transition target]
  (.entering target))

(defn transition-error
  "The Transition error reason. If the transition is invalid (and could not be run), returns the reason the transition is invalid. If the transition was valid and ran, but was not successful, returns the reason the transition failed.\n\nReturns: {(!Object|undefined)}"
  ^js/Object [^js/ng.Transition target]
  (.error target))

(defn transition-exiting
  "Gets the states being exited.\n\nReturns: {!Array<!ng.StateDeclaration>}"
  ^js/Array [^js/ng.Transition target]
  (.exiting target))

(defn transition-from
  "Returns the \"from state\" Returns the state that the transition is coming *from*.\n\nReturns: {!ng.StateDeclaration}"
  ^js/ng.StateDeclaration [^js/ng.Transition target]
  (.from target))

(defn transition-is-active
  "Checks if this transition is currently active/running.\n\nReturns: {boolean}"
  ^boolean [^js/ng.Transition target]
  (.isActive target))

(defn transition-params
  "Public Transition.params member exposed by the AngularTS namespace contract.\n\nParams:\n- pathname: {(string|undefined)}\n\nReturns: {!Object<string, ?>}"
  ^js/Object [^js/ng.Transition target ^string pathname]
  (.params target pathname))

(defn transition-provider-create
  "Creates a new transition from the current path to a target state.\n\nParams:\n- fromPath: {!Array<!Object>}\n- targetState: {!Object}\n\nReturns: {!ng.Transition}"
  ^js/ng.Transition [^js/ng.TransitionProvider target ^js/Array fromPath ^js/Object targetState]
  (.create target fromPath targetState))

(defn transition-provider-dollarget
  "Wires runtime services into the transition service and registers the hooks that depend on state/url/view services.\n\nReturns: {!ng.TransitionProvider}"
  ^js/ng.TransitionProvider [^js/ng.TransitionProvider target]
  (.$get target))

(defn transition-redirect
  "Creates a new transition that is a redirection of the current one. This transition can be returned from a [[TransitionService]] hook to redirect a transition to a new state and/or set of parameters.\n\nParams:\n- targetState: {!Object}\n\nReturns: {!ng.Transition}"
  ^js/ng.Transition [^js/ng.Transition target ^js/Object targetState]
  (.redirect target targetState))

(defn transition-run
  "Runs the transition This method is generally called from the [[StateService.transitionTo]]\n\nReturns: {!Promise<!ng.StateDeclaration>}"
  ^js/Promise [^js/ng.Transition target]
  (.run target))

(defn transition-to
  "Returns the \"to state\" Returns the state that the transition is going *to*.\n\nReturns: {!ng.StateDeclaration}"
  ^js/ng.StateDeclaration [^js/ng.Transition target]
  (.to target))

(defn transition-to-string
  "A string representation of the Transition\n\nReturns: {string}"
  ^string [^js/ng.Transition target]
  (.toString target))

(defn transition-valid
  "Checks if the Transition is valid\n\nReturns: {boolean}"
  ^boolean [^js/ng.Transition target]
  (.valid target))

(defn transitions-provider-create
  "Creates a new transition from the current path to a target state.\n\nParams:\n- fromPath: {!Array<!Object>}\n- targetState: {!Object}\n\nReturns: {!ng.Transition}"
  ^js/ng.Transition [^js/ng.TransitionsProvider target ^js/Array fromPath ^js/Object targetState]
  (.create target fromPath targetState))

(defn transitions-provider-dollarget
  "Wires runtime services into the transition service and registers the hooks that depend on state/url/view services.\n\nReturns: {!ng.TransitionProvider}"
  ^js/ng.TransitionProvider [^js/ng.TransitionsProvider target]
  (.$get target))

(defn wasm-abi-exports-ng-abi-alloc
  "Allocates `size` bytes in guest memory and returns the pointer.\n\nParams:\n- size: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmAbiExports target ^number size]
  (.ng_abi_alloc target size))

(defn wasm-abi-exports-ng-abi-free
  "Releases a pointer previously returned by `ng_abi_alloc`.\n\nParams:\n- ptr: {number}\n- size: {number}\n\nReturns: {void}"
  [^js/ng.WasmAbiExports target ^number ptr ^number size]
  (.ng_abi_free target ptr size))

(defn wasm-provider-dollarget
  "Public WasmProvider.$get member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.WasmService}"
  ^js/ng.WasmService [^js/ng.WasmProvider target]
  (.$get target))

(defn wasm-scope-abi-attach
  "Attaches guest exports after instantiation.\n\nParams:\n- exports: {!ng.WasmAbiExports}\n\nReturns: {void}"
  [^js/ng.WasmScopeAbi target ^js/ng.WasmAbiExports exports]
  (.attach target exports))

(defn wasm-scope-abi-create-scope
  "Creates and registers a scope wrapper.\n\nParams:\n- scope: {!ng.Scope}\n- options: {(!ng.WasmScopeOptions|undefined)}\n\nReturns: {!ng.WasmScope}"
  ^js/ng.WasmScope [^js/ng.WasmScopeAbi target ^js/ng.Scope scope ^js/ng.WasmScopeOptions options]
  (.createScope target scope options))

(defn wasm-scope-abi-free-buffer
  "Releases one result buffer created by `scope_get`.\n\nParams:\n- bufferHandle: {number}\n\nReturns: {void}"
  [^js/ng.WasmScopeAbi target ^number bufferHandle]
  (.freeBuffer target bufferHandle))

(defn wasm-scope-abi-imports-buffer-free
  "Releases a host-owned result buffer and its guest-memory allocation.\n\nParams:\n- bufferHandle: {number}\n\nReturns: {void}"
  [^js/ng.WasmScopeAbiImports target ^number bufferHandle]
  (.buffer_free target bufferHandle))

(defn wasm-scope-abi-imports-buffer-len
  "Returns the byte length for a host-owned result buffer.\n\nParams:\n- bufferHandle: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number bufferHandle]
  (.buffer_len target bufferHandle))

(defn wasm-scope-abi-imports-buffer-ptr
  "Returns the guest pointer for a host-owned result buffer.\n\nParams:\n- bufferHandle: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number bufferHandle]
  (.buffer_ptr target bufferHandle))

(defn wasm-scope-abi-imports-scope-delete
  "Deletes a scope path. Returns `1` on success.\n\nParams:\n- scopeHandle: {number}\n- pathPtr: {number}\n- pathLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number scopeHandle ^number pathPtr ^number pathLen]
  (.scope_delete target scopeHandle pathPtr pathLen))

(defn wasm-scope-abi-imports-scope-delete-named
  "Name-based variant of `scope_delete`.\n\nParams:\n- namePtr: {number}\n- nameLen: {number}\n- pathPtr: {number}\n- pathLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number namePtr ^number nameLen ^number pathPtr ^number pathLen]
  (.scope_delete_named target namePtr nameLen pathPtr pathLen))

(defn wasm-scope-abi-imports-scope-get
  "Returns a host-owned result buffer handle containing JSON for a scope path.\n\nParams:\n- scopeHandle: {number}\n- pathPtr: {number}\n- pathLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number scopeHandle ^number pathPtr ^number pathLen]
  (.scope_get target scopeHandle pathPtr pathLen))

(defn wasm-scope-abi-imports-scope-get-named
  "Name-based variant of `scope_get`.\n\nParams:\n- namePtr: {number}\n- nameLen: {number}\n- pathPtr: {number}\n- pathLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number namePtr ^number nameLen ^number pathPtr ^number pathLen]
  (.scope_get_named target namePtr nameLen pathPtr pathLen))

(defn wasm-scope-abi-imports-scope-resolve
  "Resolves a scope name to a numeric scope handle.\n\nParams:\n- namePtr: {number}\n- nameLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number namePtr ^number nameLen]
  (.scope_resolve target namePtr nameLen))

(defn wasm-scope-abi-imports-scope-set
  "Writes a JSON payload into a scope path. Returns `1` on success.\n\nParams:\n- scopeHandle: {number}\n- pathPtr: {number}\n- pathLen: {number}\n- valuePtr: {number}\n- valueLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number scopeHandle ^number pathPtr ^number pathLen ^number valuePtr ^number valueLen]
  (.scope_set target scopeHandle pathPtr pathLen valuePtr valueLen))

(defn wasm-scope-abi-imports-scope-set-named
  "Name-based variant of `scope_set`.\n\nParams:\n- namePtr: {number}\n- nameLen: {number}\n- pathPtr: {number}\n- pathLen: {number}\n- valuePtr: {number}\n- valueLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number namePtr ^number nameLen ^number pathPtr ^number pathLen ^number valuePtr ^number valueLen]
  (.scope_set_named target namePtr nameLen pathPtr pathLen valuePtr valueLen))

(defn wasm-scope-abi-imports-scope-sync
  "Runs queued Wasm scope bridge callbacks. Returns `1` on success.\n\nParams:\n- scopeHandle: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number scopeHandle]
  (.scope_sync target scopeHandle))

(defn wasm-scope-abi-imports-scope-sync-named
  "Name-based variant of `scope_sync`.\n\nParams:\n- namePtr: {number}\n- nameLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number namePtr ^number nameLen]
  (.scope_sync_named target namePtr nameLen))

(defn wasm-scope-abi-imports-scope-unbind
  "Unbinds a scope handle without destroying the AngularTS scope.\n\nParams:\n- scopeHandle: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number scopeHandle]
  (.scope_unbind target scopeHandle))

(defn wasm-scope-abi-imports-scope-unbind-named
  "Name-based variant of `scope_unbind`.\n\nParams:\n- namePtr: {number}\n- nameLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number namePtr ^number nameLen]
  (.scope_unbind_named target namePtr nameLen))

(defn wasm-scope-abi-imports-scope-unwatch
  "Removes a watch handle. Returns `1` on success.\n\nParams:\n- watchHandle: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number watchHandle]
  (.scope_unwatch target watchHandle))

(defn wasm-scope-abi-imports-scope-watch
  "Watches a scope path and returns a watch handle.\n\nParams:\n- scopeHandle: {number}\n- pathPtr: {number}\n- pathLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number scopeHandle ^number pathPtr ^number pathLen]
  (.scope_watch target scopeHandle pathPtr pathLen))

(defn wasm-scope-abi-imports-scope-watch-named
  "Name-based variant of `scope_watch`.\n\nParams:\n- namePtr: {number}\n- nameLen: {number}\n- pathPtr: {number}\n- pathLen: {number}\n\nReturns: {number}"
  ^number [^js/ng.WasmScopeAbiImports target ^number namePtr ^number nameLen ^number pathPtr ^number pathLen]
  (.scope_watch_named target namePtr nameLen pathPtr pathLen))

(defn wasm-scope-abi-notify-bind
  "Invokes the optional guest bind callback for a scope.\n\nParams:\n- scope: {!ng.WasmScope}\n\nReturns: {void}"
  [^js/ng.WasmScopeAbi target ^js/ng.WasmScope scope]
  (.notifyBind target scope))

(defn wasm-scope-abi-notify-unbind
  "Invokes the optional guest unbind callback for a scope.\n\nParams:\n- scope: {!ng.WasmScope}\n\nReturns: {void}"
  [^js/ng.WasmScopeAbi target ^js/ng.WasmScope scope]
  (.notifyUnbind target scope))

(defn wasm-scope-abi-notify-update
  "Invokes the optional guest update callback for a watched scope path.\n\nParams:\n- update: {!ng.WasmScopeUpdate}\n\nReturns: {void}"
  [^js/ng.WasmScopeAbi target ^js/ng.WasmScopeUpdate update]
  (.notifyUpdate target update))

(defn wasm-scope-abi-unregister-scope
  "Unregisters a scope wrapper without destroying the AngularTS scope.\n\nParams:\n- handle: {number}\n\nReturns: {boolean}"
  ^boolean [^js/ng.WasmScopeAbi target ^number handle]
  (.unregisterScope target handle))

(defn wasm-scope-delete
  "Deletes a dot-separated path from the wrapped AngularTS scope.\n\nParams:\n- path: {string}\n\nReturns: {boolean}"
  ^boolean [^js/ng.WasmScope target ^string path]
  (.delete target path))

(defn wasm-scope-dispose
  "Disposes ABI bindings without destroying the underlying AngularTS scope.\n\nReturns: {void}"
  [^js/ng.WasmScope target]
  (.dispose target))

(defn wasm-scope-is-disposed
  "Returns whether the wrapper has been disposed.\n\nReturns: {boolean}"
  ^boolean [^js/ng.WasmScope target]
  (.isDisposed target))

(defn wasm-scope-sync
  "Runs queued Wasm bridge callbacks for this scope.\n\nReturns: {void}"
  [^js/ng.WasmScope target]
  (.sync target))

(defn wasm-service-call
  "Invokes the callable WasmService contract.\n\nParams:\n- src: {string}\n- imports: {(!Object<string, !Object<string, (!Object|number)>>|undefined)}\n- opts: {(!ng.WasmOptions|undefined)}\n\nReturns: {!Promise<(!Object<string, !Object>|!ng.WasmInstantiationResult)>}"
  ^js/Promise [^js/ng.WasmService target ^string src ^js/Object imports ^js/ng.WasmOptions opts]
  (.call target src imports opts))

(defn wasm-service-create-scope-abi
  "Creates a language-neutral host ABI for AngularTS scope handles.\n\nParams:\n- exports: {(!ng.WasmAbiExports|undefined)}\n\nReturns: {!ng.WasmScopeAbi}"
  ^js/ng.WasmScopeAbi [^js/ng.WasmService target ^js/ng.WasmAbiExports exports]
  (.createScopeAbi target exports))

(defn wasm-service-scope
  "Wraps an AngularTS scope for direct Wasm client access.\n\nParams:\n- scope: {!ng.Scope}\n- options: {(!ng.WasmScopeOptions|undefined)}\n\nReturns: {!ng.WasmScope}"
  ^js/ng.WasmScope [^js/ng.WasmService target ^js/ng.Scope scope ^js/ng.WasmScopeOptions options]
  (.scope target scope options))

(defn web-socket-connection-close
  "Close the WebSocket connection and stop reconnect attempts.\n\nReturns: {void}"
  [^js/ng.WebSocketConnection target]
  (.close target))

(defn web-socket-connection-connect
  "Manually restart the WebSocket connection.\n\nReturns: {void}"
  [^js/ng.WebSocketConnection target]
  (.connect target))

(defn web-transport-connection-close
  "Close the WebTransport session.\n\nParams:\n- closeInfo: {(!Object|undefined)}\n\nReturns: {void}"
  [^js/ng.WebTransportConnection target ^js/Object closeInfo]
  (.close target closeInfo))

(defn web-transport-connection-create-bidirectional-stream
  "Open a reliable bidirectional stream.\n\nReturns: {!Promise<!Object>}"
  ^js/Promise [^js/ng.WebTransportConnection target]
  (.createBidirectionalStream target))

(defn web-transport-connection-send-text
  "Send UTF-8 text as one unreliable datagram.\n\nParams:\n- data: {string}\n\nReturns: {!Promise<void>}"
  ^js/Promise [^js/ng.WebTransportConnection target ^string data]
  (.sendText target data))

(defn worker-connection-restart
  "Public WorkerConnection.restart member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.WorkerConnection target]
  (.restart target))

(defn worker-connection-terminate
  "Public WorkerConnection.terminate member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.WorkerConnection target]
  (.terminate target))

(defn anchor-scroll-provider-auto-scrolling-enabled
  "Public AnchorScrollProvider.autoScrollingEnabled member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AnchorScrollProvider target]
  (.-autoScrollingEnabled target))

(defn anchor-scroll-provider-dollarget
  "Public AnchorScrollProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!ng.LocationService, !ng.Scope): !ng.AnchorScrollService|string)>}"
  ^js/Array [^js/ng.AnchorScrollProvider target]
  (.-$get target))

(defn angular-dollarevent-bus
  "Application-wide event bus, available after bootstrap providers are created.\n\nType: {!ng.PubSubService}"
  ^js/ng.PubSubService [^js/ng.Angular target]
  (.-$eventBus target))

(defn angular-dollarinjector
  "Application injector, available after `bootstrap()` or `injector()` completes.\n\nType: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.Angular target]
  (.-$injector target))

(defn angular-dollarroot-scope
  "Root scope for the bootstrapped application.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Angular target]
  (.-$rootScope target))

(defn angular-dollart
  "Public injection token names keyed by token value.\n\nType: {!ng.InjectionTokens}"
  ^js/ng.InjectionTokens [^js/ng.Angular target]
  (.-$t target))

(defn angular-element-definition-angular
  "AngularTS runtime instance that owns the element injector.\n\nType: {!ng.Angular}"
  ^js/ng.Angular [^js/ng.AngularElementDefinition target]
  (.-angular target))

(defn angular-element-definition-element-module
  "Application module that registered the element.\n\nType: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.AngularElementDefinition target]
  (.-elementModule target))

(defn angular-element-definition-injector
  "Injector used by all instances of this custom element definition.\n\nType: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.AngularElementDefinition target]
  (.-injector target))

(defn angular-element-definition-name
  "Registered custom element tag name.\n\nType: {string}"
  ^string [^js/ng.AngularElementDefinition target]
  (.-name target))

(defn angular-element-definition-ng-module
  "Custom runtime `ng` module.\n\nType: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.AngularElementDefinition target]
  (.-ngModule target))

(defn angular-element-module-options-name
  "Name of the element application module. Defaults to a name derived from the tag.\n\nType: {(string|undefined)}"
  ^string [^js/ng.AngularElementModuleOptions target]
  (.-name target))

(defn angular-element-module-options-requires
  "Additional application modules required by the element module.\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.AngularElementModuleOptions target]
  (.-requires target))

(defn angular-element-options-component
  "App component definition passed to `$webComponent.defineAppComponent`.\n\nType: {!ng.AppComponentOptions<T>}"
  ^js/ng.AppComponentOptions [^js/ng.AngularElementOptions target]
  (.-component target))

(defn angular-element-options-element-module
  "Application module that registers the custom element.\n\nType: {(!ng.AngularElementModuleOptions|undefined)}"
  ^js/ng.AngularElementModuleOptions [^js/ng.AngularElementOptions target]
  (.-elementModule target))

(defn angular-element-options-ng-module
  "Custom runtime `ng` module configuration.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.AngularElementOptions target]
  (.-ngModule target))

(defn angular-element-options-register-builtins
  "Register the configured built-in `ng` module during construction. Custom builds should pass `false` and register their own `ng` module.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.AngularElementOptions target]
  (.-registerBuiltins target))

(defn angular-element-options-subapp
  "Treat this instance as a sub-application.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.AngularElementOptions target]
  (.-subapp target))

(defn angular-service-dollarevent-bus
  "Application-wide event bus, available after bootstrap providers are created.\n\nType: {!ng.PubSubService}"
  ^js/ng.PubSubService [^js/ng.AngularService target]
  (.-$eventBus target))

(defn angular-service-dollarinjector
  "Application injector, available after `bootstrap()` or `injector()` completes.\n\nType: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.AngularService target]
  (.-$injector target))

(defn angular-service-dollarroot-scope
  "Root scope for the bootstrapped application.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.AngularService target]
  (.-$rootScope target))

(defn angular-service-dollart
  "Public injection token names keyed by token value.\n\nType: {!ng.InjectionTokens}"
  ^js/ng.InjectionTokens [^js/ng.AngularService target]
  (.-$t target))

(defn angular-service-subapps
  "Sub-application instances created when multiple `ng-app` roots are initialized.\n\nType: {!Array<!ng.AngularService>}"
  ^js/Array [^js/ng.AngularService target]
  (.-subapps target))

(defn angular-service-version
  "AngularTS version string replaced at build time.\n\nType: {string}"
  ^string [^js/ng.AngularService target]
  (.-version target))

(defn angular-subapps
  "Sub-application instances created when multiple `ng-app` roots are initialized.\n\nType: {!Array<!ng.AngularService>}"
  ^js/Array [^js/ng.Angular target]
  (.-subapps target))

(defn angular-version
  "AngularTS version string replaced at build time.\n\nType: {string}"
  ^string [^js/ng.Angular target]
  (.-version target))

(defn animate-provider-dollarget
  "Public AnimateProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.AnimateProvider target]
  (.-$get target))

(defn animation-context-add-class
  "Public AnimationContext.addClass member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.AnimationContext target]
  (.-addClass target))

(defn animation-context-class-name
  "Public AnimationContext.className member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.AnimationContext target]
  (.-className target))

(defn animation-context-from
  "Public AnimationContext.from member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, (number|string)>|undefined)}"
  ^js/Object [^js/ng.AnimationContext target]
  (.-from target))

(defn animation-context-phase
  "Public AnimationContext.phase member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.AnimationContext target]
  (.-phase target))

(defn animation-context-remove-class
  "Public AnimationContext.removeClass member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.AnimationContext target]
  (.-removeClass target))

(defn animation-context-signal
  "Public AnimationContext.signal member exposed by the AngularTS namespace contract.\n\nType: {!AbortSignal}"
  ^js/AbortSignal [^js/ng.AnimationContext target]
  (.-signal target))

(defn animation-context-to
  "Public AnimationContext.to member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, (number|string)>|undefined)}"
  ^js/Object [^js/ng.AnimationContext target]
  (.-to target))

(defn animation-handle-controller
  "Public AnimationHandle.controller member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.AnimationHandle target]
  (.-controller target))

(defn animation-handle-finished
  "Public AnimationHandle.finished member exposed by the AngularTS namespace contract.\n\nType: {!Promise<undefined>}"
  ^js/Promise [^js/ng.AnimationHandle target]
  (.-finished target))

(defn animation-options-add-class
  "Public AnimationOptions.addClass member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.AnimationOptions target]
  (.-addClass target))

(defn animation-options-animation
  "Public AnimationOptions.animation member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.AnimationOptions target]
  (.-animation target))

(defn animation-options-from
  "Public AnimationOptions.from member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, (number|string)>|undefined)}"
  ^js/Object [^js/ng.AnimationOptions target]
  (.-from target))

(defn animation-options-remove-class
  "Public AnimationOptions.removeClass member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.AnimationOptions target]
  (.-removeClass target))

(defn animation-options-to
  "Public AnimationOptions.to member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, (number|string)>|undefined)}"
  ^js/Object [^js/ng.AnimationOptions target]
  (.-to target))

(defn app-component-options-inputs
  "Declared DOM attributes/properties that sync into the scope.\n\nType: {(!Object<string, (!ng.WebComponentInputConfig|function((?|undefined)): number|function((?|undefined)): string|function((T|undefined)): boolean|function(?): ?)>|undefined)}"
  ^js/Object [^js/ng.AppComponentOptions target]
  (.-inputs target))

(defn app-component-options-isolate
  "Use an isolate child scope instead of inheriting parent properties.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.AppComponentOptions target]
  (.-isolate target))

(defn app-component-options-template
  "Template compiled into the host or shadow root.\n\nType: {(string|undefined)}"
  ^string [^js/ng.AppComponentOptions target]
  (.-template target))

(defn cached-rest-backend-options-cache
  "Async cache store, such as IndexedDB, Cache API, or memory.\n\nType: {!ng.RestCacheStore}"
  ^js/ng.RestCacheStore [^js/ng.CachedRestBackendOptions target]
  (.-cache target))

(defn cached-rest-backend-options-network
  "Backend used for authoritative network responses and writes.\n\nType: {!ng.RestBackend}"
  ^js/ng.RestBackend [^js/ng.CachedRestBackendOptions target]
  (.-network target))

(defn cached-rest-backend-options-strategy
  "Read strategy used for cacheable GET requests.\n\nType: {string}"
  ^string [^js/ng.CachedRestBackendOptions target]
  (.-strategy target))

(defn component-bindings
  "Define DOM attribute binding to component properties. Component properties are always bound to the component controller and not to the scope.\n\nType: {(!Object<string, string>|undefined)}"
  ^js/Object [^js/ng.Component target]
  (.-bindings target))

(defn component-controller-as
  "An identifier name for a reference to the controller. If present, the controller will be published to its scope under the specified name. If not present, this will default to '$ctrl'.\n\nType: {(string|undefined)}"
  ^string [^js/ng.Component target]
  (.-controllerAs target))

(defn component-replace
  "Replaces the generated component host element with the component template.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.Component target]
  (.-replace target))

(defn component-require
  "Requires the controllers of other directives and binds them to this component's controller. The object keys specify the property names under which the required controllers (object values) will be bound. Note that the required controllers will not be available during the instantiation of the controller, but they are guaranteed to be available just before the $onInit method is executed!\n\nType: {(!Object<string, string>|undefined)}"
  ^js/Object [^js/ng.Component target]
  (.-require target))

(defn connection-config-event-types
  "Additional EventSource event names to subscribe to\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.ConnectionConfig target]
  (.-eventTypes target))

(defn connection-config-heartbeat-timeout
  "Timeout in milliseconds to detect heartbeat inactivity\n\nType: {(number|undefined)}"
  ^number [^js/ng.ConnectionConfig target]
  (.-heartbeatTimeout target))

(defn connection-config-max-retries
  "Maximum number of reconnect attempts\n\nType: {(number|undefined)}"
  ^number [^js/ng.ConnectionConfig target]
  (.-maxRetries target))

(defn connection-config-retry-delay
  "Delay between reconnect attempts in milliseconds\n\nType: {(number|undefined)}"
  ^number [^js/ng.ConnectionConfig target]
  (.-retryDelay target))

(defn connection-event-type
  "Public ConnectionEvent.type member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.ConnectionEvent target]
  (.-type target))

(defn controller-name
  "Optional controller name (used in debugging)\n\nType: {(string|undefined)}"
  ^string [^js/ng.Controller target]
  (.-name target))

(defn controller-provider-dollarget
  "Public ControllerProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.ControllerProvider target]
  (.-$get target))

(defn cookie-options-domain
  "Domain scope for the cookie.\n\nType: {(string|undefined)}"
  ^string [^js/ng.CookieOptions target]
  (.-domain target))

(defn cookie-options-path
  "URL path scope for the cookie.\n\nType: {(string|undefined)}"
  ^string [^js/ng.CookieOptions target]
  (.-path target))

(defn cookie-options-samesite
  "SameSite policy applied by the browser.\n\nType: {(string|undefined)}"
  ^string [^js/ng.CookieOptions target]
  (.-samesite target))

(defn cookie-options-secure
  "Restrict the cookie to HTTPS connections.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.CookieOptions target]
  (.-secure target))

(defn cookie-provider-defaults
  "Default cookie attributes merged into each write and remove call.\n\nType: {!ng.CookieOptions}"
  ^js/ng.CookieOptions [^js/ng.CookieProvider target]
  (.-defaults target))

(defn cookie-store-options-cookie
  "Cookie attributes used for writes.\n\nType: {(!ng.CookieOptions|undefined)}"
  ^js/ng.CookieOptions [^js/ng.CookieStoreOptions target]
  (.-cookie target))

(defn directive-controller-as
  "Alias name for the controller in templates\n\nType: {(string|undefined)}"
  ^string [^js/ng.Directive target]
  (.-controllerAs target))

(defn directive-count
  "Currently only used by view directive\n\nType: {(number|undefined)}"
  ^number [^js/ng.Directive target]
  (.-count target))

(defn directive-name
  "Optional name (usually inferred)\n\nType: {(string|undefined)}"
  ^string [^js/ng.Directive target]
  (.-name target))

(defn directive-priority
  "Priority of the directive\n\nType: {(number|undefined)}"
  ^number [^js/ng.Directive target]
  (.-priority target))

(defn directive-replace
  "Replaces the element with the template if true\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.Directive target]
  (.-replace target))

(defn directive-restrict
  "Restrict option: 'A' and/or 'E'. Defaults to 'EA' if not defined\n\nType: {(string|undefined)}"
  ^string [^js/ng.Directive target]
  (.-restrict target))

(defn directive-template-namespace
  "Template namespace (e.g., SVG, HTML)\n\nType: {(string|undefined)}"
  ^string [^js/ng.Directive target]
  (.-templateNamespace target))

(defn directive-terminal
  "Stops further directive processing if true\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.Directive target]
  (.-terminal target))

(defn element-scope-options-isolate
  "Use an isolate child scope.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.ElementScopeOptions target]
  (.-isolate target))

(defn element-scope-options-parent-scope
  "Explicit parent scope. Defaults to nearest inherited DOM scope.\n\nType: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.ElementScopeOptions target]
  (.-parentScope target))

(defn error-handling-config-object-max-depth
  "The max depth for stringifying objects. Setting to a non-positive or non-numeric value removes the max depth limit. Default: 5.\n\nType: {(number|undefined)}"
  ^number [^js/ng.ErrorHandlingConfig target]
  (.-objectMaxDepth target))

(defn event-bus-provider-event-bus
  "Public EventBusProvider.eventBus member exposed by the AngularTS namespace contract.\n\nType: {!ng.PubSubService}"
  ^js/ng.PubSubService [^js/ng.EventBusProvider target]
  (.-eventBus target))

(defn filter-provider-dollarget
  "Public FilterProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.FilterProvider target]
  (.-$get target))

(defn http-provider-defaults
  "Default values applied to all `$http` requests unless a request overrides them.\n\nType: {!ng.HttpProviderDefaults}"
  ^js/ng.HttpProviderDefaults [^js/ng.HttpProvider target]
  (.-defaults target))

(defn http-provider-defaults-headers
  "Default headers merged into each request.\n\nType: {(!Object<string, (!Object<string, (boolean|function(!ng.RequestConfig): ?|null|number|string|undefined)>|boolean|function(!ng.RequestConfig): ?|null|number|string|undefined)>|undefined)}"
  ^js/Object [^js/ng.HttpProviderDefaults target]
  (.-headers target))

(defn http-provider-defaults-with-credentials
  "Whether cross-site requests should include credentials by default.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.HttpProviderDefaults target]
  (.-withCredentials target))

(defn http-provider-defaults-xsrf-cookie-name
  "Cookie name used when reading the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpProviderDefaults target]
  (.-xsrfCookieName target))

(defn http-provider-defaults-xsrf-header-name
  "Header name used when sending the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpProviderDefaults target]
  (.-xsrfHeaderName target))

(defn http-provider-interceptors
  "Interceptor factories applied to requests and responses.\n\nType: {!Array<(!Array<function(): !Object>|function(): !Object|string)>}"
  ^js/Array [^js/ng.HttpProvider target]
  (.-interceptors target))

(defn http-provider-xsrf-trusted-origins
  "Origins trusted to receive the XSRF token.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.HttpProvider target]
  (.-xsrfTrustedOrigins target))

(defn http-response-config
  "Request configuration that produced this response.\n\nType: {!ng.RequestConfig}"
  ^js/ng.RequestConfig [^js/ng.HttpResponse target]
  (.-config target))

(defn http-response-status
  "Numeric HTTP status code. Non-2xx statuses reject the promise.\n\nType: {number}"
  ^number [^js/ng.HttpResponse target]
  (.-status target))

(defn http-response-status-text
  "Native status text such as `OK` or `Not Found`.\n\nType: {string}"
  ^string [^js/ng.HttpResponse target]
  (.-statusText target))

(defn http-response-xhr-status
  "Transport completion status. Useful for distinguishing timeout, abort, and network errors.\n\nType: {string}"
  ^string [^js/ng.HttpResponse target]
  (.-xhrStatus target))

(defn http-service-defaults
  "Runtime defaults shared with `$httpProvider.defaults`.\n\nType: {!ng.HttpProviderDefaults}"
  ^js/ng.HttpProviderDefaults [^js/ng.HttpService target]
  (.-defaults target))

(defn http-service-pending-requests
  "Requests currently in flight.\n\nType: {!Array<!ng.RequestConfig>}"
  ^js/Array [^js/ng.HttpService target]
  (.-pendingRequests target))

(defn injection-tokens-dollaranchor-scroll
  "Public InjectionTokens.$anchorScroll member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$anchorScroll target))

(defn injection-tokens-dollaranchor-scroll-provider
  "Public InjectionTokens.$anchorScrollProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$anchorScrollProvider target))

(defn injection-tokens-dollarangular
  "Public InjectionTokens.$angular member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$angular target))

(defn injection-tokens-dollarangular-provider
  "Public InjectionTokens.$angularProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$angularProvider target))

(defn injection-tokens-dollaranimate
  "Public InjectionTokens.$animate member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$animate target))

(defn injection-tokens-dollaranimate-provider
  "Public InjectionTokens.$animateProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$animateProvider target))

(defn injection-tokens-dollararia
  "Public InjectionTokens.$aria member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$aria target))

(defn injection-tokens-dollararia-provider
  "Public InjectionTokens.$ariaProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$ariaProvider target))

(defn injection-tokens-dollarcompile
  "Public InjectionTokens.$compile member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$compile target))

(defn injection-tokens-dollarcompile-lifecycle
  "Public InjectionTokens.$compileLifecycle member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$compileLifecycle target))

(defn injection-tokens-dollarcompile-provider
  "Public InjectionTokens.$compileProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$compileProvider target))

(defn injection-tokens-dollarcontroller
  "Public InjectionTokens.$controller member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$controller target))

(defn injection-tokens-dollarcontroller-provider
  "Public InjectionTokens.$controllerProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$controllerProvider target))

(defn injection-tokens-dollarcookie
  "Public InjectionTokens.$cookie member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$cookie target))

(defn injection-tokens-dollarcookie-provider
  "Public InjectionTokens.$cookieProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$cookieProvider target))

(defn injection-tokens-dollardocument
  "Public InjectionTokens.$document member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$document target))

(defn injection-tokens-dollarelement
  "Public InjectionTokens.$element member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$element target))

(defn injection-tokens-dollarevent-bus
  "Public InjectionTokens.$eventBus member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$eventBus target))

(defn injection-tokens-dollarevent-bus-provider
  "Public InjectionTokens.$eventBusProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$eventBusProvider target))

(defn injection-tokens-dollarexception-handler
  "Public InjectionTokens.$exceptionHandler member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$exceptionHandler target))

(defn injection-tokens-dollarexception-handler-provider
  "Public InjectionTokens.$exceptionHandlerProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$exceptionHandlerProvider target))

(defn injection-tokens-dollarfilter
  "Public InjectionTokens.$filter member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$filter target))

(defn injection-tokens-dollarfilter-provider
  "Public InjectionTokens.$filterProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$filterProvider target))

(defn injection-tokens-dollarhttp
  "Public InjectionTokens.$http member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$http target))

(defn injection-tokens-dollarhttp-param-serializer
  "Public InjectionTokens.$httpParamSerializer member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$httpParamSerializer target))

(defn injection-tokens-dollarhttp-param-serializer-provider
  "Public InjectionTokens.$httpParamSerializerProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$httpParamSerializerProvider target))

(defn injection-tokens-dollarhttp-provider
  "Public InjectionTokens.$httpProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$httpProvider target))

(defn injection-tokens-dollarinjector
  "Public InjectionTokens.$injector member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$injector target))

(defn injection-tokens-dollarinterpolate
  "Public InjectionTokens.$interpolate member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$interpolate target))

(defn injection-tokens-dollarinterpolate-provider
  "Public InjectionTokens.$interpolateProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$interpolateProvider target))

(defn injection-tokens-dollarlocation
  "Public InjectionTokens.$location member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$location target))

(defn injection-tokens-dollarlocation-provider
  "Public InjectionTokens.$locationProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$locationProvider target))

(defn injection-tokens-dollarlog
  "Public InjectionTokens.$log member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$log target))

(defn injection-tokens-dollarlog-provider
  "Public InjectionTokens.$logProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$logProvider target))

(defn injection-tokens-dollarmachine
  "Public InjectionTokens.$machine member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$machine target))

(defn injection-tokens-dollarmachine-provider
  "Public InjectionTokens.$machineProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$machineProvider target))

(defn injection-tokens-dollarparse
  "Public InjectionTokens.$parse member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$parse target))

(defn injection-tokens-dollarparse-provider
  "Public InjectionTokens.$parseProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$parseProvider target))

(defn injection-tokens-dollarprovide
  "Public InjectionTokens.$provide member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$provide target))

(defn injection-tokens-dollarrest
  "Public InjectionTokens.$rest member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$rest target))

(defn injection-tokens-dollarrest-provider
  "Public InjectionTokens.$restProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$restProvider target))

(defn injection-tokens-dollarroot-element
  "Public InjectionTokens.$rootElement member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$rootElement target))

(defn injection-tokens-dollarroot-scope
  "Public InjectionTokens.$rootScope member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$rootScope target))

(defn injection-tokens-dollarroot-scope-provider
  "Public InjectionTokens.$rootScopeProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$rootScopeProvider target))

(defn injection-tokens-dollarsce
  "Public InjectionTokens.$sce member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$sce target))

(defn injection-tokens-dollarsce-delegate
  "Public InjectionTokens.$sceDelegate member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$sceDelegate target))

(defn injection-tokens-dollarsce-delegate-provider
  "Public InjectionTokens.$sceDelegateProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$sceDelegateProvider target))

(defn injection-tokens-dollarsce-provider
  "Public InjectionTokens.$sceProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$sceProvider target))

(defn injection-tokens-dollarscope
  "Public InjectionTokens.$scope member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$scope target))

(defn injection-tokens-dollarsse
  "Public InjectionTokens.$sse member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$sse target))

(defn injection-tokens-dollarsse-provider
  "Public InjectionTokens.$sseProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$sseProvider target))

(defn injection-tokens-dollarstate
  "Public InjectionTokens.$state member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$state target))

(defn injection-tokens-dollarstate-provider
  "Public InjectionTokens.$stateProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$stateProvider target))

(defn injection-tokens-dollarstate-registry
  "Public InjectionTokens.$stateRegistry member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$stateRegistry target))

(defn injection-tokens-dollarstate-registry-provider
  "Public InjectionTokens.$stateRegistryProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$stateRegistryProvider target))

(defn injection-tokens-dollarstream
  "Public InjectionTokens.$stream member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$stream target))

(defn injection-tokens-dollarstream-provider
  "Public InjectionTokens.$streamProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$streamProvider target))

(defn injection-tokens-dollartemplate-cache
  "Public InjectionTokens.$templateCache member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$templateCache target))

(defn injection-tokens-dollartemplate-cache-provider
  "Public InjectionTokens.$templateCacheProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$templateCacheProvider target))

(defn injection-tokens-dollartemplate-factory
  "Public InjectionTokens.$templateFactory member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$templateFactory target))

(defn injection-tokens-dollartemplate-factory-provider
  "Public InjectionTokens.$templateFactoryProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$templateFactoryProvider target))

(defn injection-tokens-dollartemplate-request
  "Public InjectionTokens.$templateRequest member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$templateRequest target))

(defn injection-tokens-dollartemplate-request-provider
  "Public InjectionTokens.$templateRequestProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$templateRequestProvider target))

(defn injection-tokens-dollartransitions
  "Public InjectionTokens.$transitions member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$transitions target))

(defn injection-tokens-dollartransitions-provider
  "Public InjectionTokens.$transitionsProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$transitionsProvider target))

(defn injection-tokens-dollarview
  "Public InjectionTokens.$view member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$view target))

(defn injection-tokens-dollarview-provider
  "Public InjectionTokens.$viewProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$viewProvider target))

(defn injection-tokens-dollarwasm
  "Public InjectionTokens.$wasm member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$wasm target))

(defn injection-tokens-dollarwasm-provider
  "Public InjectionTokens.$wasmProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$wasmProvider target))

(defn injection-tokens-dollarweb-component
  "Public InjectionTokens.$webComponent member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$webComponent target))

(defn injection-tokens-dollarweb-component-provider
  "Public InjectionTokens.$webComponentProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$webComponentProvider target))

(defn injection-tokens-dollarweb-transport
  "Public InjectionTokens.$webTransport member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$webTransport target))

(defn injection-tokens-dollarweb-transport-provider
  "Public InjectionTokens.$webTransportProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$webTransportProvider target))

(defn injection-tokens-dollarwebsocket
  "Public InjectionTokens.$websocket member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$websocket target))

(defn injection-tokens-dollarwebsocket-provider
  "Public InjectionTokens.$websocketProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$websocketProvider target))

(defn injection-tokens-dollarwindow
  "Public InjectionTokens.$window member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$window target))

(defn injection-tokens-dollarworker
  "Public InjectionTokens.$worker member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$worker target))

(defn injection-tokens-dollarworker-provider
  "Public InjectionTokens.$workerProvider member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InjectionTokens target]
  (.-$workerProvider target))

(defn injector-service-strict-di
  "Public InjectorService.strictDi member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.InjectorService target]
  (.-strictDi target))

(defn interpolate-provider-dollarget
  "Public InterpolateProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.InterpolateProvider target]
  (.-$get target))

(defn interpolate-provider-end-symbol
  "Public InterpolateProvider.endSymbol member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InterpolateProvider target]
  (.-endSymbol target))

(defn interpolate-provider-start-symbol
  "Public InterpolateProvider.startSymbol member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InterpolateProvider target]
  (.-startSymbol target))

(defn interpolation-function-exp
  "Public InterpolationFunction.exp member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InterpolationFunction target]
  (.-exp target))

(defn interpolation-function-expressions
  "Public InterpolationFunction.expressions member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.InterpolationFunction target]
  (.-expressions target))

(defn invocation-detail-expr
  "Public InvocationDetail.expr member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.InvocationDetail target]
  (.-expr target))

(defn invocation-detail-reply
  "Public InvocationDetail.reply member exposed by the AngularTS namespace contract.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.InvocationDetail target]
  (.-reply target))

(defn location-provider-dollarget
  "Public LocationProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!ng.Scope, !HTMLElement, function(?): ?): !ng.LocationService|string)>}"
  ^js/Array [^js/ng.LocationProvider target]
  (.-$get target))

(defn location-provider-hash-prefix-conf
  "Public LocationProvider.hashPrefixConf member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.LocationProvider target]
  (.-hashPrefixConf target))

(defn location-provider-html5-mode-conf
  "Public LocationProvider.html5ModeConf member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.LocationProvider target]
  (.-html5ModeConf target))

(defn location-service-abs-url
  "Public LocationService.absUrl member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.LocationService target]
  (.-absUrl target))

(defn location-service-app-base
  "Public LocationService.appBase member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.LocationService target]
  (.-appBase target))

(defn location-service-app-base-no-file
  "Public LocationService.appBaseNoFile member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.LocationService target]
  (.-appBaseNoFile target))

(defn location-service-base-prefix
  "Public LocationService.basePrefix member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.LocationService target]
  (.-basePrefix target))

(defn location-service-hash-prefix
  "Public LocationService.hashPrefix member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.LocationService target]
  (.-hashPrefix target))

(defn location-service-html5
  "Public LocationService.html5 member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.LocationService target]
  (.-html5 target))

(defn log-provider-debug
  "Public LogProvider.debug member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.LogProvider target]
  (.-debug target))

(defn machine-config-initial
  "Public MachineConfig.initial member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.MachineConfig target]
  (.-initial target))

(defn machine-config-transitions
  "Public MachineConfig.transitions member exposed by the AngularTS namespace contract.\n\nType: {!Object<string, (!Object<string, (function(TData, ?, !ng.Machine<TData>): (boolean|string|undefined)|undefined)>|undefined)>}"
  ^js/Object [^js/ng.MachineConfig target]
  (.-transitions target))

(defn machine-current
  "Public Machine.current member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.Machine target]
  (.-current target))

(defn native-animation-options-add-class
  "Public NativeAnimationOptions.addClass member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.NativeAnimationOptions target]
  (.-addClass target))

(defn native-animation-options-animation
  "Public NativeAnimationOptions.animation member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.NativeAnimationOptions target]
  (.-animation target))

(defn native-animation-options-from
  "Public NativeAnimationOptions.from member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, (number|string)>|undefined)}"
  ^js/Object [^js/ng.NativeAnimationOptions target]
  (.-from target))

(defn native-animation-options-remove-class
  "Public NativeAnimationOptions.removeClass member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.NativeAnimationOptions target]
  (.-removeClass target))

(defn native-animation-options-to
  "Public NativeAnimationOptions.to member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, (number|string)>|undefined)}"
  ^js/Object [^js/ng.NativeAnimationOptions target]
  (.-to target))

(defn ng-model-controller-dollarasync-validators
  "Public NgModelController.$asyncValidators member exposed by the AngularTS namespace contract.\n\nType: {!Object<string, function(?, ?): !Promise<?>>}"
  ^js/Object [^js/ng.NgModelController target]
  (.-$asyncValidators target))

(defn ng-model-controller-dollardirty
  "Public NgModelController.$dirty member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.NgModelController target]
  (.-$dirty target))

(defn ng-model-controller-dollarerror
  "Public NgModelController.$error member exposed by the AngularTS namespace contract.\n\nType: {!Object<string, boolean>}"
  ^js/Object [^js/ng.NgModelController target]
  (.-$error target))

(defn ng-model-controller-dollarformatters
  "Public NgModelController.$formatters member exposed by the AngularTS namespace contract.\n\nType: {!Array<function(?): ?>}"
  ^js/Array [^js/ng.NgModelController target]
  (.-$formatters target))

(defn ng-model-controller-dollarinvalid
  "Public NgModelController.$invalid member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.NgModelController target]
  (.-$invalid target))

(defn ng-model-controller-dollaroptions
  "Public NgModelController.$options member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.NgModelController target]
  (.-$options target))

(defn ng-model-controller-dollarparsers
  "Public NgModelController.$parsers member exposed by the AngularTS namespace contract.\n\nType: {!Array<function(?): ?>}"
  ^js/Array [^js/ng.NgModelController target]
  (.-$parsers target))

(defn ng-model-controller-dollarpending
  "Public NgModelController.$pending member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, boolean>|undefined)}"
  ^js/Object [^js/ng.NgModelController target]
  (.-$pending target))

(defn ng-model-controller-dollarpristine
  "Public NgModelController.$pristine member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.NgModelController target]
  (.-$pristine target))

(defn ng-model-controller-dollartarget
  "Public NgModelController.$target member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.NgModelController target]
  (.-$target target))

(defn ng-model-controller-dollartouched
  "Public NgModelController.$touched member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.NgModelController target]
  (.-$touched target))

(defn ng-model-controller-dollaruntouched
  "Public NgModelController.$untouched member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.NgModelController target]
  (.-$untouched target))

(defn ng-model-controller-dollarvalid
  "Public NgModelController.$valid member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.NgModelController target]
  (.-$valid target))

(defn ng-model-controller-dollarvalidation-message
  "Public NgModelController.$validationMessage member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.NgModelController target]
  (.-$validationMessage target))

(defn ng-model-controller-dollarvalidators
  "Public NgModelController.$validators member exposed by the AngularTS namespace contract.\n\nType: {!Object<string, function(?, ?): ?>}"
  ^js/Object [^js/ng.NgModelController target]
  (.-$validators target))

(defn ng-model-controller-dollarvalidity
  "Public NgModelController.$validity member exposed by the AngularTS namespace contract.\n\nType: {(!Object|null)}"
  ^js/Object [^js/ng.NgModelController target]
  (.-$validity target))

(defn ng-model-controller-dollarview-change-listeners
  "Public NgModelController.$viewChangeListeners member exposed by the AngularTS namespace contract.\n\nType: {!Array<function(): void>}"
  ^js/Array [^js/ng.NgModelController target]
  (.-$viewChangeListeners target))

(defn ng-module-name
  "Public NgModule.name member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.NgModule target]
  (.-name target))

(defn parse-provider-dollarget
  "Public ParseProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.ParseProvider target]
  (.-$get target))

(defn pub-sub-provider-event-bus
  "Public PubSubProvider.eventBus member exposed by the AngularTS namespace contract.\n\nType: {!ng.PubSubService}"
  ^js/ng.PubSubService [^js/ng.PubSubProvider target]
  (.-eventBus target))

(defn realtime-protocol-event-detail-url
  "Public RealtimeProtocolEventDetail.url member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RealtimeProtocolEventDetail target]
  (.-url target))

(defn realtime-protocol-message-swap
  "Optional swap mode that overrides the directive swap mode for this message.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RealtimeProtocolMessage target]
  (.-swap target))

(defn realtime-protocol-message-target
  "Optional CSS selector that overrides the directive target for this message.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RealtimeProtocolMessage target]
  (.-target target))

(defn request-config-event-handlers
  "Event handlers notified by the underlying transport.\n\nType: {(!Object<string, (!Object|function(!Event): void|undefined)>|undefined)}"
  ^js/Object [^js/ng.RequestConfig target]
  (.-eventHandlers target))

(defn request-config-headers
  "Default headers merged into each request.\n\nType: {(!Object<string, (!Object<string, (boolean|function(!ng.RequestConfig): ?|null|number|string|undefined)>|boolean|function(!ng.RequestConfig): ?|null|number|string|undefined)>|undefined)}"
  ^js/Object [^js/ng.RequestConfig target]
  (.-headers target))

(defn request-config-method
  "HTTP verb to use for the request.\n\nType: {string}"
  ^string [^js/ng.RequestConfig target]
  (.-method target))

(defn request-config-params
  "Query parameters appended to the request URL.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.RequestConfig target]
  (.-params target))

(defn request-config-response-type
  "Native fetch response body reader hint.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RequestConfig target]
  (.-responseType target))

(defn request-config-upload-event-handlers
  "Upload event handlers. Not used by the fetch transport.\n\nType: {(!Object<string, (!Object|function(!Event): void|undefined)>|undefined)}"
  ^js/Object [^js/ng.RequestConfig target]
  (.-uploadEventHandlers target))

(defn request-config-url
  "Request URL. Query parameters from `params` are appended to this URL.\n\nType: {string}"
  ^string [^js/ng.RequestConfig target]
  (.-url target))

(defn request-config-with-credentials
  "Whether cross-site requests should include credentials by default.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.RequestConfig target]
  (.-withCredentials target))

(defn request-config-xsrf-cookie-name
  "Cookie name used when reading the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RequestConfig target]
  (.-xsrfCookieName target))

(defn request-config-xsrf-header-name
  "Header name used when sending the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RequestConfig target]
  (.-xsrfHeaderName target))

(defn request-shortcut-config-headers
  "Default headers merged into each request.\n\nType: {(!Object<string, (!Object<string, (boolean|function(!ng.RequestConfig): ?|null|number|string|undefined)>|boolean|function(!ng.RequestConfig): ?|null|number|string|undefined)>|undefined)}"
  ^js/Object [^js/ng.RequestShortcutConfig target]
  (.-headers target))

(defn request-shortcut-config-params
  "Query parameters appended to the request URL.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.RequestShortcutConfig target]
  (.-params target))

(defn request-shortcut-config-response-type
  "Native fetch response body reader hint.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RequestShortcutConfig target]
  (.-responseType target))

(defn request-shortcut-config-with-credentials
  "Whether cross-site requests should include credentials by default.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.RequestShortcutConfig target]
  (.-withCredentials target))

(defn request-shortcut-config-xsrf-cookie-name
  "Cookie name used when reading the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RequestShortcutConfig target]
  (.-xsrfCookieName target))

(defn request-shortcut-config-xsrf-header-name
  "Header name used when sending the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RequestShortcutConfig target]
  (.-xsrfHeaderName target))

(defn rest-definition-name
  "Informational name for the resource definition.\n\nType: {string}"
  ^string [^js/ng.RestDefinition target]
  (.-name target))

(defn rest-definition-options
  "Extra REST options merged into each request for this resource.\n\nType: {(!ng.RestOptions|undefined)}"
  ^js/ng.RestOptions [^js/ng.RestDefinition target]
  (.-options target))

(defn rest-definition-url
  "Base URL or RFC 6570 URI template for the resource.\n\nType: {string}"
  ^string [^js/ng.RestDefinition target]
  (.-url target))

(defn rest-options-backend
  "Optional backend used instead of the default HTTP backend.\n\nType: {(!ng.RestBackend|undefined)}"
  ^js/ng.RestBackend [^js/ng.RestOptions target]
  (.-backend target))

(defn rest-provider-dollarget
  "Public RestProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.RestProvider target]
  (.-$get target))

(defn rest-request-collection-url
  "Collection URL used for broad cache invalidation.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RestRequest target]
  (.-collectionUrl target))

(defn rest-request-method
  "Resource operation method.\n\nType: {string}"
  ^string [^js/ng.RestRequest target]
  (.-method target))

(defn rest-request-options
  "Backend-specific request options.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.RestRequest target]
  (.-options target))

(defn rest-request-params
  "URI template and query parameters.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.RestRequest target]
  (.-params target))

(defn rest-request-url
  "Expanded request URL.\n\nType: {string}"
  ^string [^js/ng.RestRequest target]
  (.-url target))

(defn rest-response-config
  "Request configuration that produced this response.\n\nType: {(!ng.RequestConfig|undefined)}"
  ^js/ng.RequestConfig [^js/ng.RestResponse target]
  (.-config target))

(defn rest-response-source
  "Backend that produced the response.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RestResponse target]
  (.-source target))

(defn rest-response-stale
  "Whether the returned cached value may be older than the remote source.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.RestResponse target]
  (.-stale target))

(defn rest-response-status
  "Numeric HTTP status code. Non-2xx statuses reject the promise.\n\nType: {(number|undefined)}"
  ^number [^js/ng.RestResponse target]
  (.-status target))

(defn rest-response-status-text
  "Native status text such as `OK` or `Not Found`.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RestResponse target]
  (.-statusText target))

(defn rest-response-xhr-status
  "Transport completion status. Useful for distinguishing timeout, abort, and network errors.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RestResponse target]
  (.-xhrStatus target))

(defn rest-revalidate-event-key
  "Cache key that was refreshed.\n\nType: {string}"
  ^string [^js/ng.RestRevalidateEvent target]
  (.-key target))

(defn rest-revalidate-event-request
  "Original request.\n\nType: {!ng.RestRequest}"
  ^js/ng.RestRequest [^js/ng.RestRevalidateEvent target]
  (.-request target))

(defn rest-revalidate-event-response
  "Fresh network response.\n\nType: {!ng.RestResponse<T>}"
  ^js/ng.RestResponse [^js/ng.RestRevalidateEvent target]
  (.-response target))

(defn root-scope-provider-dollarget
  "Public RootScopeProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.RootScopeProvider target]
  (.-$get target))

(defn root-scope-service-dollarid
  "Public RootScopeService.$id member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.RootScopeService target]
  (.-$id target))

(defn root-scope-service-dollarparent
  "Public RootScopeService.$parent member exposed by the AngularTS namespace contract.\n\nType: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.RootScopeService target]
  (.-$parent target))

(defn root-scope-service-dollarproxy
  "Public RootScopeService.$proxy member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.RootScopeService target]
  (.-$proxy target))

(defn root-scope-service-dollarroot
  "Public RootScopeService.$root member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.RootScopeService target]
  (.-$root target))

(defn root-scope-service-dollarscopename
  "Public RootScopeService.$scopename member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RootScopeService target]
  (.-$scopename target))

(defn root-scope-service-dollartarget
  "Public RootScopeService.$target member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.RootScopeService target]
  (.-$target target))

(defn router-provider-dollarget
  "Public RouterProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!ng.LocationService, !ng.InjectorService): !ng.RouterProvider|string)>}"
  ^js/Array [^js/ng.RouterProvider target]
  (.-$get target))

(defn sce-delegate-provider-dollarget
  "Public SceDelegateProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.SceDelegateProvider target]
  (.-$get target))

(defn scope-dollarid
  "Public Scope.$id member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.Scope target]
  (.-$id target))

(defn scope-dollarparent
  "Public Scope.$parent member exposed by the AngularTS namespace contract.\n\nType: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.Scope target]
  (.-$parent target))

(defn scope-dollarproxy
  "Public Scope.$proxy member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Scope target]
  (.-$proxy target))

(defn scope-dollarroot
  "Public Scope.$root member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Scope target]
  (.-$root target))

(defn scope-dollarscopename
  "Public Scope.$scopename member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.Scope target]
  (.-$scopename target))

(defn scope-dollartarget
  "Public Scope.$target member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.Scope target]
  (.-$target target))

(defn scope-element-constructor-inputs
  "Declared DOM attributes/properties that sync into the scope.\n\nType: {(!Object<string, (!ng.WebComponentInputConfig|function((?|undefined)): number|function((?|undefined)): string|function((T|undefined)): boolean|function(?): ?)>|undefined)}"
  ^js/Object [^js/ng.ScopeElementConstructor target]
  (.-inputs target))

(defn scope-element-constructor-isolate
  "Use an isolate child scope instead of inheriting parent properties.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.ScopeElementConstructor target]
  (.-isolate target))

(defn scope-element-constructor-template
  "Template compiled into the host or shadow root.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ScopeElementConstructor target]
  (.-template target))

(defn scope-element-injector
  "Injector used by the AngularTS app that registered this element.\n\nType: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.ScopeElement target]
  (.-injector target))

(defn scope-element-scope
  "Scope owned by this custom element instance.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.ScopeElement target]
  (.-scope target))

(defn scope-event-default-prevented
  "Public ScopeEvent.defaultPrevented member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.ScopeEvent target]
  (.-defaultPrevented target))

(defn scope-event-name
  "Public ScopeEvent.name member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.ScopeEvent target]
  (.-name target))

(defn scope-event-stopped
  "Public ScopeEvent.stopped member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.ScopeEvent target]
  (.-stopped target))

(defn scope-service-dollarid
  "Public ScopeService.$id member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.ScopeService target]
  (.-$id target))

(defn scope-service-dollarparent
  "Public ScopeService.$parent member exposed by the AngularTS namespace contract.\n\nType: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.ScopeService target]
  (.-$parent target))

(defn scope-service-dollarproxy
  "Public ScopeService.$proxy member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.ScopeService target]
  (.-$proxy target))

(defn scope-service-dollarroot
  "Public ScopeService.$root member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.ScopeService target]
  (.-$root target))

(defn scope-service-dollarscopename
  "Public ScopeService.$scopename member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ScopeService target]
  (.-$scopename target))

(defn scope-service-dollartarget
  "Public ScopeService.$target member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.ScopeService target]
  (.-$target target))

(defn service-provider-dollarget
  "Public ServiceProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!ng.Injectable}"
  ^js/ng.Injectable [^js/ng.ServiceProvider target]
  (.-$get target))

(defn sse-config-event-types
  "Additional EventSource event names to subscribe to\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.SseConfig target]
  (.-eventTypes target))

(defn sse-config-headers
  "Custom headers (EventSource doesn't natively support headers)\n\nType: {(!Object<string, string>|undefined)}"
  ^js/Object [^js/ng.SseConfig target]
  (.-headers target))

(defn sse-config-heartbeat-timeout
  "Timeout in milliseconds to detect heartbeat inactivity\n\nType: {(number|undefined)}"
  ^number [^js/ng.SseConfig target]
  (.-heartbeatTimeout target))

(defn sse-config-max-retries
  "Maximum number of reconnect attempts\n\nType: {(number|undefined)}"
  ^number [^js/ng.SseConfig target]
  (.-maxRetries target))

(defn sse-config-params
  "Optional query parameters appended to the URL\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.SseConfig target]
  (.-params target))

(defn sse-config-retry-delay
  "Delay between reconnect attempts in milliseconds\n\nType: {(number|undefined)}"
  ^number [^js/ng.SseConfig target]
  (.-retryDelay target))

(defn sse-config-with-credentials
  "Include cookies/credentials when connecting\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.SseConfig target]
  (.-withCredentials target))

(defn sse-protocol-event-detail-source
  "Public SseProtocolEventDetail.source member exposed by the AngularTS namespace contract.\n\nType: {(!ng.SseConnection|undefined)}"
  ^js/ng.SseConnection [^js/ng.SseProtocolEventDetail target]
  (.-source target))

(defn sse-protocol-event-detail-url
  "Public SseProtocolEventDetail.url member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.SseProtocolEventDetail target]
  (.-url target))

(defn sse-protocol-message-swap
  "Optional swap mode that overrides the directive swap mode for this message.\n\nType: {(string|undefined)}"
  ^string [^js/ng.SseProtocolMessage target]
  (.-swap target))

(defn sse-protocol-message-target
  "Optional CSS selector that overrides the directive target for this message.\n\nType: {(string|undefined)}"
  ^string [^js/ng.SseProtocolMessage target]
  (.-target target))

(defn sse-provider-defaults
  "Public SseProvider.defaults member exposed by the AngularTS namespace contract.\n\nType: {!ng.SseConfig}"
  ^js/ng.SseConfig [^js/ng.SseProvider target]
  (.-defaults target))

(defn sse-provider-dollarget
  "Returns the `$sse` connection factory bound to the configured defaults.\n\nType: {!Array<(function(!ng.LogService): function(string, (!ng.SseConfig|undefined)): !ng.SseConnection|string)>}"
  ^js/Array [^js/ng.SseProvider target]
  (.-$get target))

(defn state-declaration-abstract
  "Abstract state indicator An abstract state can never be directly activated. Use an abstract state to provide inherited properties (url, resolve, data, etc) to children states.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.StateDeclaration target]
  (.-abstract target))

(defn state-declaration-bindings
  "An object which maps `resolve`s to [[component]] `bindings`. When using a [[component]] declaration (`component: 'myComponent'`), each input binding for the component is supplied data from a resolve of the same name, by default. You may supply data from a different resolve name by mapping it here. Each key in this object is the name of one of the component's input bindings. Each value is the name of the resolve that should be provided to that binding. Any component bindings that are omitted from this map get the default behavior of mapping to a resolve of the same name. #### Example: ```js $stateProvider.state('foo', { resolve: { foo: function(FooService) { return FooService.get(); }, bar: function(BarService) { return BarService.get(); } }, component: 'Baz', // The component's `baz` binding gets data from the `bar` resolve // The component's `foo` binding gets data from the `foo` resolve (default behavior) bindings: { baz: 'bar' } }); app.component('Baz', { templateUrl: 'baz.html', controller: 'BazController', bindings: { foo: '<', // foo binding baz: '<' // baz binding } }); ```\n\nType: {(!Object<string, string>|undefined)}"
  ^js/Object [^js/ng.StateDeclaration target]
  (.-bindings target))

(defn state-declaration-dynamic
  "Marks all the state's parameters as `dynamic`. All parameters on the state will use this value for `dynamic` as a default. Individual parameters may override this default using [[ParamDeclaration.dynamic]] in the [[params]] block. This default applies to all parameters declared on this state.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.StateDeclaration target]
  (.-dynamic target))

(defn state-declaration-name
  "The state name (required) A unique state name, e.g. `\"home\"`, `\"about\"`, `\"contacts\"`. To create a parent/child state use a dot, e.g. `\"about.sales\"`, `\"home.newest\"`. Note: [State] objects require unique names. The name is used like an id.\n\nType: {string}"
  ^string [^js/ng.StateDeclaration target]
  (.-name target))

(defn state-declaration-params
  "Params configuration An object which optionally configures parameters declared in the url, or defines additional non-url parameters. For each parameter being configured, add a [[ParamDeclaration]] keyed to the name of the parameter. #### Example: ```js params: { param1: { type: \"int\", array: true, value: [] }, param2: { value: \"index\" } } ```\n\nType: {(!Object<string, !Object>|undefined)}"
  ^js/Object [^js/ng.StateDeclaration target]
  (.-params target))

(defn state-declaration-url
  "The url fragment for the state A URL fragment (with optional parameters) which is used to match the browser location with this state. This fragment will be appended to the parent state's URL in order to build up the overall URL for this state. It may include path parameters, typed parameters, and query parameters.\n\nType: {(string|undefined)}"
  ^string [^js/ng.StateDeclaration target]
  (.-url target))

(defn state-declaration-views
  "Named view declarations for this state. Each key targets an `ng-view`; each value is either a full view declaration or a string shorthand for `{ component: \"componentName\" }`. Examples: ```js views: { mymessages: \"mymessages\", messagelist: { component: \"messageList\" }, \"^.^.messagecontent\": \"message\" } ```\n\nType: {(!Object<string, (!Object|string)>|undefined)}"
  ^js/Object [^js/ng.StateDeclaration target]
  (.-views target))

(defn state-provider-current
  "The current [[StateDeclaration]]\n\nType: {(!ng.StateDeclaration|undefined)}"
  ^js/ng.StateDeclaration [^js/ng.StateProvider target]
  (.-current target))

(defn state-provider-dollarcurrent
  "The current [[StateObject]] (an internal API)\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.StateProvider target]
  (.-$current target))

(defn state-provider-dollarget
  "Public StateProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!ng.InjectorService, !ng.StateRegistryProvider, !ng.RouterProvider, !ng.Scope, !ng.ViewService): !ng.StateProvider|string)>}"
  ^js/Array [^js/ng.StateProvider target]
  (.-$get target))

(defn state-provider-params
  "The latest successful state parameters\n\nType: {!Object<string, ?>}"
  ^js/Object [^js/ng.StateProvider target]
  (.-params target))

(defn state-registry-provider-dollarget
  "Public StateRegistryProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!ng.InjectorService): !ng.StateRegistryProvider|string)>}"
  ^js/Array [^js/ng.StateRegistryProvider target]
  (.-$get target))

(defn state-registry-service-dollarget
  "Public StateRegistryService.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!ng.InjectorService): !ng.StateRegistryProvider|string)>}"
  ^js/Array [^js/ng.StateRegistryService target]
  (.-$get target))

(defn state-service-current
  "The current [[StateDeclaration]]\n\nType: {(!ng.StateDeclaration|undefined)}"
  ^js/ng.StateDeclaration [^js/ng.StateService target]
  (.-current target))

(defn state-service-dollarcurrent
  "The current [[StateObject]] (an internal API)\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.StateService target]
  (.-$current target))

(defn state-service-dollarget
  "Public StateService.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!ng.InjectorService, !ng.StateRegistryProvider, !ng.RouterProvider, !ng.Scope, !ng.ViewService): !ng.StateProvider|string)>}"
  ^js/Array [^js/ng.StateService target]
  (.-$get target))

(defn state-service-params
  "The latest successful state parameters\n\nType: {!Object<string, ?>}"
  ^js/Object [^js/ng.StateService target]
  (.-params target))

(defn template-cache-provider-cache
  "Public TemplateCacheProvider.cache member exposed by the AngularTS namespace contract.\n\nType: {!Map<string, string>}"
  ^js/Map [^js/ng.TemplateCacheProvider target]
  (.-cache target))

(defn template-factory-provider-dollarget
  "Wires template request and injector services into the factory.\n\nType: {!Array<(function(function(string): !Promise<string>, !ng.InjectorService): !ng.TemplateFactoryProvider|string)>}"
  ^js/Array [^js/ng.TemplateFactoryProvider target]
  (.-$get target))

(defn template-factory-service-dollarget
  "Wires template request and injector services into the factory.\n\nType: {!Array<(function(function(string): !Promise<string>, !ng.InjectorService): !ng.TemplateFactoryProvider|string)>}"
  ^js/Array [^js/ng.TemplateFactoryService target]
  (.-$get target))

(defn template-request-provider-dollarget
  "Public TemplateRequestProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!Map<string, string>, !ng.HttpService): function(string): !Promise<string>|string)>}"
  ^js/Array [^js/ng.TemplateRequestProvider target]
  (.-$get target))

(defn template-request-provider-http-options
  "Optional `$http.get()` config applied to every template request. This is merged on top of the default template request config: - `cache: $templateCache` - `transformResponse`: with `defaultHttpResponseTransform` removed Use this to set template-specific defaults such as custom headers, timeouts, credentials, etc.\n\nType: {!ng.RequestShortcutConfig}"
  ^js/ng.RequestShortcutConfig [^js/ng.TemplateRequestProvider target]
  (.-httpOptions target))

(defn transition-dollarid
  "Public Transition.$id member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.Transition target]
  (.-$id target))

(defn transition-promise
  "Public Transition.promise member exposed by the AngularTS namespace contract.\n\nType: {!Promise<!ng.StateDeclaration>}"
  ^js/Promise [^js/ng.Transition target]
  (.-promise target))

(defn transition-success
  "Public Transition.success member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.Transition target]
  (.-success target))

(defn view-provider-dollarget
  "Returns the singleton view service instance.\n\nType: {!Array<(function(!ng.TemplateFactoryProvider, !ng.RouterProvider, !ng.CompileLifecycleProvider, !Object, function((!Element|!Node|!Object|null|string), (!ng.PublicLinkFn|!ng.TranscludeFn|null|undefined), (number|undefined), (string|undefined), (!Object|null|undefined)): !ng.PublicLinkFn, function((!Array<(function(...?): !Object|function(...?): (!Object|undefined))>|function(...?): (!Object|undefined)|function(new: Object, ...?)|string), (!Object|undefined), (boolean|undefined), (string|undefined)): ?, !ng.InjectorService): !ng.ViewService|string)>}"
  ^js/Array [^js/ng.ViewProvider target]
  (.-$get target))

(defn view-service-dollarget
  "Returns the singleton view service instance.\n\nType: {!Array<(function(!ng.TemplateFactoryProvider, !ng.RouterProvider, !ng.CompileLifecycleProvider, !Object, function((!Element|!Node|!Object|null|string), (!ng.PublicLinkFn|!ng.TranscludeFn|null|undefined), (number|undefined), (string|undefined), (!Object|null|undefined)): !ng.PublicLinkFn, function((!Array<(function(...?): !Object|function(...?): (!Object|undefined))>|function(...?): (!Object|undefined)|function(new: Object, ...?)|string), (!Object|undefined), (boolean|undefined), (string|undefined)): ?, !ng.InjectorService): !ng.ViewService|string)>}"
  ^js/Array [^js/ng.ViewService target]
  (.-$get target))

(defn wasm-abi-exports-memory
  "Linear memory used for ABI string and JSON payload exchange.\n\nType: {!Object}"
  ^js/Object [^js/ng.WasmAbiExports target]
  (.-memory target))

(defn wasm-instantiation-result-exports
  "Public WasmInstantiationResult.exports member exposed by the AngularTS namespace contract.\n\nType: {!Object<string, !Object>}"
  ^js/Object [^js/ng.WasmInstantiationResult target]
  (.-exports target))

(defn wasm-instantiation-result-instance
  "Public WasmInstantiationResult.instance member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.WasmInstantiationResult target]
  (.-instance target))

(defn wasm-instantiation-result-module
  "Public WasmInstantiationResult.module member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.WasmInstantiationResult target]
  (.-module target))

(defn wasm-options-raw
  "When `false`, `$wasm` resolves to `instance.exports`. When `true`, `$wasm` resolves to the full instantiation result.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WasmOptions target]
  (.-raw target))

(defn wasm-scope-abi
  "Host ABI that owns this handle.\n\nType: {!ng.WasmScopeAbi}"
  ^js/ng.WasmScopeAbi [^js/ng.WasmScope target]
  (.-abi target))

(defn wasm-scope-abi-import-object-angular-ts
  "AngularTS scope ABI import namespace.\n\nType: {!ng.WasmScopeAbiImports}"
  ^js/ng.WasmScopeAbiImports [^js/ng.WasmScopeAbiImportObject target]
  (.-angular_ts target))

(defn wasm-scope-abi-imports
  "Import object passed to `WebAssembly.instantiate`.\n\nType: {!ng.WasmScopeAbiImportObject}"
  ^js/ng.WasmScopeAbiImportObject [^js/ng.WasmScopeAbi target]
  (.-imports target))

(defn wasm-scope-binding-options-initial
  "Emit the current value immediately when registering each watched path.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WasmScopeBindingOptions target]
  (.-initial target))

(defn wasm-scope-binding-options-name
  "Stable name exposed to Wasm clients. Defaults to `$scopename` or `$id`.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WasmScopeBindingOptions target]
  (.-name target))

(defn wasm-scope-binding-options-watch
  "Scope paths that should emit `ng_scope_on_update` callbacks.\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.WasmScopeBindingOptions target]
  (.-watch target))

(defn wasm-scope-handle
  "Numeric host handle passed to Wasm clients.\n\nType: {number}"
  ^number [^js/ng.WasmScope target]
  (.-handle target))

(defn wasm-scope-name
  "Stable scope name exposed over the ABI.\n\nType: {string}"
  ^string [^js/ng.WasmScope target]
  (.-name target))

(defn wasm-scope-options-name
  "Stable name exposed to Wasm clients. Defaults to `$scopename` or `$id`.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WasmScopeOptions target]
  (.-name target))

(defn wasm-scope-scope
  "Wrapped AngularTS scope.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.WasmScope target]
  (.-scope target))

(defn wasm-scope-update-path
  "Watched path that changed.\n\nType: {string}"
  ^string [^js/ng.WasmScopeUpdate target]
  (.-path target))

(defn wasm-scope-update-scope-handle
  "Host-side numeric scope handle.\n\nType: {number}"
  ^number [^js/ng.WasmScopeUpdate target]
  (.-scopeHandle target))

(defn wasm-scope-update-scope-name
  "Stable scope name.\n\nType: {string}"
  ^string [^js/ng.WasmScopeUpdate target]
  (.-scopeName target))

(defn wasm-scope-watch-options-initial
  "Emit the current value immediately. Defaults to `false`.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WasmScopeWatchOptions target]
  (.-initial target))

(defn web-component-context-host
  "Custom element host.\n\nType: {!HTMLElement}"
  ^js/HTMLElement [^js/ng.WebComponentContext target]
  (.-host target))

(defn web-component-context-injector
  "Injector used by the AngularTS app that registered the element.\n\nType: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.WebComponentContext target]
  (.-injector target))

(defn web-component-context-scope
  "Scope owned by the custom element.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.WebComponentContext target]
  (.-scope target))

(defn web-component-context-shadow-root
  "Shadow root when `shadow` is enabled.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.WebComponentContext target]
  (.-shadowRoot target))

(defn web-component-input-config-attribute
  "Attribute name. Defaults to the kebab-case property name.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WebComponentInputConfig target]
  (.-attribute target))

(defn web-component-input-config-reflect
  "Reflect property writes back to the DOM attribute.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WebComponentInputConfig target]
  (.-reflect target))

(defn web-component-provider-defaults
  "Default options merged into every app component definition.\n\nType: {!Object}"
  ^js/Object [^js/ng.WebComponentProvider target]
  (.-defaults target))

(defn web-component-provider-dollarget
  "Public WebComponentProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!ng.InjectorService, !ng.Scope, function((!Element|!Node|!Object|null|string), (!ng.PublicLinkFn|!ng.TranscludeFn|null|undefined), (number|undefined), (string|undefined), (!Object|null|undefined)): !ng.PublicLinkFn): !ng.WebComponentService|string)>}"
  ^js/Array [^js/ng.WebComponentProvider target]
  (.-$get target))

(defn web-socket-config-event-types
  "Additional EventSource event names to subscribe to\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.WebSocketConfig target]
  (.-eventTypes target))

(defn web-socket-config-heartbeat-timeout
  "Timeout in milliseconds to detect heartbeat inactivity\n\nType: {(number|undefined)}"
  ^number [^js/ng.WebSocketConfig target]
  (.-heartbeatTimeout target))

(defn web-socket-config-max-retries
  "Maximum number of reconnect attempts\n\nType: {(number|undefined)}"
  ^number [^js/ng.WebSocketConfig target]
  (.-maxRetries target))

(defn web-socket-config-protocols
  "Optional WebSocket subprotocols\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.WebSocketConfig target]
  (.-protocols target))

(defn web-socket-config-retry-delay
  "Delay between reconnect attempts in milliseconds\n\nType: {(number|undefined)}"
  ^number [^js/ng.WebSocketConfig target]
  (.-retryDelay target))

(defn web-socket-provider-defaults
  "Public WebSocketProvider.defaults member exposed by the AngularTS namespace contract.\n\nType: {!ng.WebSocketConfig}"
  ^js/ng.WebSocketConfig [^js/ng.WebSocketProvider target]
  (.-defaults target))

(defn web-socket-provider-dollarget
  "Returns the `$websocket` connection factory bound to the configured defaults.\n\nType: {!Array<(function(!ng.LogService): function(string, (!Array<string>|undefined), (!ng.WebSocketConfig|undefined)): !ng.WebSocketConnection|string)>}"
  ^js/Array [^js/ng.WebSocketProvider target]
  (.-$get target))

(defn web-transport-certificate-hash-algorithm
  "Public WebTransportCertificateHash.algorithm member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WebTransportCertificateHash target]
  (.-algorithm target))

(defn web-transport-certificate-hash-value
  "Public WebTransportCertificateHash.value member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.WebTransportCertificateHash target]
  (.-value target))

(defn web-transport-config-allow-pooling
  "Public WebTransportConfig.allowPooling member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WebTransportConfig target]
  (.-allowPooling target))

(defn web-transport-config-congestion-control
  "Public WebTransportConfig.congestionControl member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WebTransportConfig target]
  (.-congestionControl target))

(defn web-transport-config-max-retries
  "Maximum reconnect attempts before `closed` settles. Defaults to no limit.\n\nType: {(number|undefined)}"
  ^number [^js/ng.WebTransportConfig target]
  (.-maxRetries target))

(defn web-transport-config-reconnect
  "Reopen the native WebTransport session when it closes unexpectedly.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WebTransportConfig target]
  (.-reconnect target))

(defn web-transport-config-require-unreliable
  "Public WebTransportConfig.requireUnreliable member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WebTransportConfig target]
  (.-requireUnreliable target))

(defn web-transport-config-server-certificate-hashes
  "Public WebTransportConfig.serverCertificateHashes member exposed by the AngularTS namespace contract.\n\nType: {(!Array<!ng.WebTransportCertificateHash>|undefined)}"
  ^js/Array [^js/ng.WebTransportConfig target]
  (.-serverCertificateHashes target))

(defn web-transport-connection-closed
  "Resolves or rejects when the managed connection closes permanently.\n\nType: {!Promise<void>}"
  ^js/Promise [^js/ng.WebTransportConnection target]
  (.-closed target))

(defn web-transport-connection-ready
  "Resolves after the current native WebTransport session is ready.\n\nType: {!Promise<!ng.WebTransportConnection>}"
  ^js/Promise [^js/ng.WebTransportConnection target]
  (.-ready target))

(defn web-transport-connection-transport
  "Current browser-native WebTransport instance. Replaced after reconnects.\n\nType: {!ng.NativeWebTransport}"
  ^js/ng.NativeWebTransport [^js/ng.WebTransportConnection target]
  (.-transport target))

(defn web-transport-datagram-event-data
  "Raw bytes received from the browser WebTransport datagram stream.\n\nType: {!Object}"
  ^js/Object [^js/ng.WebTransportDatagramEvent target]
  (.-data target))

(defn web-transport-options-allow-pooling
  "Public WebTransportOptions.allowPooling member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WebTransportOptions target]
  (.-allowPooling target))

(defn web-transport-options-congestion-control
  "Public WebTransportOptions.congestionControl member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WebTransportOptions target]
  (.-congestionControl target))

(defn web-transport-options-require-unreliable
  "Public WebTransportOptions.requireUnreliable member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WebTransportOptions target]
  (.-requireUnreliable target))

(defn web-transport-options-server-certificate-hashes
  "Public WebTransportOptions.serverCertificateHashes member exposed by the AngularTS namespace contract.\n\nType: {(!Array<!ng.WebTransportCertificateHash>|undefined)}"
  ^js/Array [^js/ng.WebTransportOptions target]
  (.-serverCertificateHashes target))

(defn web-transport-provider-defaults
  "Default options merged into every `$webTransport` call.\n\nType: {!ng.WebTransportConfig}"
  ^js/ng.WebTransportConfig [^js/ng.WebTransportProvider target]
  (.-defaults target))

(defn web-transport-provider-dollarget
  "Returns a factory that opens browser-native WebTransport sessions.\n\nType: {!Array<(function(!ng.LogService): function(string, (!ng.WebTransportConfig|undefined)): !ng.WebTransportConnection|string)>}"
  ^js/Array [^js/ng.WebTransportProvider target]
  (.-$get target))

(defn web-transport-reconnect-event-attempt
  "One-based reconnect attempt count for this connection.\n\nType: {number}"
  ^number [^js/ng.WebTransportReconnectEvent target]
  (.-attempt target))

(defn web-transport-reconnect-event-connection
  "Stable managed connection whose native `transport` was reopened.\n\nType: {!ng.WebTransportConnection}"
  ^js/ng.WebTransportConnection [^js/ng.WebTransportReconnectEvent target]
  (.-connection target))

(defn web-transport-reconnect-event-url
  "URL used to open the replacement WebTransport session.\n\nType: {string}"
  ^string [^js/ng.WebTransportReconnectEvent target]
  (.-url target))

(defn worker-config-auto-restart
  "Public WorkerConfig.autoRestart member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WorkerConfig target]
  (.-autoRestart target))

(defn worker-config-auto-terminate
  "Public WorkerConfig.autoTerminate member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WorkerConfig target]
  (.-autoTerminate target))

(defn worker-config-logger
  "Public WorkerConfig.logger member exposed by the AngularTS namespace contract.\n\nType: {(!ng.LogService|undefined)}"
  ^js/ng.LogService [^js/ng.WorkerConfig target]
  (.-logger target))

(defn worker-connection-config
  "Public WorkerConnection.config member exposed by the AngularTS namespace contract.\n\nType: {!ng.WorkerConfig}"
  ^js/ng.WorkerConfig [^js/ng.WorkerConnection target]
  (.-config target))

(defn worker-provider-dollarget
  "Public WorkerProvider.$get member exposed by the AngularTS namespace contract.\n\nType: {!Array<(function(!ng.LogService, function(?): ?): function((!Object|string), (!ng.WorkerConfig|undefined)): !ng.WorkerConnection|string)>}"
  ^js/Array [^js/ng.WorkerProvider target]
  (.-$get target))

(defn module
  "Retrieve or create an AngularTS module."
  (^js/ng.NgModule [^string name]
   (.module angular name))
  (^js/ng.NgModule [^string name ^js/Array requires]
   (.module angular name requires)))

(defn controller
  "Strict convenience wrapper for ng.NgModule.prototype.controller."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^js/ng.Injectable ctl-fn]
  (ng-module-controller ng-module name ctl-fn))

(defn directive
  "Strict convenience wrapper for ng.NgModule.prototype.directive."
  ^js/ng.NgModule [^js/ng.NgModule ng-module ^string name ^js/ng.DirectiveFactory directive-factory]
  (ng-module-directive ng-module name directive-factory))

(defn publish
  "Strict convenience wrapper for ng.PubSubService.prototype.publish."
  (^boolean [^js/ng.PubSubService event-bus ^string topic]
   (pub-sub-service-publish event-bus topic))
  (^boolean [^js/ng.PubSubService event-bus ^string topic value]
   (pub-sub-service-publish event-bus topic value))
  (^boolean [^js/ng.PubSubService event-bus ^string topic value extra]
   (pub-sub-service-publish event-bus topic value extra)))
