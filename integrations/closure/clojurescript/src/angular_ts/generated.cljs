;; Generated from ../externs/angular-ts.externs.js by scripts/generate-cljs-types.mjs.
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
    "js/ng.AriaService"
    "js/ng.Attributes"
    "js/ng.BoundTranscludeFn"
    "js/ng.CachedRestBackendOptions"
    "js/ng.CompileService"
    "js/ng.Component"
    "js/ng.ConnectionConfig"
    "js/ng.ConnectionEvent"
    "js/ng.Controller"
    "js/ng.ControllerConstructor"
    "js/ng.ControllerService"
    "js/ng.CookieOptions"
    "js/ng.CookieService"
    "js/ng.CookieStoreOptions"
    "js/ng.CurrencyFilterOptions"
    "js/ng.DateFilterFormat"
    "js/ng.DateFilterOptions"
    "js/ng.Directive"
    "js/ng.DirectiveFactory"
    "js/ng.DocumentService"
    "js/ng.ElementScopeOptions"
    "js/ng.EntityClass"
    "js/ng.EntryFilterItem"
    "js/ng.ErrorHandlingConfig"
    "js/ng.ExceptionHandlerProvider"
    "js/ng.ExceptionHandlerService"
    "js/ng.Expression"
    "js/ng.FilterFactory"
    "js/ng.FilterFn"
    "js/ng.FilterProvider"
    "js/ng.FilterService"
    "js/ng.HttpMethod"
    "js/ng.HttpParamSerializerProvider"
    "js/ng.HttpParamSerializerSerService"
    "js/ng.HttpPromise"
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
    "js/ng.LogService"
    "js/ng.NativeAnimationOptions"
    "js/ng.NativeWebTransport"
    "js/ng.NgModelController"
    "js/ng.NgModule"
    "js/ng.NumberFilterOptions"
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
    "js/ng.RestRequest"
    "js/ng.RestResponse"
    "js/ng.RestRevalidateEvent"
    "js/ng.RestService"
    "js/ng.RootElementService"
    "js/ng.RootScopeService"
    "js/ng.SceDelegateProvider"
    "js/ng.SceDelegateService"
    "js/ng.SceProvider"
    "js/ng.SceService"
    "js/ng.Scope"
    "js/ng.ScopeEvent"
    "js/ng.ServiceProvider"
    "js/ng.SseConfig"
    "js/ng.SseConnection"
    "js/ng.SseProtocolEventDetail"
    "js/ng.SseProtocolMessage"
    "js/ng.SseService"
    "js/ng.StateDeclaration"
    "js/ng.StateRegistryService"
    "js/ng.StateResolveArray"
    "js/ng.StateResolveObject"
    "js/ng.StateService"
    "js/ng.StorageBackend"
    "js/ng.StorageType"
    "js/ng.StreamService"
    "js/ng.SwapModeType"
    "js/ng.TemplateCacheService"
    "js/ng.TemplateRequestService"
    "js/ng.TopicService"
    "js/ng.TranscludeFn"
    "js/ng.Transition"
    "js/ng.TransitionService"
    "js/ng.Validator"
    "js/ng.WebComponentContext"
    "js/ng.WebComponentInput"
    "js/ng.WebComponentInputConfig"
    "js/ng.WebComponentInputs"
    "js/ng.WebComponentOptions"
    "js/ng.WebComponentService"
    "js/ng.WebSocketConfig"
    "js/ng.WebSocketConnection"
    "js/ng.WebSocketService"
    "js/ng.WebTransportBufferInput"
    "js/ng.WebTransportCertificateHash"
    "js/ng.WebTransportConfig"
    "js/ng.WebTransportConnection"
    "js/ng.WebTransportDatagramEvent"
    "js/ng.WebTransportOptions"
    "js/ng.WebTransportReconnectEvent"
    "js/ng.WebTransportRetryDelay"
    "js/ng.WebTransportService"
    "js/ng.WindowService"
    "js/ng.WorkerConfig"
    "js/ng.WorkerConnection"})

(comment
  (def public-type-docs
    "Source-only documentation preserved from AngularTS Closure externs, keyed by ClojureScript type tag."
    {"js/ng.AnchorScrollProvider" "Public AngularTS AnchorScrollProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AnchorScrollService" "Public AngularTS AnchorScrollService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Angular" "AngularTS runtime instance used to create modules, bootstrap DOM trees, create injectors, and recover scopes from native elements."
     "js/ng.AngularElementDefinition" "Runtime metadata returned after defining a standalone custom element."
     "js/ng.AngularElementModuleOptions" "Configuration for the application module that owns the custom element."
     "js/ng.AngularElementOptions" "Public AngularTS AngularElementOptions contract exposed through the global ng namespace for Closure-annotated applications."
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
     "js/ng.AriaService" "Public AngularTS AriaService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Attributes" "Public AngularTS Attributes contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.BoundTranscludeFn" "A specialized version of `TranscludeFn` with the parent scope already bound. Used internally to thread controller context and future parent elements."
     "js/ng.CachedRestBackendOptions" "Configuration for {@link CachedRestBackend}."
     "js/ng.CompileService" "Entry point for the `$compile` service."
     "js/ng.Component" "Public AngularTS Component contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ConnectionConfig" "Public AngularTS ConnectionConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ConnectionEvent" "Public AngularTS ConnectionEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Controller" "AngularTS component lifecycle interface. Directive controllers have a well-defined lifecycle. Each controller can implement \"lifecycle hooks\". These are methods that will be called by Angular at certain points in the life cycle of the directive. https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks https://docs.angularjs.org/guide/component"
     "js/ng.ControllerConstructor" "A controller constructor function used in AngularTS."
     "js/ng.ControllerService" "Public AngularTS ControllerService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.CookieOptions" "Public AngularTS CookieOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.CookieService" "High-level API for reading, writing, serializing, and removing browser cookies through the injectable `$cookie` service."
     "js/ng.CookieStoreOptions" "Serialization options for cookie-backed stores."
     "js/ng.CurrencyFilterOptions" "Public AngularTS CurrencyFilterOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.DateFilterFormat" "Public AngularTS DateFilterFormat contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.DateFilterOptions" "Public AngularTS DateFilterOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Directive" "Public AngularTS Directive contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.DirectiveFactory" "Directive registration factory that returns either a directive definition object or a link function."
     "js/ng.DocumentService" "The **`Document`** interface represents any web page loaded in the browser and serves as an entry point into the web page's content, which is the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document)"
     "js/ng.ElementScopeOptions" "Public AngularTS ElementScopeOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.EntityClass" "Constructor used by REST resources to map raw response data into entity instances."
     "js/ng.EntryFilterItem" "Public AngularTS EntryFilterItem contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ErrorHandlingConfig" "Error configuration object. May only contain the options that need to be updated."
     "js/ng.ExceptionHandlerProvider" "Provider for the `$exceptionHandler` service. The default implementation rethrows exceptions, enabling strict fail-fast behavior. Applications may replace the handler via by setting `errorHandler`property or by providing their own `$exceptionHandler` factory."
     "js/ng.ExceptionHandlerService" "A callback type for handling errors."
     "js/ng.Expression" "Public AngularTS Expression contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterFactory" "Public AngularTS FilterFactory contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterFn" "Public AngularTS FilterFn contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterProvider" "Public AngularTS FilterProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterService" "Public AngularTS FilterService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpMethod" "Public AngularTS HttpMethod contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpParamSerializerProvider" "Public AngularTS HttpParamSerializerProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpParamSerializerSerService" "Function that serializes query params into a URL-encoded string."
     "js/ng.HttpPromise" "Public AngularTS HttpPromise contract exposed through the global ng namespace for Closure-annotated applications."
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
     "js/ng.LogService" "Service for logging messages at various levels."
     "js/ng.NativeAnimationOptions" "Public AngularTS NativeAnimationOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.NativeWebTransport" "Public AngularTS NativeWebTransport contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.NgModelController" "Public AngularTS NgModelController contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.NgModule" "AngularTS module registration surface for controllers, directives, services, factories, providers, filters, run blocks, and config blocks."
     "js/ng.NumberFilterOptions" "Public AngularTS NumberFilterOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ParseService" "Parses a string or expression function into a compiled expression."
     "js/ng.ProvideService" "The API for registering different types of providers with the injector. This interface is used within AngularTS's `$provide` service to define services, factories, constants, values, decorators, etc."
     "js/ng.PubSubProvider" "Provider used during module configuration to register and expose the application-wide AngularTS pub/sub event bus service."
     "js/ng.PubSubService" "Topic-based publish/subscribe service for decoupled application events."
     "js/ng.PublicLinkFn" "A function returned by the `$compile` service that links a compiled template to a scope."
     "js/ng.RealtimeProtocolEventDetail" "Public AngularTS RealtimeProtocolEventDetail contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RealtimeProtocolMessage" "Public AngularTS RealtimeProtocolMessage contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RelativeTimeFilterOptions" "Public AngularTS RelativeTimeFilterOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RequestConfig" "Full request configuration accepted by `$http(...)`. See http://docs.angularjs.org/api/ng/service/$http#usage"
     "js/ng.RequestShortcutConfig" "Request options shared by the `$http` shortcut methods. See http://docs.angularjs.org/api/ng/service/$http#usage"
     "js/ng.RestBackend" "Backend abstraction used by {@link RestService}. Implement this interface to route REST operations through `$http`, IndexedDB, the Cache API, a test double, or a composed backend such as {@link CachedRestBackend}."
     "js/ng.RestCacheStore" "Async cache store used by {@link CachedRestBackend}. The interface is deliberately small so implementations can be backed by IndexedDB, the browser Cache API, local storage, memory, or test fixtures."
     "js/ng.RestCacheStrategy" "Read strategy used by {@link CachedRestBackend} for `GET` requests. - `cache-first`: return cached data when present, otherwise fetch network. - `network-first`: fetch network first, falling back to stale cache on error. - `stale-while-revalidate`: return cache immediately and refresh in the background."
     "js/ng.RestDefinition" "Public AngularTS RestDefinition contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestFactory" "Factory service exposed as `$rest`. Creates a typed {@link RestService} for a base URL, optional entity mapper, and optional backend request defaults."
     "js/ng.RestOptions" "Extra backend options merged into requests made by a REST resource."
     "js/ng.RestRequest" "Normalized request object passed from {@link RestService} to a {@link RestBackend}. Backends receive expanded URLs and already-separated request options, so they can focus on transport, persistence, or cache policy."
     "js/ng.RestResponse" "Public AngularTS RestResponse contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestRevalidateEvent" "Public AngularTS RestRevalidateEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestService" "Public AngularTS RestService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RootElementService" "**`Element`** is the most general base class from which all element objects (i.e., objects that represent elements) in a Document inherit. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element)"
     "js/ng.RootScopeService" "Public AngularTS RootScopeService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SceDelegateProvider" "' ]); // The banned resource URL list overrides the trusted resource URL list so the open redirect // here is blocked. $sceDelegateProvider.bannedResourceUrlList([ 'http://myapp.example.com/clickThru**' ]); }); ``` Note that an empty trusted resource URL list will block every resource URL from being loaded, and will require you to manually mark each one as trusted with `$sce.trustAsResourceUrl`. However, templates requested by {@link ng.$templateRequest $templateRequest} that are present in {@link ng.$templateCache $templateCache} will not go through this check. If you have a mechanism to populate your templates in that cache at config time, then it is a good idea to remove 'self' from the trusted resource URL lsit. This helps to mitigate the security impact of certain types of issues, like for instance attacker-controlled `ng-includes`."
     "js/ng.SceDelegateService" "Public AngularTS SceDelegateService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SceProvider" "Public AngularTS SceProvider contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SceService" "Public AngularTS SceService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Scope" "Reactive scope object used by AngularTS templates, directives, event propagation, listener registration, and queued change delivery."
     "js/ng.ScopeEvent" "Public AngularTS ScopeEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ServiceProvider" "An object that defines how a service is constructed. It must define a `$get` property that provides the instance of the service, either as a plain factory function or as an {@link AnnotatedFactory}."
     "js/ng.SseConfig" "SSE-specific configuration"
     "js/ng.SseConnection" "Managed SSE connection object returned by $sse. Provides a safe way to close the connection and stop reconnection attempts."
     "js/ng.SseProtocolEventDetail" "Public AngularTS SseProtocolEventDetail contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SseProtocolMessage" "Public AngularTS SseProtocolMessage contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SseService" "$sse service type Returns a managed SSE connection that automatically reconnects when needed."
     "js/ng.StateDeclaration" "The StateDeclaration object is used to define a state or nested state. #### Example: ```js // StateDeclaration object var foldersState = { name: 'folders', url: '/folders', component: FoldersComponent, resolve: { allfolders: function(FolderService) { return FolderService.list(); } }, } registry.register(foldersState); ```"
     "js/ng.StateRegistryService" "A registry for all of the application's [[StateDeclaration]]s This API is found at `$stateRegistry`."
     "js/ng.StateResolveArray" "Array-style state resolves. Use this when you need explicit resolve metadata such as `token`, `deps`, `eager`, or pre-resolved `data`. Example: ```js resolve: [ { token: \"user\", deps: [\"UserService\", Transition], resolveFn: (UserService, trans) => UserService.fetchUser(trans.params().userId), eager: true, }, ] ```"
     "js/ng.StateResolveObject" "Object-style state resolves. Use this when resolve tokens are string keys and each value is a normal AngularTS injectable function or annotated factory. Example: ```js resolve: { user: [\"UserService\", (UserService) => UserService.current()], featureFlags: () => fetchFlags(), } ```"
     "js/ng.StateService" "Provides services related to ng-router states. This API is located at `$state`."
     "js/ng.StorageBackend" "Public AngularTS StorageBackend contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.StorageType" "Built-in persistent storage backends understood by `NgModule.store()`."
     "js/ng.StreamService" "Public AngularTS StreamService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SwapModeType" "Public AngularTS SwapModeType contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.TemplateCacheService" "Public AngularTS TemplateCacheService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.TemplateRequestService" "Downloads a template using $http and, upon success, stores the contents inside of $templateCache. If the HTTP request fails or the response data of the HTTP request is empty then a $compile error will be thrown (unless {ignoreRequestError} is set to true)."
     "js/ng.TopicService" "Single-topic pub/sub object used to publish values and manage subscriptions."
     "js/ng.TranscludeFn" "A function passed as the fifth argument to a `PublicLinkFn` link function. It behaves like a linking function, with the `scope` argument automatically created as a new child of the transcluded parent scope. The function returns the DOM content to be injected (transcluded) into the directive."
     "js/ng.Transition" "Represents a transition between two states. When navigating to a state, we are transitioning **from** the current state **to** the new state. This object contains all contextual information about the to/from states, parameters, resolves. It has information about all states being entered and exited as a result of the transition."
     "js/ng.TransitionService" "This interface specifies the api for registering Transition Hooks. Both the [[TransitionService]] and also the [[Transition]] object itself implement this interface. Note: the Transition object only allows hooks to be registered before the Transition is started."
     "js/ng.Validator" "Public AngularTS Validator contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentContext" "Public AngularTS WebComponentContext contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentInput" "Public AngularTS WebComponentInput contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentInputConfig" "Public AngularTS WebComponentInputConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentInputs" "Public AngularTS WebComponentInputs contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentOptions" "Public AngularTS WebComponentOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentService" "Public AngularTS WebComponentService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebSocketConfig" "WebSocket-specific configuration"
     "js/ng.WebSocketConnection" "Managed WebSocket connection returned by $websocket."
     "js/ng.WebSocketService" "Public AngularTS WebSocketService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportBufferInput" "Public AngularTS WebTransportBufferInput contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportCertificateHash" "Public AngularTS WebTransportCertificateHash contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportConfig" "Options passed to `$webTransport`."
     "js/ng.WebTransportConnection" "Managed WebTransport connection returned by `$webTransport`. The connection wraps the browser-native `WebTransport` object and keeps its promise/stream model visible while adding small conveniences for sending bytes, text, datagrams, and unidirectional streams."
     "js/ng.WebTransportDatagramEvent" "Public AngularTS WebTransportDatagramEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportOptions" "Public AngularTS WebTransportOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportReconnectEvent" "Event passed to WebTransport reconnect and renegotiation hooks."
     "js/ng.WebTransportRetryDelay" "Delay, in milliseconds, before a reconnect attempt is opened."
     "js/ng.WebTransportService" "Factory function exposed as `$webTransport`."
     "js/ng.WindowService" "The **`Window`** interface represents a window containing a DOM document; the `document` property points to the DOM document loaded in that window. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window)"
     "js/ng.WorkerConfig" "Public AngularTS WorkerConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerConnection" "Public AngularTS WorkerConnection contract exposed through the global ng namespace for Closure-annotated applications."}))

(def strict-wrapper-names
  "Extern methods with fully concrete ClojureScript wrapper signatures."
  #{"angular-call"
    "angular-dispatch-event"
    "angular-emit"
    "angular-get-injector"
    "angular-get-scope"
    "angular-register-ng-module"
    "ng-module-animation"
    "ng-module-component"
    "ng-module-config"
    "ng-module-controller"
    "ng-module-decorator"
    "ng-module-directive"
    "ng-module-factory"
    "ng-module-provider"
    "ng-module-run"
    "ng-module-service"
    "ng-module-state"
    "ng-module-topic"
    "ng-module-web-component"
    "pub-sub-service-dispose"
    "pub-sub-service-get-count"
    "pub-sub-service-is-disposed"
    "pub-sub-service-reset"})

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

(defn angular-get-injector
  "Retrieve the injector cached on a bootstrapped DOM element.\n\nParams:\n- element: {!Element}\n\nReturns: {!ng.InjectorService}"
  ^js/ng.InjectorService [^js/ng.Angular target ^js/Element element]
  (.getInjector target element))

(defn angular-get-scope
  "Retrieve the scope cached on a compiled DOM element.\n\nParams:\n- element: {!Element}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Angular target ^js/Element element]
  (.getScope target element))

(defn angular-register-ng-module
  "Registers the configured built-in `ng` module for this runtime instance.\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.Angular target]
  (.registerNgModule target))

(defn ng-module-animation
  "Public NgModule.animation member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- animationFactory: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.Injectable animationFactory]
  (.animation target name animationFactory))

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

(defn ng-module-state
  "Register a router state during module configuration. This is equivalent to calling `$stateProvider.state(...)` in a config block, but keeps route declarations in the same fluent module API used for components, services, directives, and custom elements. Register a named router state during module configuration. The provided `name` is copied onto the state declaration before it is passed to `$stateProvider`.\n\nParams:\n- definition: {!ng.StateDeclaration}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^js/ng.StateDeclaration definition]
  (.state target definition))

(defn ng-module-topic
  "Register a topic-bound event bus facade as an injectable service. Events published through the facade are namespaced as `${topic}:${event}`, keeping raw event-bus topic strings out of application services.\n\nParams:\n- name: {string}\n- topic: {string}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^string topic]
  (.topic target name topic))

(defn ng-module-web-component
  "Register a scoped custom element backed by a normal AngularTS child scope. The definition is installed when the module runs. The custom element can be consumed as a native element while its internal model remains part of the AngularTS scope tree.\n\nParams:\n- name: {string}\n- options: {!ng.WebComponentOptions<T>}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.WebComponentOptions options]
  (.webComponent target name options))

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

(defn pub-sub-service-reset
  "Reset the bus to its initial state without disposing it. All topics and listeners are removed, and the instance can be reused.\n\nReturns: {void}"
  [^js/ng.PubSubService target]
  (.reset target))

(defn pub-sub-service-publish
  "Typed variadic wrapper for ng.PubSubService.prototype.publish."
  (^boolean [^js/ng.PubSubService event-bus ^string topic]
   (.publish event-bus topic))
  (^boolean [^js/ng.PubSubService event-bus ^string topic value]
   (.publish event-bus topic value))
  (^boolean [^js/ng.PubSubService event-bus ^string topic value extra]
   (.publish event-bus topic value extra)))

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
