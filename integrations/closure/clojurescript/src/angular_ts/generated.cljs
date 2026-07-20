;; Generated from ../externs/angular.js by scripts/generate-cljs-types.mjs.
;; Do not edit directly.
(ns angular-ts.generated)

(set! *warn-on-infer* true)

(def public-type-tags
  "AngularTS public Closure extern types available as ClojureScript tags."
  #{"js/ng.AnchorScrollService"
    "js/ng.Angular"
    "js/ng.AngularElementDefinition"
    "js/ng.AngularElementModuleOptions"
    "js/ng.AngularElementOptions"
    "js/ng.AngularService"
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
    "js/ng.AriaConfig"
    "js/ng.AriaService"
    "js/ng.CachedRestBackendOptions"
    "js/ng.ClassMap"
    "js/ng.ClassValue"
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
    "js/ng.Directive"
    "js/ng.DirectiveFactory"
    "js/ng.DirectiveRestrict"
    "js/ng.DocumentService"
    "js/ng.ElementScopeOptions"
    "js/ng.ElementService"
    "js/ng.EntityClass"
    "js/ng.EntryFilterItem"
    "js/ng.ErrorHandlingConfig"
    "js/ng.EventBusConfig"
    "js/ng.EventBusService"
    "js/ng.EventDeliveryPolicy"
    "js/ng.EventDeliveryPolicyContext"
    "js/ng.ExceptionHandlerService"
    "js/ng.Expression"
    "js/ng.FilterFactory"
    "js/ng.FilterFn"
    "js/ng.FilterService"
    "js/ng.HtmlCanvasConfig"
    "js/ng.HtmlCanvasRuntimeSupport"
    "js/ng.HtmlCanvasService"
    "js/ng.HttpDefaults"
    "js/ng.HttpMethod"
    "js/ng.HttpParamSerializerService"
    "js/ng.HttpRequestConfig"
    "js/ng.HttpRequestOptions"
    "js/ng.HttpResponse"
    "js/ng.HttpResponseStatus"
    "js/ng.HttpService"
    "js/ng.Injectable"
    "js/ng.InjectionTokenMap"
    "js/ng.InjectorService"
    "js/ng.InterpolateConfig"
    "js/ng.InterpolateService"
    "js/ng.InterpolationFunction"
    "js/ng.LinkFn"
    "js/ng.ListenerFn"
    "js/ng.LocationService"
    "js/ng.LogBeaconConfig"
    "js/ng.LogBeaconSerializer"
    "js/ng.LogEntry"
    "js/ng.LogLevel"
    "js/ng.LogService"
    "js/ng.Machine"
    "js/ng.MachineConfig"
    "js/ng.MachineContract"
    "js/ng.MachineSendResult"
    "js/ng.MachineSendStatus"
    "js/ng.MachineService"
    "js/ng.MachineSnapshot"
    "js/ng.Model"
    "js/ng.ModelChange"
    "js/ng.ModelRestoreOptions"
    "js/ng.ModelSyncFailureMode"
    "js/ng.ModelSyncOptions"
    "js/ng.ModelSyncTarget"
    "js/ng.NgModelController"
    "js/ng.NgModule"
    "js/ng.ParamsOf"
    "js/ng.ParseService"
    "js/ng.Policy"
    "js/ng.PolicyContext"
    "js/ng.PolicyDecision"
    "js/ng.ProviderDefinition"
    "js/ng.RealtimeProtocolEventDetail"
    "js/ng.RealtimeProtocolMessage"
    "js/ng.ResolvesOf"
    "js/ng.RestBackend"
    "js/ng.RestCachePolicy"
    "js/ng.RestCachePolicyContext"
    "js/ng.RestCacheStore"
    "js/ng.RestCacheStrategy"
    "js/ng.RestFactory"
    "js/ng.RestOptions"
    "js/ng.RestRequest"
    "js/ng.RestResponse"
    "js/ng.RestRevalidateEvent"
    "js/ng.RestService"
    "js/ng.RootElementService"
    "js/ng.RootScopeService"
    "js/ng.RouteContract"
    "js/ng.RouteMap"
    "js/ng.RouterConfig"
    "js/ng.RouterModule"
    "js/ng.RouterModuleDeclaration"
    "js/ng.RoutesOf"
    "js/ng.SceDelegateService"
    "js/ng.SceService"
    "js/ng.Scope"
    "js/ng.ScopeElement"
    "js/ng.ScopeElementConstructor"
    "js/ng.ScopeEvent"
    "js/ng.ScopeService"
    "js/ng.SecurityConfig"
    "js/ng.SecurityCredentialsConfig"
    "js/ng.SecurityPolicy"
    "js/ng.ServiceWorkerConfig"
    "js/ng.ServiceWorkerErrorCode"
    "js/ng.ServiceWorkerMessageEvent"
    "js/ng.ServiceWorkerMessageTarget"
    "js/ng.ServiceWorkerPostOptions"
    "js/ng.ServiceWorkerRegistrationState"
    "js/ng.ServiceWorkerRequestOptions"
    "js/ng.ServiceWorkerService"
    "js/ng.ServiceWorkerUpdateState"
    "js/ng.SseConfig"
    "js/ng.SseConnection"
    "js/ng.SseService"
    "js/ng.StateDeclaration"
    "js/ng.StatePolicyDeclaration"
    "js/ng.StateRegistryService"
    "js/ng.StateService"
    "js/ng.StorageBackend"
    "js/ng.StorageType"
    "js/ng.StreamService"
    "js/ng.SwapMode"
    "js/ng.TemplateCacheService"
    "js/ng.TemplateRequestService"
    "js/ng.TranscludeFn"
    "js/ng.Transition"
    "js/ng.TransitionRouteContract"
    "js/ng.TransitionsService"
    "js/ng.Validator"
    "js/ng.WasmBinding"
    "js/ng.WasmBindingOptions"
    "js/ng.WasmCompileOptions"
    "js/ng.WasmError"
    "js/ng.WasmErrorCode"
    "js/ng.WasmErrorStage"
    "js/ng.WasmLoadOptions"
    "js/ng.WasmResource"
    "js/ng.WasmResourceStatus"
    "js/ng.WasmService"
    "js/ng.WasmSource"
    "js/ng.WasmTarget"
    "js/ng.WebComponentConfig"
    "js/ng.WebComponentContext"
    "js/ng.WebComponentInput"
    "js/ng.WebComponentInputConfig"
    "js/ng.WebComponentInputs"
    "js/ng.WebComponentService"
    "js/ng.WebSocketConfig"
    "js/ng.WebSocketConnection"
    "js/ng.WebSocketService"
    "js/ng.WebTransportBufferInput"
    "js/ng.WebTransportConfig"
    "js/ng.WebTransportConnection"
    "js/ng.WebTransportDatagramEvent"
    "js/ng.WebTransportReconnectEvent"
    "js/ng.WebTransportRetryDelay"
    "js/ng.WebTransportService"
    "js/ng.WindowService"
    "js/ng.WorkerConfig"
    "js/ng.WorkerError"
    "js/ng.WorkerErrorCode"
    "js/ng.WorkerHandle"
    "js/ng.WorkerModelMessage"
    "js/ng.WorkerRequest"
    "js/ng.WorkerRequestOptions"
    "js/ng.WorkerResponse"
    "js/ng.WorkerService"
    "js/ng.WorkerStatus"
    "js/ng.Workflow"
    "js/ng.WorkflowCommand"
    "js/ng.WorkflowCommandContext"
    "js/ng.WorkflowCommandContract"
    "js/ng.WorkflowCommandDefinition"
    "js/ng.WorkflowContract"
    "js/ng.WorkflowResult"
    "js/ng.WorkflowService"
    "js/ng.WorkflowSnapshot"
    "js/ng.WorkflowSupervisor"
    "js/ng.WorkflowSupervisorConfig"
    "js/ng.WorkflowSupervisorPersistence"
    "js/ng.WorkflowSupervisorPersistenceConfig"
    "js/ng.WorkflowSupervisorSnapshot"})

(comment
  (def public-type-docs
    "Source-only documentation preserved from AngularTS Closure externs, keyed by ClojureScript type tag."
    {"js/ng.AnchorScrollService" "Public AngularTS AnchorScrollService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Angular" "AngularTS runtime instance used to create modules, bootstrap DOM trees, create injectors, and recover scopes from native elements."
     "js/ng.AngularElementDefinition" "Runtime metadata returned after defining a standalone custom element."
     "js/ng.AngularElementModuleOptions" "Configuration for the application module that owns the custom element."
     "js/ng.AngularElementOptions" "Public AngularTS AngularElementOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AngularService" "Main AngularTS runtime entry point with the full built-in `ng` module configured by default."
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
     "js/ng.AriaConfig" "Public AngularTS AriaConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.AriaService" "Public AngularTS AriaService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.CachedRestBackendOptions" "Configuration for {@link CachedRestBackend}."
     "js/ng.ClassMap" "Boolean class map consumed by `ng-class`. Each key is a CSS class name. Truthy values add the class; `false`, `null`, and `undefined` remove it."
     "js/ng.ClassValue" "Public shape accepted by `ng-class` for class binding expressions."
     "js/ng.CompileService" "Entry point for the `$compile` service."
     "js/ng.Component" "Defines a component's configuration object (a simplified directive definition object)."
     "js/ng.ConnectionConfig" "Public AngularTS ConnectionConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ConnectionEvent" "Public AngularTS ConnectionEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Controller" "AngularTS component lifecycle interface. Directive controllers have a well-defined lifecycle. Each controller can implement \"lifecycle hooks\". These are methods that will be called by Angular at certain points in the life cycle of the directive. https://docs.angularjs.org/api/ng/service/$compile#life-cycle-hooks https://docs.angularjs.org/guide/component"
     "js/ng.ControllerConstructor" "A controller constructor function used in AngularTS."
     "js/ng.ControllerService" "Public AngularTS ControllerService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.CookieOptions" "Public AngularTS CookieOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.CookieService" "High-level API for reading, writing, serializing, and removing browser cookies through the injectable `$cookie` service."
     "js/ng.CookieStoreOptions" "Serialization options for cookie-backed stores."
     "js/ng.CurrencyFilterOptions" "Public AngularTS CurrencyFilterOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Directive" "Public AngularTS Directive contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.DirectiveFactory" "Directive registration factory that returns either a directive definition object or a link function."
     "js/ng.DirectiveRestrict" "Supported directive matching locations."
     "js/ng.DocumentService" "The **`Document`** interface represents any web page loaded in the browser and serves as an entry point into the web page's content, which is the DOM tree. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Document)"
     "js/ng.ElementScopeOptions" "Public AngularTS ElementScopeOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ElementService" "**`Element`** is the most general base class from which all element objects (i.e., objects that represent elements) in a Document inherit. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Element)"
     "js/ng.EntityClass" "Constructor used by REST resources to map raw response data into entity instances."
     "js/ng.EntryFilterItem" "Public AngularTS EntryFilterItem contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ErrorHandlingConfig" "Error configuration object. May only contain the options that need to be updated."
     "js/ng.EventBusConfig" "Public AngularTS EventBusConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.EventBusService" "Topic-based publish/subscribe service for decoupled application events."
     "js/ng.EventDeliveryPolicy" "Public AngularTS EventDeliveryPolicy contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.EventDeliveryPolicyContext" "Public AngularTS EventDeliveryPolicyContext contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ExceptionHandlerService" "A callback type for handling errors."
     "js/ng.Expression" "Public AngularTS Expression contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterFactory" "Public AngularTS FilterFactory contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterFn" "Public AngularTS FilterFn contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.FilterService" "Public AngularTS FilterService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HtmlCanvasConfig" "Declarative config accepted by `NgModule.config({ $htmlCanvas: ... })`. The integration is disabled by default and has no AngularTS fallback."
     "js/ng.HtmlCanvasRuntimeSupport" "Public AngularTS HtmlCanvasRuntimeSupport contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HtmlCanvasService" "Public AngularTS HtmlCanvasService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpDefaults" "Default request settings configured through `app.config({ $http })` and exposed at runtime through `$http.defaults`. Not every `HttpRequestOptions` field is supported here; this shape only includes the fields that the runtime reads from provider-level defaults. https://docs.angularjs.org/api/ng/service/$http#defaults https://docs.angularjs.org/api/ng/service/$http#usage"
     "js/ng.HttpMethod" "Public AngularTS HttpMethod contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpParamSerializerService" "Function that serializes query params into a URL-encoded string."
     "js/ng.HttpRequestConfig" "Full request configuration accepted by `$http(...)`. See http://docs.angularjs.org/api/ng/service/$http#usage"
     "js/ng.HttpRequestOptions" "Request options shared by the `$http` shortcut methods. See http://docs.angularjs.org/api/ng/service/$http#usage"
     "js/ng.HttpResponse" "Public AngularTS HttpResponse contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.HttpResponseStatus" "Final transport status reported by transport completion handlers."
     "js/ng.HttpService" "Runtime `$http` service contract for full request configs, HTTP verb shortcuts, defaults, and pending request tracking."
     "js/ng.Injectable" "AngularTS dependency-injectable function or dependency-annotated factory array."
     "js/ng.InjectionTokenMap" "Public injectable contracts keyed by their canonical runtime token. Every single-dollar token exposed by [[PublicInjectionTokens]] must map to a named, documented contract here. Double-dollar framework internals are intentionally excluded."
     "js/ng.InjectorService" "Public AngularTS InjectorService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.InterpolateConfig" "Delimiter configuration accepted by `NgModule.config()`."
     "js/ng.InterpolateService" "Public AngularTS InterpolateService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.InterpolationFunction" "Public AngularTS InterpolationFunction contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.LinkFn" "A function returned by the `$compile` service that links a compiled template to a scope."
     "js/ng.ListenerFn" "Public AngularTS ListenerFn contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.LocationService" "Public AngularTS LocationService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.LogBeaconConfig" "Declarative remote logging configuration for `navigator.sendBeacon()`."
     "js/ng.LogBeaconSerializer" "Converts a structured log entry into a Beacon-compatible request body."
     "js/ng.LogEntry" "Structured record passed to a configured Beacon serializer."
     "js/ng.LogLevel" "Logging severity attached to a structured remote log entry."
     "js/ng.LogService" "Service for logging messages at various levels."
     "js/ng.Machine" "Public AngularTS Machine contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineConfig" "Public AngularTS MachineConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineContract" "Labeled type contract carried by a machine definition and instance."
     "js/ng.MachineSendResult" "Public AngularTS MachineSendResult contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineSendStatus" "Public AngularTS MachineSendStatus contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineService" "Public AngularTS MachineService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.MachineSnapshot" "Public AngularTS MachineSnapshot contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Model" "Public AngularTS Model contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ModelChange" "Public AngularTS ModelChange contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ModelRestoreOptions" "Public AngularTS ModelRestoreOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ModelSyncFailureMode" "Public AngularTS ModelSyncFailureMode contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ModelSyncOptions" "Public AngularTS ModelSyncOptions contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ModelSyncTarget" "Public AngularTS ModelSyncTarget contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.NgModelController" "Public AngularTS NgModelController contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.NgModule" "AngularTS module registration surface for controllers, directives, services, factories, providers, filters, run blocks, and config blocks."
     "js/ng.ParamsOf" "Public AngularTS ParamsOf contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ParseService" "Parses a string or expression function into a compiled expression."
     "js/ng.Policy" "Public AngularTS Policy contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.PolicyContext" "Public AngularTS PolicyContext contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.PolicyDecision" "Public AngularTS PolicyDecision contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ProviderDefinition" "A user-defined service recipe accepted by {@link ng.NgModule.provider}. Object recipes define an injectable `$get` factory directly. Injectable functions and classes are instantiated first and must produce an object with an injectable `$get` factory."
     "js/ng.RealtimeProtocolEventDetail" "Public AngularTS RealtimeProtocolEventDetail contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RealtimeProtocolMessage" "Public AngularTS RealtimeProtocolMessage contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ResolvesOf" "Public AngularTS ResolvesOf contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestBackend" "Backend abstraction used by {@link RestService}. Implement this interface to route REST operations through `$http`, IndexedDB, the Cache API, a test double, or a composed backend such as {@link CachedRestBackend}."
     "js/ng.RestCachePolicy" "Public AngularTS RestCachePolicy contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestCachePolicyContext" "Public AngularTS RestCachePolicyContext contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestCacheStore" "Async cache store used by {@link CachedRestBackend}. The interface is deliberately small so implementations can be backed by IndexedDB, the browser Cache API, local storage, memory, or test fixtures."
     "js/ng.RestCacheStrategy" "Read strategy used by {@link CachedRestBackend} for `GET` requests. - `cache-first`: return cached data when present, otherwise fetch network. - `network-first`: fetch network first, falling back to stale cache on error. - `stale-while-revalidate`: return cache immediately and refresh in the background."
     "js/ng.RestFactory" "Factory service exposed as `$rest`. Creates a typed {@link RestService} for a base URL, optional entity mapper, and optional backend request defaults."
     "js/ng.RestOptions" "Extra backend options merged into requests made by a REST resource."
     "js/ng.RestRequest" "Normalized request object passed from {@link RestService} to a {@link RestBackend}. Backends receive expanded URLs and already-separated request options, so they can focus on transport, persistence, or cache policy."
     "js/ng.RestResponse" "Public AngularTS RestResponse contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestRevalidateEvent" "Public AngularTS RestRevalidateEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RestService" "Public AngularTS RestService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RootElementService" "The **`HTMLElement`** interface represents any HTML element. [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLElement)"
     "js/ng.RootScopeService" "Scope class for the Proxy. It intercepts operations like property access (get) and property setting (set), and adds support for deep change tracking and observer-like behavior."
     "js/ng.RouteContract" "Public route contract entry used by router helper types. This is an author-written TypeScript shape. It is intentionally separate from built router state records so generated docs and language bindings do not expose internal state/runtime implementation details."
     "js/ng.RouteMap" "Public route-name to route-contract map used by `StateService`, generic `Transition`, `ParamsOf`, and `ResolvesOf`."
     "js/ng.RouterConfig" "Public AngularTS RouterConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RouterModule" "Public AngularTS RouterModule contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.RouterModuleDeclaration" "Module-owned router state tree declaration. Use this with [[NgModule.router]] when a module owns a route subtree. Child state names are relative to their parent unless they contain a dot."
     "js/ng.RoutesOf" "Public AngularTS RoutesOf contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SceDelegateService" "Public AngularTS SceDelegateService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SceService" "Public AngularTS SceService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.Scope" "Reactive scope object used by AngularTS templates, directives, event propagation, listener registration, and queued change delivery."
     "js/ng.ScopeElement" "Public AngularTS ScopeElement contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ScopeElementConstructor" "Public AngularTS ScopeElementConstructor contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ScopeEvent" "Event object passed to `$emit` and `$broadcast` listeners. Tracks target scope, current scope, name, propagation/default flags, and control methods."
     "js/ng.ScopeService" "Scope class for the Proxy. It intercepts operations like property access (get) and property setting (set), and adds support for deep change tracking and observer-like behavior."
     "js/ng.SecurityConfig" "Public AngularTS SecurityConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SecurityCredentialsConfig" "Public AngularTS SecurityCredentialsConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SecurityPolicy" "Public AngularTS SecurityPolicy contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ServiceWorkerConfig" "Declarative defaults used when registering an application service worker. This config intentionally maps only browser registration options and safe observation policy. Activation, reload, cache strategy, push, and background sync remain explicit application or adapter policy."
     "js/ng.ServiceWorkerErrorCode" "Stable failure codes reported by {@link ServiceWorkerError}."
     "js/ng.ServiceWorkerMessageEvent" "Public AngularTS ServiceWorkerMessageEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.ServiceWorkerMessageTarget" "Explicit message target for `$serviceWorker.post(...)`."
     "js/ng.ServiceWorkerPostOptions" "Options for {@link ServiceWorkerService.post}."
     "js/ng.ServiceWorkerRegistrationState" "Template-friendly snapshot of the current registration."
     "js/ng.ServiceWorkerRequestOptions" "Per-request options for {@link ServiceWorkerService.request}."
     "js/ng.ServiceWorkerService" "Injectable service-worker lifecycle and messaging facade."
     "js/ng.ServiceWorkerUpdateState" "Template-friendly snapshot of update-related service-worker state."
     "js/ng.SseConfig" "SSE-specific configuration"
     "js/ng.SseConnection" "Managed SSE connection object returned by $sse. Provides a safe way to close the connection and stop reconnection attempts."
     "js/ng.SseService" "$sse service type Returns a managed SSE connection that automatically reconnects when needed."
     "js/ng.StateDeclaration" "The StateDeclaration object is used to define a state or nested state. #### Example: ```js // StateDeclaration object var foldersState = { name: 'folders', url: '/folders', component: FoldersComponent, resolve: { allfolders: function(FolderService) { return FolderService.list(); } }, } registry.register(foldersState); ```"
     "js/ng.StatePolicyDeclaration" "Public AngularTS StatePolicyDeclaration contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.StateRegistryService" "Public `$stateRegistry` contract for dynamic route registration. Module-owned static routes should normally use [[NgModule.router]]. Use this service when routes must be added or removed at runtime."
     "js/ng.StateService" "Public AngularTS StateService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.StorageBackend" "Public AngularTS StorageBackend contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.StorageType" "Built-in persistent storage backends understood by `NgModule.store()`."
     "js/ng.StreamService" "Public AngularTS StreamService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.SwapMode" "Public AngularTS SwapMode contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.TemplateCacheService" "Public contract implemented by the `$templateCache` injectable."
     "js/ng.TemplateRequestService" "Downloads a template using $http and, upon success, stores the contents inside of $templateCache. If the HTTP request fails or the response data of the HTTP request is empty then a $compile error will be thrown (unless {ignoreRequestError} is set to true)."
     "js/ng.TranscludeFn" "A function passed to directive link functions for transcluded content. It behaves like a linking function, with the `scope` argument automatically created as a new child of the transcluded parent scope. The function returns the DOM content to be injected (transcluded) into the directive."
     "js/ng.Transition" "Public AngularTS Transition contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.TransitionRouteContract" "Public AngularTS TransitionRouteContract contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.TransitionsService" "This interface specifies the api for registering Transition Hooks. Both the [[TransitionService]] and also the [[Transition]] object itself implement this interface. Note: the Transition object only allows hooks to be registered before the Transition is started."
     "js/ng.Validator" "Public AngularTS Validator contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WasmBinding" "Public AngularTS WasmBinding contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WasmBindingOptions" "Options for binding one reactive target to a WebAssembly guest."
     "js/ng.WasmCompileOptions" "Standard WebAssembly compilation options forwarded without translation."
     "js/ng.WasmError" "Structured error raised by the high-level WebAssembly host."
     "js/ng.WasmErrorCode" "Error categories reported by the high-level WebAssembly host."
     "js/ng.WasmErrorStage" "Lifecycle stage at which a WebAssembly operation failed."
     "js/ng.WasmLoadOptions" "Declarative options for loading one WebAssembly module."
     "js/ng.WasmResource" "Public AngularTS WasmResource contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WasmResourceStatus" "Lifecycle state of a WebAssembly resource."
     "js/ng.WasmService" "High-level WebAssembly host service."
     "js/ng.WasmSource" "Source accepted by the WebAssembly loader."
     "js/ng.WasmTarget" "Scope class for the Proxy. It intercepts operations like property access (get) and property setting (set), and adds support for deep change tracking and observer-like behavior."
     "js/ng.WebComponentConfig" "Application-wide defaults for scoped custom elements."
     "js/ng.WebComponentContext" "Public AngularTS WebComponentContext contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentInput" "Public AngularTS WebComponentInput contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentInputConfig" "Public AngularTS WebComponentInputConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentInputs" "Public AngularTS WebComponentInputs contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebComponentService" "Public AngularTS WebComponentService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebSocketConfig" "WebSocket-specific configuration"
     "js/ng.WebSocketConnection" "Managed WebSocket connection returned by $websocket."
     "js/ng.WebSocketService" "Public AngularTS WebSocketService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportBufferInput" "Public AngularTS WebTransportBufferInput contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportConfig" "Options passed to `$webTransport`."
     "js/ng.WebTransportConnection" "Managed WebTransport connection returned by `$webTransport`. The connection wraps the browser-native `WebTransport` object and keeps its promise/stream model visible while adding small conveniences for sending bytes, text, datagrams, and unidirectional streams."
     "js/ng.WebTransportDatagramEvent" "Public AngularTS WebTransportDatagramEvent contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WebTransportReconnectEvent" "Event passed to WebTransport reconnect and renegotiation hooks."
     "js/ng.WebTransportRetryDelay" "Delay, in milliseconds, before a reconnect attempt is opened."
     "js/ng.WebTransportService" "Factory function exposed as `$webTransport`."
     "js/ng.WindowService" "The **`Window`** interface represents a window containing a DOM document; the `document` property points to the DOM document loaded in that window. [MDN Reference](https://developer.mozilla.org/docs/Web/API/Window)"
     "js/ng.WorkerConfig" "Public AngularTS WorkerConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerError" "Typed failure reported by a managed worker."
     "js/ng.WorkerErrorCode" "Public AngularTS WorkerErrorCode contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerHandle" "Public AngularTS WorkerHandle contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerModelMessage" "Public AngularTS WorkerModelMessage contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerRequest" "Public AngularTS WorkerRequest contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerRequestOptions" "Options for one correlated worker request."
     "js/ng.WorkerResponse" "Public AngularTS WorkerResponse contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkerService" "Injectable factory for typed managed Web Worker connections."
     "js/ng.WorkerStatus" "Lifecycle state exposed by a managed {@link WorkerHandle}."
     "js/ng.Workflow" "Public AngularTS Workflow contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowCommand" "Public AngularTS WorkflowCommand contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowCommandContext" "Public AngularTS WorkflowCommandContext contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowCommandContract" "Input and output carried by a workflow command."
     "js/ng.WorkflowCommandDefinition" "Public AngularTS WorkflowCommandDefinition contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowContract" "Labeled type contract carried by a workflow definition and instance."
     "js/ng.WorkflowResult" "Public AngularTS WorkflowResult contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowService" "Public AngularTS WorkflowService contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowSnapshot" "Public AngularTS WorkflowSnapshot contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowSupervisor" "Public AngularTS WorkflowSupervisor contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowSupervisorConfig" "Public AngularTS WorkflowSupervisorConfig contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowSupervisorPersistence" "Public AngularTS WorkflowSupervisorPersistence contract exposed through the global ng namespace for Closure-annotated applications."
     "js/ng.WorkflowSupervisorPersistenceConfig" "Built-in IndexedDB persistence selected by a workflow supervisor."
     "js/ng.WorkflowSupervisorSnapshot" "Public AngularTS WorkflowSupervisorSnapshot contract exposed through the global ng namespace for Closure-annotated applications."}))

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
    "cookie-service-get"
    "cookie-service-get-all"
    "cookie-service-put"
    "cookie-service-remove"
    "event-bus-service-dispose"
    "event-bus-service-get-count"
    "event-bus-service-is-disposed"
    "event-bus-service-publish"
    "event-bus-service-reset"
    "html-canvas-service-invalidate"
    "html-canvas-service-register-root"
    "html-canvas-service-request-paint"
    "http-response-headers"
    "http-service-call"
    "http-service-delete"
    "http-service-get"
    "http-service-head"
    "injection-token-map-dollarhttp"
    "injection-token-map-dollarhttp-param-serializer"
    "injection-token-map-dollarinterpolate"
    "injection-token-map-dollarmachine"
    "injection-token-map-dollarsse"
    "injection-token-map-dollartemplate-request"
    "injection-token-map-dollarweb-transport"
    "injection-token-map-dollarwebsocket"
    "injection-token-map-dollarworkflow"
    "injector-service-has"
    "injector-service-load-new-modules"
    "interpolate-service-call"
    "interpolate-service-end-symbol"
    "interpolate-service-start-symbol"
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
    "log-service-debug"
    "log-service-error"
    "log-service-info"
    "log-service-log"
    "log-service-warn"
    "machine-restore"
    "machine-snapshot"
    "model-dollarbroadcast"
    "model-dollardestroy"
    "model-dollaremit"
    "model-dollarnew"
    "model-dollarnew-isolate"
    "model-dollarsearch-by-name"
    "model-dollartranscluded"
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
    "ng-module-web-component"
    "ng-module-web-transport"
    "ng-module-websocket"
    "ng-module-workflow"
    "rest-backend-request"
    "rest-cache-store-delete"
    "rest-cache-store-delete-prefix"
    "rest-cache-store-get"
    "rest-cache-store-set"
    "rest-service-list"
    "root-scope-service-dollarbroadcast"
    "root-scope-service-dollardestroy"
    "root-scope-service-dollaremit"
    "root-scope-service-dollarnew"
    "root-scope-service-dollarnew-isolate"
    "root-scope-service-dollarsearch-by-name"
    "root-scope-service-dollartranscluded"
    "router-module-app-component"
    "router-module-component"
    "router-module-config"
    "router-module-router"
    "router-module-web-component"
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
    "security-policy-check"
    "service-worker-service-ready"
    "service-worker-service-unregister"
    "service-worker-service-update"
    "sse-connection-close"
    "sse-connection-reconnect"
    "state-registry-service-get"
    "state-registry-service-get-all"
    "state-registry-service-register"
    "state-registry-service-root"
    "state-service-get"
    "storage-backend-get"
    "storage-backend-remove"
    "storage-backend-set"
    "stream-service-consume-json-lines"
    "stream-service-consume-text"
    "stream-service-read-json-lines"
    "stream-service-read-lines"
    "stream-service-read-text"
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
    "transition-redirect"
    "transition-run"
    "transition-to"
    "transition-to-string"
    "transition-valid"
    "wasm-binding-dispose"
    "wasm-resource-bind"
    "wasm-resource-dispose"
    "wasm-service-load"
    "wasm-target-dollarbroadcast"
    "wasm-target-dollardestroy"
    "wasm-target-dollaremit"
    "wasm-target-dollarnew"
    "wasm-target-dollarnew-isolate"
    "wasm-target-dollarsearch-by-name"
    "wasm-target-dollartranscluded"
    "web-socket-connection-close"
    "web-socket-connection-reconnect"
    "web-transport-connection-close"
    "web-transport-connection-create-bidirectional-stream"
    "web-transport-connection-send-text"
    "worker-handle-model"
    "worker-handle-restart"
    "worker-handle-terminate"
    "workflow-snapshot"
    "workflow-supervisor-cancel-all"
    "workflow-supervisor-persist"
    "workflow-supervisor-persistence-load"
    "workflow-supervisor-recover"
    "workflow-supervisor-snapshot"})

(def strict-property-reader-names
  "Extern properties with fully concrete ClojureScript reader signatures."
  #{"angular-dollarevent-bus"
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
    "angular-element-options-modules"
    "angular-element-options-name"
    "angular-element-options-providers"
    "angular-element-options-requires"
    "angular-element-options-subapp"
    "angular-scope-element"
    "angular-service-dollarevent-bus"
    "angular-service-dollarinjector"
    "angular-service-dollarroot-scope"
    "angular-service-dollart"
    "angular-service-scope-element"
    "angular-service-subapps"
    "angular-service-version"
    "angular-subapps"
    "angular-version"
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
    "aria-config-aria-checked"
    "aria-config-aria-current"
    "aria-config-aria-current-token"
    "aria-config-aria-disabled"
    "aria-config-aria-hidden"
    "aria-config-aria-invalid"
    "aria-config-aria-readonly"
    "aria-config-aria-required"
    "aria-config-aria-value"
    "aria-config-bind-keydown"
    "aria-config-bind-role-for-click"
    "aria-config-bind-role-for-state"
    "aria-config-diagnostics"
    "aria-config-tabindex"
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
    "cookie-options-domain"
    "cookie-options-path"
    "cookie-options-samesite"
    "cookie-options-secure"
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
    "event-delivery-policy-context-args"
    "event-delivery-policy-context-listener-index"
    "event-delivery-policy-context-meta"
    "event-delivery-policy-context-operation"
    "event-delivery-policy-context-scope-owned"
    "event-delivery-policy-context-target-alive"
    "event-delivery-policy-context-topic"
    "html-canvas-config-default-mode"
    "html-canvas-config-default-scheduler"
    "html-canvas-config-require-flag"
    "html-canvas-config-throw-on-unsupported"
    "html-canvas-runtime-support-copy-element-image-to-texture"
    "html-canvas-runtime-support-draw-element-image"
    "html-canvas-runtime-support-layout-subtree"
    "html-canvas-runtime-support-modes"
    "html-canvas-runtime-support-paint-event"
    "html-canvas-runtime-support-request-paint"
    "html-canvas-runtime-support-supported"
    "html-canvas-runtime-support-tex-element-image2-d"
    "html-canvas-service-config"
    "html-canvas-service-enabled"
    "html-canvas-service-support"
    "html-canvas-service-supported"
    "http-defaults-headers"
    "http-defaults-with-credentials"
    "http-defaults-xsrf-cookie-name"
    "http-defaults-xsrf-header-name"
    "http-request-config-event-handlers"
    "http-request-config-headers"
    "http-request-config-method"
    "http-request-config-params"
    "http-request-config-response-type"
    "http-request-config-upload-event-handlers"
    "http-request-config-url"
    "http-request-config-with-credentials"
    "http-request-config-xsrf-cookie-name"
    "http-request-config-xsrf-header-name"
    "http-request-options-headers"
    "http-request-options-params"
    "http-request-options-response-type"
    "http-request-options-with-credentials"
    "http-request-options-xsrf-cookie-name"
    "http-request-options-xsrf-header-name"
    "http-response-config"
    "http-response-status"
    "http-response-status-text"
    "http-response-xhr-status"
    "http-service-defaults"
    "http-service-pending-requests"
    "injection-token-map-dollarangular"
    "injection-token-map-dollaranimate"
    "injection-token-map-dollararia"
    "injection-token-map-dollarcookie"
    "injection-token-map-dollardocument"
    "injection-token-map-dollarelement"
    "injection-token-map-dollarevent-bus"
    "injection-token-map-dollarhtml-canvas"
    "injection-token-map-dollarinjector"
    "injection-token-map-dollarlocation"
    "injection-token-map-dollarlog"
    "injection-token-map-dollarroot-element"
    "injection-token-map-dollarroot-scope"
    "injection-token-map-dollarsce"
    "injection-token-map-dollarsce-delegate"
    "injection-token-map-dollarscope"
    "injection-token-map-dollarsecurity"
    "injection-token-map-dollarservice-worker"
    "injection-token-map-dollarstate"
    "injection-token-map-dollarstate-registry"
    "injection-token-map-dollarstream"
    "injection-token-map-dollartemplate-cache"
    "injection-token-map-dollartransitions"
    "injection-token-map-dollarwasm"
    "injection-token-map-dollarweb-component"
    "injection-token-map-dollarwindow"
    "interpolate-config-end-symbol"
    "interpolate-config-start-symbol"
    "interpolation-function-exp"
    "interpolation-function-expressions"
    "location-service-abs-url"
    "location-service-app-base"
    "location-service-app-base-no-file"
    "location-service-base-prefix"
    "location-service-hash-prefix"
    "location-service-html5"
    "log-beacon-config-failure"
    "log-beacon-config-levels"
    "log-beacon-config-serializer"
    "log-beacon-config-url"
    "log-entry-args"
    "log-entry-level"
    "log-entry-timestamp"
    "machine-config-hooks"
    "machine-config-id"
    "machine-config-meta"
    "machine-config-states"
    "machine-contract-state"
    "machine-send-result-ok"
    "machine-send-result-status"
    "machine-send-result-type"
    "model-change-keys"
    "model-change-origin"
    "model-change-snapshot-version"
    "model-dollarid"
    "model-dollarparent"
    "model-dollarproxy"
    "model-dollarroot"
    "model-dollarscopename"
    "model-dollartarget"
    "model-restore-options-mode"
    "model-restore-options-origin"
    "model-sync-options-failure"
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
    "policy-context-meta"
    "policy-decision-meta"
    "policy-decision-reason"
    "realtime-protocol-event-detail-url"
    "realtime-protocol-message-swap"
    "realtime-protocol-message-target"
    "rest-cache-policy-context-cache-key"
    "rest-cache-policy-context-collection-url"
    "rest-cache-policy-context-meta"
    "rest-cache-policy-context-method"
    "rest-cache-policy-context-operation"
    "rest-cache-policy-context-options"
    "rest-cache-policy-context-params"
    "rest-cache-policy-context-url"
    "rest-options-backend"
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
    "root-scope-service-dollarid"
    "root-scope-service-dollarparent"
    "root-scope-service-dollarproxy"
    "root-scope-service-dollarroot"
    "root-scope-service-dollarscopename"
    "root-scope-service-dollartarget"
    "route-contract-params"
    "route-contract-resolves"
    "router-config-case-insensitive"
    "router-config-param-types"
    "router-config-retention"
    "router-config-strict"
    "router-config-view-transitions"
    "router-module-declaration-abstract"
    "router-module-declaration-bindings"
    "router-module-declaration-children"
    "router-module-declaration-dynamic"
    "router-module-declaration-name"
    "router-module-declaration-params"
    "router-module-declaration-policy"
    "router-module-declaration-url"
    "router-module-declaration-views"
    "router-module-name"
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
    "scope-event-current-scope"
    "scope-event-default-prevented"
    "scope-event-name"
    "scope-event-stopped"
    "scope-event-target-scope"
    "scope-service-dollarid"
    "scope-service-dollarparent"
    "scope-service-dollarproxy"
    "scope-service-dollarroot"
    "scope-service-dollarscopename"
    "scope-service-dollartarget"
    "security-config-allow-insecure-origins"
    "security-config-credentials"
    "security-config-fallback"
    "security-credentials-config-basic"
    "security-credentials-config-cookie"
    "security-credentials-config-order"
    "service-worker-config-auto-register"
    "service-worker-config-check-for-updates-on-register"
    "service-worker-message-event-event"
    "service-worker-post-options-target"
    "service-worker-post-options-transfer"
    "service-worker-registration-state-active"
    "service-worker-registration-state-installing"
    "service-worker-registration-state-registered"
    "service-worker-registration-state-scope"
    "service-worker-registration-state-update-via-cache"
    "service-worker-registration-state-waiting"
    "service-worker-request-options-target"
    "service-worker-request-options-timeout"
    "service-worker-request-options-transfer"
    "service-worker-service-controller"
    "service-worker-service-registration"
    "service-worker-service-registration-state"
    "service-worker-service-status"
    "service-worker-service-supported"
    "service-worker-service-update-state"
    "service-worker-update-state-checking"
    "service-worker-update-state-controller-changed"
    "service-worker-update-state-error-code"
    "service-worker-update-state-last-checked-at"
    "service-worker-update-state-phase"
    "service-worker-update-state-registration"
    "service-worker-update-state-waiting"
    "service-worker-update-state-worker"
    "sse-config-event-types"
    "sse-config-heartbeat-timeout"
    "sse-config-max-retries"
    "sse-config-params"
    "sse-config-retry-delay"
    "sse-config-with-credentials"
    "state-declaration-abstract"
    "state-declaration-bindings"
    "state-declaration-dynamic"
    "state-declaration-name"
    "state-declaration-params"
    "state-declaration-policy"
    "state-declaration-url"
    "state-declaration-views"
    "state-policy-declaration-navigation"
    "state-policy-declaration-retention"
    "state-policy-declaration-transition"
    "state-service-current"
    "state-service-params"
    "transition-dollarid"
    "transition-promise"
    "transition-success"
    "wasm-binding-disposed"
    "wasm-binding-name"
    "wasm-binding-options-initial"
    "wasm-binding-options-name"
    "wasm-binding-options-watch"
    "wasm-binding-target"
    "wasm-compile-options-builtins"
    "wasm-compile-options-imported-string-constants"
    "wasm-error-code"
    "wasm-error-stage"
    "wasm-load-options-compile"
    "wasm-load-options-diagnostics"
    "wasm-load-options-imports"
    "wasm-resource-disposed"
    "wasm-resource-error"
    "wasm-resource-instance"
    "wasm-resource-module"
    "wasm-resource-ready"
    "wasm-resource-status"
    "wasm-target-dollarid"
    "wasm-target-dollarparent"
    "wasm-target-dollarproxy"
    "wasm-target-dollarroot"
    "wasm-target-dollarscopename"
    "wasm-target-dollartarget"
    "web-component-config-defaults"
    "web-component-context-host"
    "web-component-context-injector"
    "web-component-context-scope"
    "web-component-context-shadow-root"
    "web-component-input-config-attribute"
    "web-component-input-config-reflect"
    "web-socket-config-event-types"
    "web-socket-config-heartbeat-timeout"
    "web-socket-config-max-retries"
    "web-socket-config-protocols"
    "web-socket-config-retry-delay"
    "web-transport-config-max-retries"
    "web-transport-config-reconnect"
    "web-transport-connection-closed"
    "web-transport-connection-ready"
    "web-transport-connection-transport"
    "web-transport-datagram-event-data"
    "web-transport-reconnect-event-attempt"
    "web-transport-reconnect-event-connection"
    "web-transport-reconnect-event-url"
    "window-service-angular"
    "worker-config-max-restarts"
    "worker-config-restart"
    "worker-config-restart-delay"
    "worker-error-code"
    "worker-error-event"
    "worker-handle-error"
    "worker-handle-restart-count"
    "worker-handle-status"
    "worker-model-message-channel"
    "worker-model-message-type"
    "worker-request-id"
    "worker-request-options-signal"
    "worker-request-options-timeout"
    "worker-request-options-transfer"
    "worker-request-type"
    "worker-response-id"
    "worker-response-ok"
    "worker-response-type"
    "workflow-command-context-command"
    "workflow-command-context-data"
    "workflow-command-context-signal"
    "workflow-command-definition-command-timeout"
    "workflow-command-definition-concurrency"
    "workflow-command-definition-retry"
    "workflow-contract-state"
    "workflow-diagnostics"
    "workflow-history"
    "workflow-id"
    "workflow-result-diagnostics"
    "workflow-result-ok"
    "workflow-result-status"
    "workflow-snapshot-diagnostics"
    "workflow-snapshot-history"
    "workflow-snapshot-id"
    "workflow-snapshot-version"
    "workflow-supervisor-config-auto-persist"
    "workflow-supervisor-config-auto-recover"
    "workflow-supervisor-config-id"
    "workflow-supervisor-diagnostics"
    "workflow-supervisor-id"
    "workflow-supervisor-persistence-config-database"
    "workflow-supervisor-persistence-config-indexed-db"
    "workflow-supervisor-persistence-config-store"
    "workflow-supervisor-persistence-config-type"
    "workflow-supervisor-persistence-config-version"
    "workflow-supervisor-ready"
    "workflow-supervisor-snapshot-diagnostics"
    "workflow-supervisor-snapshot-id"
    "workflow-supervisor-snapshot-status"
    "workflow-supervisor-snapshot-updated-at"
    "workflow-supervisor-snapshot-version"
    "workflow-supervisor-status"})

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
  "Retrieve the injector cached on a bootstrapped DOM element.\n\nParams:\n- element: {!Element}\n\nReturns: {!ng.InjectorService<?>}"
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
  "Create a standalone injector without bootstrapping the DOM.\n\nParams:\n- modules: {!Array<(string|!ng.Injectable)>}\n\nReturns: {!ng.InjectorService<?>}"
  ^js/ng.InjectorService [^js/ng.Angular target ^js/Array modules]
  (.injector target modules))

(defn angular-module
  "The `angular.module` is a global place for creating, registering and retrieving AngularTS modules. All modules (AngularTS core or 3rd party) that should be available to an application must be registered using this mechanism. Passing one argument retrieves an existing ng.NgModule, whereas passing more than one argument creates a new ng.NgModule # Module A module is a collection of services, directives, controllers, filters, workers, WebAssembly modules, and configuration information. `angular.module` is used to configure the auto.$injector `$injector`. ```js // Create a new module let myModule = angular.module('myModule', []); // register a new service myModule.value('appName', 'MyCoolApp'); // configure built-in services with typed object config. myModule.config({ location: { hashPrefix: '!', }, }); ``` Then you can create an injector and load your modules like this: ```js let injector = angular.injector(['ng', 'myModule']) ``` However it's more likely that you'll use the `ng-app` directive or `bootstrap()` to simplify this process.\n\nParams:\n- name: {string}\n- requires: {(!Array<string>|undefined)}\n- configFn: {(!ng.Injectable|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.Angular target ^string name ^js/Array requires ^js/ng.Injectable configFn]
  (.module target name requires configFn))

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
  "Retrieve the injector cached on a bootstrapped DOM element.\n\nParams:\n- element: {!Element}\n\nReturns: {!ng.InjectorService<?>}"
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
  "Create a standalone injector without bootstrapping the DOM.\n\nParams:\n- modules: {!Array<(!Array<function(...?): ?>|function(...?): ?|string)>}\n\nReturns: {!ng.InjectorService<?>}"
  ^js/ng.InjectorService [^js/ng.AngularService target ^js/Array modules]
  (.injector target modules))

(defn angular-service-register-ng-module
  "Registers the configured built-in `ng` module for this runtime instance.\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.AngularService target]
  (.registerNgModule target))

(defn animate-service-add-class
  "Public AnimateService.addClass member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- className: {string}\n- options: {(!ng.AnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^string className ^js/ng.AnimationOptions options]
  (.addClass target element className options))

(defn animate-service-animate
  "Public AnimateService.animate member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- from: {!Object<string, (number|string)>}\n- to: {(!Object<string, (number|string)>|undefined)}\n- className: {(string|undefined)}\n- options: {(!ng.AnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^js/Object from ^js/Object to ^string className ^js/ng.AnimationOptions options]
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
  "Public AnimateService.enter member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- parent: {(!Object|null|undefined)}\n- after: {(!Object|null|undefined)}\n- options: {(!ng.AnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^js/Object parent ^js/Object after ^js/ng.AnimationOptions options]
  (.enter target element parent after options))

(defn animate-service-leave
  "Public AnimateService.leave member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- options: {(!ng.AnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^js/ng.AnimationOptions options]
  (.leave target element options))

(defn animate-service-move
  "Public AnimateService.move member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- parent: {(!Object|null)}\n- after: {(!Object|null|undefined)}\n- options: {(!ng.AnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^js/Object parent ^js/Object after ^js/ng.AnimationOptions options]
  (.move target element parent after options))

(defn animate-service-remove-class
  "Public AnimateService.removeClass member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- className: {string}\n- options: {(!ng.AnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^string className ^js/ng.AnimationOptions options]
  (.removeClass target element className options))

(defn animate-service-set-class
  "Public AnimateService.setClass member exposed by the AngularTS namespace contract.\n\nParams:\n- element: {!Element}\n- add: {string}\n- remove: {string}\n- options: {(!ng.AnimationOptions|undefined)}\n\nReturns: {!ng.AnimationHandle}"
  ^js/ng.AnimationHandle [^js/ng.AnimateService target ^js/Element element ^string add ^string remove ^js/ng.AnimationOptions options]
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

(defn event-bus-service-dispose
  "Dispose the instance, removing all topics and listeners.\n\nReturns: {void}"
  [^js/ng.EventBusService target]
  (.dispose target))

(defn event-bus-service-get-count
  "Get the number of subscribers for a topic. This is the public diagnostic surface for `$eventBus`. It reports active registered listeners only; topic listings, leak reports, and reactive diagnostics are intentionally not exposed.\n\nParams:\n- topic: {string}\n\nReturns: {number}"
  ^number [^js/ng.EventBusService target ^string topic]
  (.getCount target topic))

(defn event-bus-service-is-disposed
  "Checks if instance has been disposed.\n\nReturns: {boolean}"
  ^boolean [^js/ng.EventBusService target]
  (.isDisposed target))

(defn event-bus-service-publish
  "Publish a value to a topic asynchronously. All listeners are invoked in the order they were added. Delivery is scheduled with `queueMicrotask`. Scope-owned listeners are skipped if their scope is destroyed before the queued delivery runs.\n\nParams:\n- topic: {string}\n- var_args: {...?}\n\nReturns: {boolean}"
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

(defn html-canvas-service-invalidate
  "Public HtmlCanvasService.invalidate member exposed by the AngularTS namespace contract.\n\nParams:\n- canvas: {!Object}\n\nReturns: {void}"
  [^js/ng.HtmlCanvasService target ^js/Object canvas]
  (.invalidate target canvas))

(defn html-canvas-service-register-root
  "Public HtmlCanvasService.registerRoot member exposed by the AngularTS namespace contract.\n\nParams:\n- canvas: {!Object}\n- options: {(!Object|undefined)}\n\nReturns: {!Object}"
  ^js/Object [^js/ng.HtmlCanvasService target ^js/Object canvas ^js/Object options]
  (.registerRoot target canvas options))

(defn html-canvas-service-request-paint
  "Public HtmlCanvasService.requestPaint member exposed by the AngularTS namespace contract.\n\nParams:\n- canvas: {!Object}\n\nReturns: {void}"
  [^js/ng.HtmlCanvasService target ^js/Object canvas]
  (.requestPaint target canvas))

(defn http-response-headers
  "Lazy response header reader.\n\nReturns: {!Object<string, string>}"
  ^js/Object [^js/ng.HttpResponse target]
  (.headers target))

(defn http-service-call
  "Invokes the callable HttpService contract.\n\nParams:\n- config: {!ng.HttpRequestConfig}\n\nReturns: {!Promise<!ng.HttpResponse<T>>}"
  ^js/Promise [^js/ng.HttpService target ^js/ng.HttpRequestConfig config]
  (.call target config))

(defn http-service-delete
  "Send a `DELETE` request.\n\nParams:\n- url: {string}\n- config: {(!ng.HttpRequestOptions|undefined)}\n\nReturns: {!Promise<!ng.HttpResponse<T>>}"
  ^js/Promise [^js/ng.HttpService target ^string url ^js/ng.HttpRequestOptions config]
  (.delete target url config))

(defn http-service-get
  "Send a `GET` request.\n\nParams:\n- url: {string}\n- config: {(!ng.HttpRequestOptions|undefined)}\n\nReturns: {!Promise<!ng.HttpResponse<T>>}"
  ^js/Promise [^js/ng.HttpService target ^string url ^js/ng.HttpRequestOptions config]
  (.get target url config))

(defn http-service-head
  "Send a `HEAD` request.\n\nParams:\n- url: {string}\n- config: {(!ng.HttpRequestOptions|undefined)}\n\nReturns: {!Promise<!ng.HttpResponse<T>>}"
  ^js/Promise [^js/ng.HttpService target ^string url ^js/ng.HttpRequestOptions config]
  (.head target url config))

(defn injection-token-map-dollarhttp
  "Public InjectionTokenMap.$http member exposed by the AngularTS namespace contract.\n\nParams:\n- config: {!ng.HttpRequestConfig}\n\nReturns: {!Promise<!ng.HttpResponse<T>>}"
  ^js/Promise [^js/ng.InjectionTokenMap target ^js/ng.HttpRequestConfig config]
  (.$http target config))

(defn injection-token-map-dollarhttp-param-serializer
  "Public InjectionTokenMap.$httpParamSerializer member exposed by the AngularTS namespace contract.\n\nParams:\n- params: {(!Object<string, ?>|undefined)}\n\nReturns: {string}"
  ^string [^js/ng.InjectionTokenMap target ^js/Object params]
  (.$httpParamSerializer target params))

(defn injection-token-map-dollarinterpolate
  "Public InjectionTokenMap.$interpolate member exposed by the AngularTS namespace contract.\n\nParams:\n- text: {string}\n- mustHaveExpression: {(boolean|undefined)}\n- trustedContext: {(string|undefined)}\n- allOrNothing: {(boolean|undefined)}\n\nReturns: {(!ng.InterpolationFunction|undefined)}"
  ^js/ng.InterpolationFunction [^js/ng.InjectionTokenMap target ^string text ^boolean mustHaveExpression ^string trustedContext ^boolean allOrNothing]
  (.$interpolate target text mustHaveExpression trustedContext allOrNothing))

(defn injection-token-map-dollarmachine
  "Public InjectionTokenMap.$machine member exposed by the AngularTS namespace contract.\n\nParams:\n- config: {!Object}\n\nReturns: {!ng.Machine<!Object>}"
  ^js/ng.Machine [^js/ng.InjectionTokenMap target ^js/Object config]
  (.$machine target config))

(defn injection-token-map-dollarsse
  "Public InjectionTokenMap.$sse member exposed by the AngularTS namespace contract.\n\nParams:\n- url: {string}\n- config: {(!ng.SseConfig|undefined)}\n\nReturns: {!ng.SseConnection}"
  ^js/ng.SseConnection [^js/ng.InjectionTokenMap target ^string url ^js/ng.SseConfig config]
  (.$sse target url config))

(defn injection-token-map-dollartemplate-request
  "Public InjectionTokenMap.$templateRequest member exposed by the AngularTS namespace contract.\n\nParams:\n- templateUrl: {string}\n\nReturns: {!Promise<string>}"
  ^js/Promise [^js/ng.InjectionTokenMap target ^string templateUrl]
  (.$templateRequest target templateUrl))

(defn injection-token-map-dollarweb-transport
  "Public InjectionTokenMap.$webTransport member exposed by the AngularTS namespace contract.\n\nParams:\n- url: {string}\n- config: {(!ng.WebTransportConfig|undefined)}\n\nReturns: {!ng.WebTransportConnection}"
  ^js/ng.WebTransportConnection [^js/ng.InjectionTokenMap target ^string url ^js/ng.WebTransportConfig config]
  (.$webTransport target url config))

(defn injection-token-map-dollarwebsocket
  "Public InjectionTokenMap.$websocket member exposed by the AngularTS namespace contract.\n\nParams:\n- url: {string}\n- config: {(!ng.WebSocketConfig|undefined)}\n\nReturns: {!ng.WebSocketConnection}"
  ^js/ng.WebSocketConnection [^js/ng.InjectionTokenMap target ^string url ^js/ng.WebSocketConfig config]
  (.$websocket target url config))

(defn injection-token-map-dollarworkflow
  "Public InjectionTokenMap.$workflow member exposed by the AngularTS namespace contract.\n\nParams:\n- config: {!Object}\n\nReturns: {!ng.Workflow<TContract>}"
  ^js/ng.Workflow [^js/ng.InjectionTokenMap target ^js/Object config]
  (.$workflow target config))

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
  "Return the configured interpolation end delimiter.\n\nReturns: {string}"
  ^string [^js/ng.InterpolateService target]
  (.endSymbol target))

(defn interpolate-service-start-symbol
  "Return the configured interpolation start delimiter.\n\nReturns: {string}"
  ^string [^js/ng.InterpolateService target]
  (.startSymbol target))

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

(defn machine-restore
  "Public Machine.restore member exposed by the AngularTS namespace contract.\n\nParams:\n- snapshot: {?}\n\nReturns: {void}"
  [^js/ng.Machine target ^js/Object snapshot]
  (.restore target snapshot))

(defn machine-snapshot
  "Public Machine.snapshot member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.MachineSnapshot<TContract>}"
  ^js/ng.MachineSnapshot [^js/ng.Machine target]
  (.snapshot target))

(defn model-dollarbroadcast
  "Broadcasts an event downward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
  (^js/ng.ScopeEvent [^js/ng.Model target ^string name]
   (.$broadcast target name))
  (^js/ng.ScopeEvent [^js/ng.Model target ^string name value]
   (.$broadcast target name value))
  (^js/ng.ScopeEvent [^js/ng.Model target ^string name value extra]
   (.$broadcast target name value extra))
  (^js/ng.ScopeEvent [^js/ng.Model target ^string name value extra more]
   (.$broadcast target name value extra more)))

(defn model-dollardestroy
  "Public Model.$destroy member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.Model target]
  (.$destroy target))

(defn model-dollaremit
  "Emits an event upward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
  (^js/ng.ScopeEvent [^js/ng.Model target ^string name]
   (.$emit target name))
  (^js/ng.ScopeEvent [^js/ng.Model target ^string name value]
   (.$emit target name value))
  (^js/ng.ScopeEvent [^js/ng.Model target ^string name value extra]
   (.$emit target name value extra))
  (^js/ng.ScopeEvent [^js/ng.Model target ^string name value extra more]
   (.$emit target name value extra more)))

(defn model-dollarnew
  "Creates a prototypically inherited child scope.\n\nParams:\n- childInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Model target ^js/ng.Scope childInstance]
  (.$new target childInstance))

(defn model-dollarnew-isolate
  "Creates an isolate child scope that does not inherit watchable properties directly.\n\nParams:\n- instance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Model target ^js/ng.Scope instance]
  (.$newIsolate target instance))

(defn model-dollarsearch-by-name
  "Searches the scope tree for a scope registered under the provided name.\n\nParams:\n- name: {string}\n\nReturns: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.Model target ^string name]
  (.$searchByName target name))

(defn model-dollartranscluded
  "Creates a transcluded child scope linked to this scope and an optional parent instance.\n\nParams:\n- parentInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Model target ^js/ng.Scope parentInstance]
  (.$transcluded target parentInstance))

(defn ng-model-controller-dollarcommit-view-value
  "Commit a pending update to the `$modelValue`. Updates may be pending by a debounced event or because the input is waiting for a some future event defined in `ng-model-options`. this method is rarely needed as `NgModelController` usually handles calling this in response to input events.\n\nReturns: {void}"
  [^js/ng.NgModelController target]
  (.$commitViewValue target))

(defn ng-model-controller-dollaroverride-model-options
  "Override the current model options settings programmatically. The previous `ModelOptions` value will not be modified. Instead, a new `ModelOptions` object will inherit from the previous one overriding or inheriting settings that are defined in the given parameter. See `ngModelOptions` for information about what options can be specified and how model option inheritance works. <div class=\"alert alert-warning\"> **Note:** this function only affects the options set on the `ngModelController`, and not the options on the `ngModelOptions` directive from which they might have been obtained initially. </div> <div class=\"alert alert-danger\"> **Note:** it is not possible to override the `getterSetter` option. </div>\n\nParams:\n- options: {!Object}\n\nReturns: {void}"
  [^js/ng.NgModelController target ^js/Object options]
  (.$overrideModelOptions target options))

(defn ng-model-controller-dollarprocess-model-value
  "Runs the model -> view pipeline on the current {@link NgModelController.$modelValue$modelValue}. The following actions are performed by this method: - the `$modelValue` is run through the {@link NgModelController.$formatters$formatters} and the result is set to the {@link NgModelController.$viewValue$viewValue} - the `ng-empty` or `ng-not-empty` class is set on the element - if the `$viewValue` has changed: - {@link NgModelController.$render$render} is called on the control - the {@link NgModelController.$validators$validators} are run and the validation status is set. This method is called by ngModel internally when the bound scope value changes. Application developers usually do not have to call this function themselves. This function can be used when the `$viewValue` or the rendered DOM value are not correctly formatted and the `$modelValue` must be run through the `$formatters` again.\n\nReturns: {void}"
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
  "Runs each of the registered validators (first synchronous validators and then asynchronous validators). If the validity changes to invalid, the model will be set to `undefined`, unless `ngModelOptions.allowInvalid` is `true`. If the validity changes to valid, it will set the model to the last available valid `$modelValue`, i.e. either the last parsed value or the last value set from the scope.\n\nReturns: {void}"
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
  "Declare built-in AngularTS service configuration during the config phase.\n\nParams:\n- config: {!Object}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^js/Object config]
  (.config target config))

(defn ng-module-controller
  "The $controller service is used by Angular to create new controllers. Named controllers are stored in the owning runtime's controller registry.\n\nParams:\n- name: {string}\n- ctlFn: {!ng.Injectable}\n\nReturns: {!ng.NgModule}"
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
  "Register a named reactive state machine as an injectable service. The machine is created by `$machine` when the named service is requested. The returned instance is not tied to any one scope lifetime; it registers with AngularTS scope proxies when assigned to a controller or scope.\n\nParams:\n- name: {string}\n- config: {(!Array<function(): !Object>|!Object|function(): !Object)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/Object config]
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
  "Register a pre-configured SSE connection as an injectable service. The connection is created by `$sse` when the named service is requested.\n\nParams:\n- name: {string}\n- url: {string}\n- config: {(!Array<function(...?): !ng.SseConfig>|!ng.SseConfig|function(...?): !ng.SseConfig|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^string url ^js/Object config]
  (.sse target name url config))

(defn ng-module-web-component
  "Register a user-authored native custom element backed by an AngularTS scope. The element class must extend `ScopeElement`. Its static template, shadow, scope, inputs, and isolate properties configure the AngularTS wiring.\n\nParams:\n- name: {string}\n- elementClass: {!ng.ScopeElementConstructor<T>}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/ng.ScopeElementConstructor elementClass]
  (.webComponent target name elementClass))

(defn ng-module-web-transport
  "Register a pre-configured WebTransport connection as an injectable service. The connection is created by `$webTransport` when the named service is requested.\n\nParams:\n- name: {string}\n- url: {string}\n- config: {(!Array<function(...?): !ng.WebTransportConfig>|!ng.WebTransportConfig|function(...?): !ng.WebTransportConfig|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^string url ^js/Object config]
  (.webTransport target name url config))

(defn ng-module-websocket
  "Register a pre-configured WebSocket connection as an injectable service. The connection is created by `$websocket` when the named service is requested.\n\nParams:\n- name: {string}\n- url: {string}\n- config: {(!Array<function(...?): !ng.WebSocketConfig>|!ng.WebSocketConfig|function(...?): !ng.WebSocketConfig|undefined)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^string url ^js/Object config]
  (.websocket target name url config))

(defn ng-module-workflow
  "Register a named workflow as an injectable service. The workflow is created by `$workflow` when the named service is requested. Workflow behavior remains local to its `WorkflowConfig`; the provider does not apply global workflow defaults.\n\nParams:\n- name: {string}\n- config: {(!Array<function(): TDefinition>|TDefinition|function(): TDefinition)}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.NgModule target ^string name ^js/Object config]
  (.workflow target name config))

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

(defn rest-service-list
  "Fetch a collection. Parameters are used for URI template expansion and are also forwarded to `$http` as query params. Non-array responses resolve to an empty array.\n\nParams:\n- params: {(!Object<string, ?>|undefined)}\n\nReturns: {!Promise<!Array<T>>}"
  ^js/Promise [^js/ng.RestService target ^js/Object params]
  (.list target params))

(defn root-scope-service-dollarbroadcast
  "Broadcasts an event downward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
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
  "Emits an event upward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name]
   (.$emit target name))
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name value]
   (.$emit target name value))
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name value extra]
   (.$emit target name value extra))
  (^js/ng.ScopeEvent [^js/ng.RootScopeService target ^string name value extra more]
   (.$emit target name value extra more)))

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

(defn router-module-app-component
  "Register an options-backed application host custom element. The definition is installed when the module runs. The host element is a native custom element backed by an AngularTS child scope.\n\nParams:\n- name: {string}\n- options: {!ng.AppComponentOptions<T>}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.RouterModule target ^string name ^js/ng.AppComponentOptions options]
  (.appComponent target name options))

(defn router-module-component
  "Public RouterModule.component member exposed by the AngularTS namespace contract.\n\nParams:\n- name: {string}\n- options: {!ng.Component}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.RouterModule target ^string name ^js/ng.Component options]
  (.component target name options))

(defn router-module-config
  "Declare built-in AngularTS service configuration during the config phase.\n\nParams:\n- config: {!Object}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.RouterModule target ^js/Object config]
  (.config target config))

(defn router-module-router
  "Register a router tree while preserving this module's route map.\n\nParams:\n- declaration: {!Object}\n\nReturns: {!Object}"
  ^js/Object [^js/ng.RouterModule target ^js/Object declaration]
  (.router target declaration))

(defn router-module-web-component
  "Register a user-authored native custom element backed by an AngularTS scope. The element class must extend `ScopeElement`. Its static template, shadow, scope, inputs, and isolate properties configure the AngularTS wiring.\n\nParams:\n- name: {string}\n- elementClass: {!ng.ScopeElementConstructor<T>}\n\nReturns: {!ng.NgModule}"
  ^js/ng.NgModule [^js/ng.RouterModule target ^string name ^js/ng.ScopeElementConstructor elementClass]
  (.webComponent target name elementClass))

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
  "Broadcasts an event downward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
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
  "Emits an event upward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
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
  "Broadcasts an event downward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
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
  "Emits an event upward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
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

(defn security-policy-check
  "Public SecurityPolicy.check member exposed by the AngularTS namespace contract.\n\nParams:\n- context: {!Object}\n\nReturns: {!Object}"
  ^js/Object [^js/ng.SecurityPolicy target ^js/Object context]
  (.check target context))

(defn service-worker-service-ready
  "Resolve when the browser reports an active ready registration.\n\nReturns: {!Promise<!Object>}"
  ^js/Promise [^js/ng.ServiceWorkerService target]
  (.ready target))

(defn service-worker-service-unregister
  "Unregister the latest known registration.\n\nReturns: {!Promise<boolean>}"
  ^js/Promise [^js/ng.ServiceWorkerService target]
  (.unregister target))

(defn service-worker-service-update
  "Ask the latest known registration to check for an updated worker.\n\nReturns: {!Promise<!Object>}"
  ^js/Promise [^js/ng.ServiceWorkerService target]
  (.update target))

(defn sse-connection-close
  "Manually close the SSE connection and stop all reconnect attempts\n\nReturns: {void}"
  [^js/ng.SseConnection target]
  (.close target))

(defn sse-connection-reconnect
  "Manually restart the SSE connection.\n\nReturns: {void}"
  [^js/ng.SseConnection target]
  (.reconnect target))

(defn state-registry-service-get
  "Public StateRegistryService.get member exposed by the AngularTS namespace contract.\n\nReturns: {!Array<!ng.StateDeclaration>}"
  ^js/Array [^js/ng.StateRegistryService target]
  (.get target))

(defn state-registry-service-get-all
  "Public StateRegistryService.getAll member exposed by the AngularTS namespace contract.\n\nReturns: {!Array<!ng.StateDeclaration>}"
  ^js/Array [^js/ng.StateRegistryService target]
  (.getAll target))

(defn state-registry-service-register
  "Public StateRegistryService.register member exposed by the AngularTS namespace contract.\n\nParams:\n- stateDefinition: {!ng.StateDeclaration}\n\nReturns: {!ng.StateDeclaration}"
  ^js/ng.StateDeclaration [^js/ng.StateRegistryService target ^js/ng.StateDeclaration stateDefinition]
  (.register target stateDefinition))

(defn state-registry-service-root
  "Public StateRegistryService.root member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.StateDeclaration}"
  ^js/ng.StateDeclaration [^js/ng.StateRegistryService target]
  (.root target))

(defn state-service-get
  "Get all states or a matching public state declaration.\n\nReturns: {!Array<!ng.StateDeclaration>}"
  ^js/Array [^js/ng.StateService target]
  (.get target))

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

(defn transition-redirect
  "Creates a new transition that is a redirection of the current one. This transition can be returned from a [[TransitionService]] hook to redirect a transition to a new state and/or set of parameters.\n\nParams:\n- targetState: {!Object}\n\nReturns: {!ng.Transition<!Object<string, !Object>, !Object>}"
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

(defn wasm-binding-dispose
  "Public WasmBinding.dispose member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.WasmBinding target]
  (.dispose target))

(defn wasm-resource-bind
  "Public WasmResource.bind member exposed by the AngularTS namespace contract.\n\nParams:\n- target: {TTarget}\n- options: {(!ng.WasmBindingOptions|undefined)}\n\nReturns: {!Promise<!ng.WasmBinding<TTarget>>}"
  ^js/Promise [^js/ng.WasmResource target ^js/ng.Scope target ^js/ng.WasmBindingOptions options]
  (.bind target target options))

(defn wasm-resource-dispose
  "Public WasmResource.dispose member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.WasmResource target]
  (.dispose target))

(defn wasm-service-load
  "Loads one module and returns its owned resource.\n\nParams:\n- options: {!ng.WasmLoadOptions}\n\nReturns: {!ng.WasmResource<TExports>}"
  ^js/ng.WasmResource [^js/ng.WasmService target ^js/ng.WasmLoadOptions options]
  (.load target options))

(defn wasm-target-dollarbroadcast
  "Broadcasts an event downward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
  (^js/ng.ScopeEvent [^js/ng.WasmTarget target ^string name]
   (.$broadcast target name))
  (^js/ng.ScopeEvent [^js/ng.WasmTarget target ^string name value]
   (.$broadcast target name value))
  (^js/ng.ScopeEvent [^js/ng.WasmTarget target ^string name value extra]
   (.$broadcast target name value extra))
  (^js/ng.ScopeEvent [^js/ng.WasmTarget target ^string name value extra more]
   (.$broadcast target name value extra more)))

(defn wasm-target-dollardestroy
  "Public WasmTarget.$destroy member exposed by the AngularTS namespace contract.\n\nReturns: {void}"
  [^js/ng.WasmTarget target]
  (.$destroy target))

(defn wasm-target-dollaremit
  "Emits an event upward through the scope hierarchy.\n\nParams:\n- name: {string}\n- var_args: {...?}\n\nReturns: {!ng.ScopeEvent}"
  (^js/ng.ScopeEvent [^js/ng.WasmTarget target ^string name]
   (.$emit target name))
  (^js/ng.ScopeEvent [^js/ng.WasmTarget target ^string name value]
   (.$emit target name value))
  (^js/ng.ScopeEvent [^js/ng.WasmTarget target ^string name value extra]
   (.$emit target name value extra))
  (^js/ng.ScopeEvent [^js/ng.WasmTarget target ^string name value extra more]
   (.$emit target name value extra more)))

(defn wasm-target-dollarnew
  "Creates a prototypically inherited child scope.\n\nParams:\n- childInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.WasmTarget target ^js/ng.Scope childInstance]
  (.$new target childInstance))

(defn wasm-target-dollarnew-isolate
  "Creates an isolate child scope that does not inherit watchable properties directly.\n\nParams:\n- instance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.WasmTarget target ^js/ng.Scope instance]
  (.$newIsolate target instance))

(defn wasm-target-dollarsearch-by-name
  "Searches the scope tree for a scope registered under the provided name.\n\nParams:\n- name: {string}\n\nReturns: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.WasmTarget target ^string name]
  (.$searchByName target name))

(defn wasm-target-dollartranscluded
  "Creates a transcluded child scope linked to this scope and an optional parent instance.\n\nParams:\n- parentInstance: {(!ng.Scope|undefined)}\n\nReturns: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.WasmTarget target ^js/ng.Scope parentInstance]
  (.$transcluded target parentInstance))

(defn web-socket-connection-close
  "Close the WebSocket connection and stop reconnect attempts.\n\nReturns: {void}"
  [^js/ng.WebSocketConnection target]
  (.close target))

(defn web-socket-connection-reconnect
  "Manually restart the WebSocket connection.\n\nReturns: {void}"
  [^js/ng.WebSocketConnection target]
  (.reconnect target))

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

(defn worker-handle-model
  "Adapt this handle to the standard model synchronization contract.\n\nParams:\n- channel: {(string|undefined)}\n\nReturns: {!ng.ModelSyncTarget<T>}"
  ^js/ng.ModelSyncTarget [^js/ng.WorkerHandle target ^string channel]
  (.model target channel))

(defn worker-handle-restart
  "Replace the native worker unless this connection was terminated.\n\nReturns: {void}"
  [^js/ng.WorkerHandle target]
  (.restart target))

(defn worker-handle-terminate
  "Permanently terminate this managed connection.\n\nReturns: {void}"
  [^js/ng.WorkerHandle target]
  (.terminate target))

(defn workflow-snapshot
  "Public Workflow.snapshot member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.WorkflowSnapshot<TContract>}"
  ^js/ng.WorkflowSnapshot [^js/ng.Workflow target]
  (.snapshot target))

(defn workflow-supervisor-cancel-all
  "Public WorkflowSupervisor.cancelAll member exposed by the AngularTS namespace contract.\n\nReturns: {number}"
  ^number [^js/ng.WorkflowSupervisor target]
  (.cancelAll target))

(defn workflow-supervisor-persist
  "Public WorkflowSupervisor.persist member exposed by the AngularTS namespace contract.\n\nReturns: {!Promise<!ng.WorkflowSupervisorSnapshot<!Object<string, ?>>>}"
  ^js/Promise [^js/ng.WorkflowSupervisor target]
  (.persist target))

(defn workflow-supervisor-persistence-load
  "Public WorkflowSupervisorPersistence.load member exposed by the AngularTS namespace contract.\n\nParams:\n- id: {string}\n\nReturns: {!Promise<(TSnapshot|undefined)>}"
  ^js/Promise [^js/ng.WorkflowSupervisorPersistence target ^string id]
  (.load target id))

(defn workflow-supervisor-recover
  "Public WorkflowSupervisor.recover member exposed by the AngularTS namespace contract.\n\nReturns: {!Promise<(!ng.WorkflowSupervisorSnapshot<!Object<string, ?>>|undefined)>}"
  ^js/Promise [^js/ng.WorkflowSupervisor target]
  (.recover target))

(defn workflow-supervisor-snapshot
  "Public WorkflowSupervisor.snapshot member exposed by the AngularTS namespace contract.\n\nReturns: {!ng.WorkflowSupervisorSnapshot<!Object<string, ?>>}"
  ^js/ng.WorkflowSupervisorSnapshot [^js/ng.WorkflowSupervisor target]
  (.snapshot target))

(defn angular-dollarevent-bus
  "Application-wide event bus, available after bootstrap providers are created.\n\nType: {!ng.EventBusService}"
  ^js/ng.EventBusService [^js/ng.Angular target]
  (.-$eventBus target))

(defn angular-dollarinjector
  "Application injector, available after `bootstrap()` or `injector()` completes.\n\nType: {!ng.InjectorService<?>}"
  ^js/ng.InjectorService [^js/ng.Angular target]
  (.-$injector target))

(defn angular-dollarroot-scope
  "Root scope for the bootstrapped application.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Angular target]
  (.-$rootScope target))

(defn angular-dollart
  "Public injection token names keyed by token value.\n\nType: {!Object}"
  ^js/Object [^js/ng.Angular target]
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
  "Injector used by all instances of this custom element definition.\n\nType: {!ng.InjectorService<?>}"
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

(defn angular-element-options-modules
  "Framework modules included by the composed `ng` module.\n\nType: {(!Array<function(!Object): !ng.NgModule>|undefined)}"
  ^js/Array [^js/ng.AngularElementOptions target]
  (.-modules target))

(defn angular-element-options-name
  "Name of the composed root module. Defaults to `ng`.\n\nType: {(string|undefined)}"
  ^string [^js/ng.AngularElementOptions target]
  (.-name target))

(defn angular-element-options-providers
  "Additional providers registered in the composed root module.\n\nType: {(!Object<string, (function(...?): ?|function(new: ?, ...?))>|undefined)}"
  ^js/Object [^js/ng.AngularElementOptions target]
  (.-providers target))

(defn angular-element-options-requires
  "Additional application modules required by the composed root module.\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.AngularElementOptions target]
  (.-requires target))

(defn angular-element-options-subapp
  "Treat this runtime as a sub-application of the current host runtime.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.AngularElementOptions target]
  (.-subapp target))

(defn angular-scope-element
  "Base class for user-authored AngularTS custom elements.\n\nType: {!ng.ScopeElement}"
  ^js/ng.ScopeElement [^js/ng.Angular target]
  (.-ScopeElement target))

(defn angular-service-dollarevent-bus
  "Application-wide event bus, available after bootstrap providers are created.\n\nType: {!ng.EventBusService}"
  ^js/ng.EventBusService [^js/ng.AngularService target]
  (.-$eventBus target))

(defn angular-service-dollarinjector
  "Application injector, available after `bootstrap()` or `injector()` completes.\n\nType: {!ng.InjectorService<?>}"
  ^js/ng.InjectorService [^js/ng.AngularService target]
  (.-$injector target))

(defn angular-service-dollarroot-scope
  "Root scope for the bootstrapped application.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.AngularService target]
  (.-$rootScope target))

(defn angular-service-dollart
  "Public injection token names keyed by token value.\n\nType: {!Object}"
  ^js/Object [^js/ng.AngularService target]
  (.-$t target))

(defn angular-service-scope-element
  "Base class for user-authored AngularTS custom elements.\n\nType: {!ng.ScopeElement}"
  ^js/ng.ScopeElement [^js/ng.AngularService target]
  (.-ScopeElement target))

(defn angular-service-subapps
  "Sub-application instances created when multiple `ng-app` roots are initialized.\n\nType: {!Array<!Object>}"
  ^js/Array [^js/ng.AngularService target]
  (.-subapps target))

(defn angular-service-version
  "AngularTS version string replaced at build time.\n\nType: {string}"
  ^string [^js/ng.AngularService target]
  (.-version target))

(defn angular-subapps
  "Sub-application instances created when multiple `ng-app` roots are initialized.\n\nType: {!Array<!ng.Angular>}"
  ^js/Array [^js/ng.Angular target]
  (.-subapps target))

(defn angular-version
  "AngularTS version string replaced at build time.\n\nType: {string}"
  ^string [^js/ng.Angular target]
  (.-version target))

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

(defn aria-config-aria-checked
  "Public AriaConfig.ariaChecked member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-ariaChecked target))

(defn aria-config-aria-current
  "Public AriaConfig.ariaCurrent member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-ariaCurrent target))

(defn aria-config-aria-current-token
  "Public AriaConfig.ariaCurrentToken member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.AriaConfig target]
  (.-ariaCurrentToken target))

(defn aria-config-aria-disabled
  "Public AriaConfig.ariaDisabled member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-ariaDisabled target))

(defn aria-config-aria-hidden
  "Public AriaConfig.ariaHidden member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-ariaHidden target))

(defn aria-config-aria-invalid
  "Public AriaConfig.ariaInvalid member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-ariaInvalid target))

(defn aria-config-aria-readonly
  "Public AriaConfig.ariaReadonly member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-ariaReadonly target))

(defn aria-config-aria-required
  "Public AriaConfig.ariaRequired member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-ariaRequired target))

(defn aria-config-aria-value
  "Public AriaConfig.ariaValue member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-ariaValue target))

(defn aria-config-bind-keydown
  "Public AriaConfig.bindKeydown member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-bindKeydown target))

(defn aria-config-bind-role-for-click
  "Public AriaConfig.bindRoleForClick member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-bindRoleForClick target))

(defn aria-config-bind-role-for-state
  "Public AriaConfig.bindRoleForState member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-bindRoleForState target))

(defn aria-config-diagnostics
  "Public AriaConfig.diagnostics member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-diagnostics target))

(defn aria-config-tabindex
  "Public AriaConfig.tabindex member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.AriaConfig target]
  (.-tabindex target))

(defn cached-rest-backend-options-cache
  "Async cache store, such as IndexedDB, Cache API, or memory.\n\nType: {!ng.RestCacheStore}"
  ^js/ng.RestCacheStore [^js/ng.CachedRestBackendOptions target]
  (.-cache target))

(defn cached-rest-backend-options-network
  "Backend used for authoritative network responses and writes.\n\nType: {!ng.RestBackend}"
  ^js/ng.RestBackend [^js/ng.CachedRestBackendOptions target]
  (.-network target))

(defn cached-rest-backend-options-strategy
  "Default read strategy used for cacheable GET requests.\n\nType: {(string|undefined)}"
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

(defn event-delivery-policy-context-args
  "Public EventDeliveryPolicyContext.args member exposed by the AngularTS namespace contract.\n\nType: {!Array<?>}"
  ^js/Array [^js/ng.EventDeliveryPolicyContext target]
  (.-args target))

(defn event-delivery-policy-context-listener-index
  "Public EventDeliveryPolicyContext.listenerIndex member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.EventDeliveryPolicyContext target]
  (.-listenerIndex target))

(defn event-delivery-policy-context-meta
  "Public EventDeliveryPolicyContext.meta member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.EventDeliveryPolicyContext target]
  (.-meta target))

(defn event-delivery-policy-context-operation
  "Public EventDeliveryPolicyContext.operation member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.EventDeliveryPolicyContext target]
  (.-operation target))

(defn event-delivery-policy-context-scope-owned
  "Public EventDeliveryPolicyContext.scopeOwned member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.EventDeliveryPolicyContext target]
  (.-scopeOwned target))

(defn event-delivery-policy-context-target-alive
  "Public EventDeliveryPolicyContext.targetAlive member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.EventDeliveryPolicyContext target]
  (.-targetAlive target))

(defn event-delivery-policy-context-topic
  "Public EventDeliveryPolicyContext.topic member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.EventDeliveryPolicyContext target]
  (.-topic target))

(defn html-canvas-config-default-mode
  "Default canvas rendering target for directives that do not specify one.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HtmlCanvasConfig target]
  (.-defaultMode target))

(defn html-canvas-config-default-scheduler
  "Default invalidation scheduler for canvas-backed HTML layers.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HtmlCanvasConfig target]
  (.-defaultScheduler target))

(defn html-canvas-config-require-flag
  "Require an explicit browser/engine feature flag before activation. This stays strict by default while the browser API is experimental.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.HtmlCanvasConfig target]
  (.-requireFlag target))

(defn html-canvas-config-throw-on-unsupported
  "Throw when HTML-in-Canvas is enabled on a runtime that does not support the native browser feature. AngularTS does not provide a fallback renderer.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.HtmlCanvasConfig target]
  (.-throwOnUnsupported target))

(defn html-canvas-runtime-support-copy-element-image-to-texture
  "Native WebGPU `copyElementImageToTexture(...)` support.\n\nType: {boolean}"
  ^boolean [^js/ng.HtmlCanvasRuntimeSupport target]
  (.-copyElementImageToTexture target))

(defn html-canvas-runtime-support-draw-element-image
  "Native 2D `drawElementImage(...)` support.\n\nType: {boolean}"
  ^boolean [^js/ng.HtmlCanvasRuntimeSupport target]
  (.-drawElementImage target))

(defn html-canvas-runtime-support-layout-subtree
  "Native layout-subtree support or an implied drawing primitive.\n\nType: {boolean}"
  ^boolean [^js/ng.HtmlCanvasRuntimeSupport target]
  (.-layoutSubtree target))

(defn html-canvas-runtime-support-modes
  "Supported rendering modes for the current runtime.\n\nType: {!Object}"
  ^js/Object [^js/ng.HtmlCanvasRuntimeSupport target]
  (.-modes target))

(defn html-canvas-runtime-support-paint-event
  "Native canvas `paint` event support.\n\nType: {boolean}"
  ^boolean [^js/ng.HtmlCanvasRuntimeSupport target]
  (.-paintEvent target))

(defn html-canvas-runtime-support-request-paint
  "Native canvas `requestPaint()` support.\n\nType: {boolean}"
  ^boolean [^js/ng.HtmlCanvasRuntimeSupport target]
  (.-requestPaint target))

(defn html-canvas-runtime-support-supported
  "Whether any native HTML-in-Canvas rendering mode is available.\n\nType: {boolean}"
  ^boolean [^js/ng.HtmlCanvasRuntimeSupport target]
  (.-supported target))

(defn html-canvas-runtime-support-tex-element-image2-d
  "Native WebGL `texElementImage2D(...)` support.\n\nType: {boolean}"
  ^boolean [^js/ng.HtmlCanvasRuntimeSupport target]
  (.-texElementImage2D target))

(defn html-canvas-service-config
  "Public HtmlCanvasService.config member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.HtmlCanvasService target]
  (.-config target))

(defn html-canvas-service-enabled
  "Public HtmlCanvasService.enabled member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.HtmlCanvasService target]
  (.-enabled target))

(defn html-canvas-service-support
  "Public HtmlCanvasService.support member exposed by the AngularTS namespace contract.\n\nType: {!ng.HtmlCanvasRuntimeSupport}"
  ^js/ng.HtmlCanvasRuntimeSupport [^js/ng.HtmlCanvasService target]
  (.-support target))

(defn html-canvas-service-supported
  "Public HtmlCanvasService.supported member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.HtmlCanvasService target]
  (.-supported target))

(defn http-defaults-headers
  "Default headers merged into each request.\n\nType: {(!Object<string, (!Object<string, (boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|undefined)}"
  ^js/Object [^js/ng.HttpDefaults target]
  (.-headers target))

(defn http-defaults-with-credentials
  "Whether cross-site requests should include credentials by default.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.HttpDefaults target]
  (.-withCredentials target))

(defn http-defaults-xsrf-cookie-name
  "Cookie name used when reading the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpDefaults target]
  (.-xsrfCookieName target))

(defn http-defaults-xsrf-header-name
  "Header name used when sending the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpDefaults target]
  (.-xsrfHeaderName target))

(defn http-request-config-event-handlers
  "Event handlers notified by the underlying transport.\n\nType: {(!Object<string, (!Object|function(!Event): void|undefined)>|undefined)}"
  ^js/Object [^js/ng.HttpRequestConfig target]
  (.-eventHandlers target))

(defn http-request-config-headers
  "Default headers merged into each request.\n\nType: {(!Object<string, (!Object<string, (boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|undefined)}"
  ^js/Object [^js/ng.HttpRequestConfig target]
  (.-headers target))

(defn http-request-config-method
  "HTTP verb to use for the request.\n\nType: {string}"
  ^string [^js/ng.HttpRequestConfig target]
  (.-method target))

(defn http-request-config-params
  "Query parameters appended to the request URL.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.HttpRequestConfig target]
  (.-params target))

(defn http-request-config-response-type
  "Native fetch response body reader hint.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpRequestConfig target]
  (.-responseType target))

(defn http-request-config-upload-event-handlers
  "Upload event handlers. Not used by the fetch transport.\n\nType: {(!Object<string, (!Object|function(!Event): void|undefined)>|undefined)}"
  ^js/Object [^js/ng.HttpRequestConfig target]
  (.-uploadEventHandlers target))

(defn http-request-config-url
  "Request URL. Query parameters from `params` are appended to this URL.\n\nType: {string}"
  ^string [^js/ng.HttpRequestConfig target]
  (.-url target))

(defn http-request-config-with-credentials
  "Whether cross-site requests should include credentials by default.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.HttpRequestConfig target]
  (.-withCredentials target))

(defn http-request-config-xsrf-cookie-name
  "Cookie name used when reading the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpRequestConfig target]
  (.-xsrfCookieName target))

(defn http-request-config-xsrf-header-name
  "Header name used when sending the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpRequestConfig target]
  (.-xsrfHeaderName target))

(defn http-request-options-headers
  "Default headers merged into each request.\n\nType: {(!Object<string, (!Object<string, (boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|boolean|function(!ng.HttpRequestConfig): ?|null|number|string|undefined)>|undefined)}"
  ^js/Object [^js/ng.HttpRequestOptions target]
  (.-headers target))

(defn http-request-options-params
  "Query parameters appended to the request URL.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.HttpRequestOptions target]
  (.-params target))

(defn http-request-options-response-type
  "Native fetch response body reader hint.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpRequestOptions target]
  (.-responseType target))

(defn http-request-options-with-credentials
  "Whether cross-site requests should include credentials by default.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.HttpRequestOptions target]
  (.-withCredentials target))

(defn http-request-options-xsrf-cookie-name
  "Cookie name used when reading the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpRequestOptions target]
  (.-xsrfCookieName target))

(defn http-request-options-xsrf-header-name
  "Header name used when sending the XSRF token.\n\nType: {(string|undefined)}"
  ^string [^js/ng.HttpRequestOptions target]
  (.-xsrfHeaderName target))

(defn http-response-config
  "Request configuration that produced this response.\n\nType: {!ng.HttpRequestConfig}"
  ^js/ng.HttpRequestConfig [^js/ng.HttpResponse target]
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
  "Live runtime defaults initialized from app-level `$http` configuration.\n\nType: {!ng.HttpDefaults}"
  ^js/ng.HttpDefaults [^js/ng.HttpService target]
  (.-defaults target))

(defn http-service-pending-requests
  "Requests currently in flight.\n\nType: {!Array<!ng.HttpRequestConfig>}"
  ^js/Array [^js/ng.HttpService target]
  (.-pendingRequests target))

(defn injection-token-map-dollarangular
  "Public InjectionTokenMap.$angular member exposed by the AngularTS namespace contract.\n\nType: {!ng.Angular}"
  ^js/ng.Angular [^js/ng.InjectionTokenMap target]
  (.-$angular target))

(defn injection-token-map-dollaranimate
  "Public InjectionTokenMap.$animate member exposed by the AngularTS namespace contract.\n\nType: {!ng.AnimateService}"
  ^js/ng.AnimateService [^js/ng.InjectionTokenMap target]
  (.-$animate target))

(defn injection-token-map-dollararia
  "Public InjectionTokenMap.$aria member exposed by the AngularTS namespace contract.\n\nType: {!ng.AriaService}"
  ^js/ng.AriaService [^js/ng.InjectionTokenMap target]
  (.-$aria target))

(defn injection-token-map-dollarcookie
  "Public InjectionTokenMap.$cookie member exposed by the AngularTS namespace contract.\n\nType: {!ng.CookieService}"
  ^js/ng.CookieService [^js/ng.InjectionTokenMap target]
  (.-$cookie target))

(defn injection-token-map-dollardocument
  "Public InjectionTokenMap.$document member exposed by the AngularTS namespace contract.\n\nType: {!Document}"
  ^js/Document [^js/ng.InjectionTokenMap target]
  (.-$document target))

(defn injection-token-map-dollarelement
  "Public InjectionTokenMap.$element member exposed by the AngularTS namespace contract.\n\nType: {!Element}"
  ^js/Element [^js/ng.InjectionTokenMap target]
  (.-$element target))

(defn injection-token-map-dollarevent-bus
  "Public InjectionTokenMap.$eventBus member exposed by the AngularTS namespace contract.\n\nType: {!ng.EventBusService}"
  ^js/ng.EventBusService [^js/ng.InjectionTokenMap target]
  (.-$eventBus target))

(defn injection-token-map-dollarhtml-canvas
  "Public InjectionTokenMap.$htmlCanvas member exposed by the AngularTS namespace contract.\n\nType: {!ng.HtmlCanvasService}"
  ^js/ng.HtmlCanvasService [^js/ng.InjectionTokenMap target]
  (.-$htmlCanvas target))

(defn injection-token-map-dollarinjector
  "Public InjectionTokenMap.$injector member exposed by the AngularTS namespace contract.\n\nType: {!ng.InjectorService<?>}"
  ^js/ng.InjectorService [^js/ng.InjectionTokenMap target]
  (.-$injector target))

(defn injection-token-map-dollarlocation
  "Public InjectionTokenMap.$location member exposed by the AngularTS namespace contract.\n\nType: {!ng.LocationService}"
  ^js/ng.LocationService [^js/ng.InjectionTokenMap target]
  (.-$location target))

(defn injection-token-map-dollarlog
  "Public InjectionTokenMap.$log member exposed by the AngularTS namespace contract.\n\nType: {!ng.LogService}"
  ^js/ng.LogService [^js/ng.InjectionTokenMap target]
  (.-$log target))

(defn injection-token-map-dollarroot-element
  "Public InjectionTokenMap.$rootElement member exposed by the AngularTS namespace contract.\n\nType: {!HTMLElement}"
  ^js/HTMLElement [^js/ng.InjectionTokenMap target]
  (.-$rootElement target))

(defn injection-token-map-dollarroot-scope
  "Public InjectionTokenMap.$rootScope member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.InjectionTokenMap target]
  (.-$rootScope target))

(defn injection-token-map-dollarsce
  "Public InjectionTokenMap.$sce member exposed by the AngularTS namespace contract.\n\nType: {!ng.SceService}"
  ^js/ng.SceService [^js/ng.InjectionTokenMap target]
  (.-$sce target))

(defn injection-token-map-dollarsce-delegate
  "Public InjectionTokenMap.$sceDelegate member exposed by the AngularTS namespace contract.\n\nType: {!ng.SceDelegateService}"
  ^js/ng.SceDelegateService [^js/ng.InjectionTokenMap target]
  (.-$sceDelegate target))

(defn injection-token-map-dollarscope
  "Public InjectionTokenMap.$scope member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.InjectionTokenMap target]
  (.-$scope target))

(defn injection-token-map-dollarsecurity
  "Public InjectionTokenMap.$security member exposed by the AngularTS namespace contract.\n\nType: {!ng.SecurityPolicy}"
  ^js/ng.SecurityPolicy [^js/ng.InjectionTokenMap target]
  (.-$security target))

(defn injection-token-map-dollarservice-worker
  "Public InjectionTokenMap.$serviceWorker member exposed by the AngularTS namespace contract.\n\nType: {!ng.ServiceWorkerService}"
  ^js/ng.ServiceWorkerService [^js/ng.InjectionTokenMap target]
  (.-$serviceWorker target))

(defn injection-token-map-dollarstate
  "Public InjectionTokenMap.$state member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.InjectionTokenMap target]
  (.-$state target))

(defn injection-token-map-dollarstate-registry
  "Public InjectionTokenMap.$stateRegistry member exposed by the AngularTS namespace contract.\n\nType: {!ng.StateRegistryService}"
  ^js/ng.StateRegistryService [^js/ng.InjectionTokenMap target]
  (.-$stateRegistry target))

(defn injection-token-map-dollarstream
  "Public InjectionTokenMap.$stream member exposed by the AngularTS namespace contract.\n\nType: {!ng.StreamService}"
  ^js/ng.StreamService [^js/ng.InjectionTokenMap target]
  (.-$stream target))

(defn injection-token-map-dollartemplate-cache
  "Public InjectionTokenMap.$templateCache member exposed by the AngularTS namespace contract.\n\nType: {!Map<string, string>}"
  ^js/Map [^js/ng.InjectionTokenMap target]
  (.-$templateCache target))

(defn injection-token-map-dollartransitions
  "Public InjectionTokenMap.$transitions member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.InjectionTokenMap target]
  (.-$transitions target))

(defn injection-token-map-dollarwasm
  "Public InjectionTokenMap.$wasm member exposed by the AngularTS namespace contract.\n\nType: {!ng.WasmService}"
  ^js/ng.WasmService [^js/ng.InjectionTokenMap target]
  (.-$wasm target))

(defn injection-token-map-dollarweb-component
  "Public InjectionTokenMap.$webComponent member exposed by the AngularTS namespace contract.\n\nType: {!ng.WebComponentService}"
  ^js/ng.WebComponentService [^js/ng.InjectionTokenMap target]
  (.-$webComponent target))

(defn injection-token-map-dollarwindow
  "Public InjectionTokenMap.$window member exposed by the AngularTS namespace contract.\n\nType: {!Window}"
  ^js/Window [^js/ng.InjectionTokenMap target]
  (.-$window target))

(defn interpolate-config-end-symbol
  "Closing delimiter. Defaults to `}}`.\n\nType: {(string|undefined)}"
  ^string [^js/ng.InterpolateConfig target]
  (.-endSymbol target))

(defn interpolate-config-start-symbol
  "Opening delimiter. Defaults to `{{`.\n\nType: {(string|undefined)}"
  ^string [^js/ng.InterpolateConfig target]
  (.-startSymbol target))

(defn interpolation-function-exp
  "Original interpolation text.\n\nType: {string}"
  ^string [^js/ng.InterpolationFunction target]
  (.-exp target))

(defn interpolation-function-expressions
  "Expressions extracted from the interpolation text.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.InterpolationFunction target]
  (.-expressions target))

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

(defn log-beacon-config-failure
  "Action taken when serialization or Beacon queueing fails.\n\nType: {(string|undefined)}"
  ^string [^js/ng.LogBeaconConfig target]
  (.-failure target))

(defn log-beacon-config-levels
  "Levels delivered remotely. Defaults to `error` only.\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.LogBeaconConfig target]
  (.-levels target))

(defn log-beacon-config-serializer
  "Name of an injectable {@link LogBeaconSerializer}.\n\nType: {(string|undefined)}"
  ^string [^js/ng.LogBeaconConfig target]
  (.-serializer target))

(defn log-beacon-config-url
  "Beacon endpoint URL.\n\nType: {string}"
  ^string [^js/ng.LogBeaconConfig target]
  (.-url target))

(defn log-entry-args
  "Arguments originally passed to the logging method.\n\nType: {!Array<?>}"
  ^js/Array [^js/ng.LogEntry target]
  (.-args target))

(defn log-entry-level
  "Logging method that produced this entry.\n\nType: {string}"
  ^string [^js/ng.LogEntry target]
  (.-level target))

(defn log-entry-timestamp
  "ISO-8601 timestamp captured when the logging method was called.\n\nType: {string}"
  ^string [^js/ng.LogEntry target]
  (.-timestamp target))

(defn machine-config-hooks
  "Public MachineConfig.hooks member exposed by the AngularTS namespace contract.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.MachineConfig target]
  (.-hooks target))

(defn machine-config-id
  "Public MachineConfig.id member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.MachineConfig target]
  (.-id target))

(defn machine-config-meta
  "Public MachineConfig.meta member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.MachineConfig target]
  (.-meta target))

(defn machine-config-states
  "Public MachineConfig.states member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.MachineConfig target]
  (.-states target))

(defn machine-contract-state
  "Public MachineContract.state member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.MachineContract target]
  (.-state target))

(defn machine-send-result-ok
  "Public MachineSendResult.ok member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.MachineSendResult target]
  (.-ok target))

(defn machine-send-result-status
  "Public MachineSendResult.status member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.MachineSendResult target]
  (.-status target))

(defn machine-send-result-type
  "Public MachineSendResult.type member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.MachineSendResult target]
  (.-type target))

(defn model-change-keys
  "Public ModelChange.keys member exposed by the AngularTS namespace contract.\n\nType: {!Array<string>}"
  ^js/Array [^js/ng.ModelChange target]
  (.-keys target))

(defn model-change-origin
  "Public ModelChange.origin member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ModelChange target]
  (.-origin target))

(defn model-change-snapshot-version
  "Public ModelChange.snapshotVersion member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.ModelChange target]
  (.-snapshotVersion target))

(defn model-dollarid
  "Public Model.$id member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.Model target]
  (.-$id target))

(defn model-dollarparent
  "Public Model.$parent member exposed by the AngularTS namespace contract.\n\nType: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.Model target]
  (.-$parent target))

(defn model-dollarproxy
  "Public Model.$proxy member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Model target]
  (.-$proxy target))

(defn model-dollarroot
  "Public Model.$root member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.Model target]
  (.-$root target))

(defn model-dollarscopename
  "Public Model.$scopename member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.Model target]
  (.-$scopename target))

(defn model-dollartarget
  "Public Model.$target member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.Model target]
  (.-$target target))

(defn model-restore-options-mode
  "Public ModelRestoreOptions.mode member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ModelRestoreOptions target]
  (.-mode target))

(defn model-restore-options-origin
  "Public ModelRestoreOptions.origin member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ModelRestoreOptions target]
  (.-origin target))

(defn model-sync-options-failure
  "Public ModelSyncOptions.failure member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ModelSyncOptions target]
  (.-failure target))

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

(defn policy-context-meta
  "Public PolicyContext.meta member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.PolicyContext target]
  (.-meta target))

(defn policy-decision-meta
  "Public PolicyDecision.meta member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.PolicyDecision target]
  (.-meta target))

(defn policy-decision-reason
  "Public PolicyDecision.reason member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.PolicyDecision target]
  (.-reason target))

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

(defn rest-cache-policy-context-cache-key
  "Public RestCachePolicyContext.cacheKey member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.RestCachePolicyContext target]
  (.-cacheKey target))

(defn rest-cache-policy-context-collection-url
  "Public RestCachePolicyContext.collectionUrl member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RestCachePolicyContext target]
  (.-collectionUrl target))

(defn rest-cache-policy-context-meta
  "Public RestCachePolicyContext.meta member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.RestCachePolicyContext target]
  (.-meta target))

(defn rest-cache-policy-context-method
  "Public RestCachePolicyContext.method member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.RestCachePolicyContext target]
  (.-method target))

(defn rest-cache-policy-context-operation
  "Public RestCachePolicyContext.operation member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.RestCachePolicyContext target]
  (.-operation target))

(defn rest-cache-policy-context-options
  "Public RestCachePolicyContext.options member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.RestCachePolicyContext target]
  (.-options target))

(defn rest-cache-policy-context-params
  "Public RestCachePolicyContext.params member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.RestCachePolicyContext target]
  (.-params target))

(defn rest-cache-policy-context-url
  "Public RestCachePolicyContext.url member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.RestCachePolicyContext target]
  (.-url target))

(defn rest-options-backend
  "Optional backend used instead of the default HTTP backend.\n\nType: {(!ng.RestBackend|undefined)}"
  ^js/ng.RestBackend [^js/ng.RestOptions target]
  (.-backend target))

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
  "Request configuration that produced this response.\n\nType: {(!ng.HttpRequestConfig|undefined)}"
  ^js/ng.HttpRequestConfig [^js/ng.RestResponse target]
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

(defn route-contract-params
  "Public RouteContract.params member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.RouteContract target]
  (.-params target))

(defn route-contract-resolves
  "Public RouteContract.resolves member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, ?>|undefined)}"
  ^js/Object [^js/ng.RouteContract target]
  (.-resolves target))

(defn router-config-case-insensitive
  "Public RouterConfig.caseInsensitive member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.RouterConfig target]
  (.-caseInsensitive target))

(defn router-config-param-types
  "Public RouterConfig.paramTypes member exposed by the AngularTS namespace contract.\n\nType: {(!Object<string, !Object>|undefined)}"
  ^js/Object [^js/ng.RouterConfig target]
  (.-paramTypes target))

(defn router-config-retention
  "Public RouterConfig.retention member exposed by the AngularTS namespace contract.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.RouterConfig target]
  (.-retention target))

(defn router-config-strict
  "Public RouterConfig.strict member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.RouterConfig target]
  (.-strict target))

(defn router-config-view-transitions
  "Public RouterConfig.viewTransitions member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.RouterConfig target]
  (.-viewTransitions target))

(defn router-module-declaration-abstract
  "Abstract state indicator An abstract state can never be directly activated. Use an abstract state to provide inherited properties (url, resolve, data, etc) to children states.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.RouterModuleDeclaration target]
  (.-abstract target))

(defn router-module-declaration-bindings
  "An object which maps `resolve`s to [[component]] `bindings`. When using a [[component]] declaration (`component: 'myComponent'`), each input binding for the component is supplied data from a resolve of the same name, by default. You may supply data from a different resolve name by mapping it here. Each key in this object is the name of one of the component's input bindings. Each value is the name of the resolve that should be provided to that binding. Any component bindings that are omitted from this map get the default behavior of mapping to a resolve of the same name. #### Example: ```js app.router('foo', { resolve: { foo: function(FooService) { return FooService.get(); }, bar: function(BarService) { return BarService.get(); } }, component: 'Baz', // The component's `baz` binding gets data from the `bar` resolve // The component's `foo` binding gets data from the `foo` resolve (default behavior) bindings: { baz: 'bar' } }); app.component('Baz', { templateUrl: 'baz.html', controller: 'BazController', bindings: { foo: '<', // foo binding baz: '<' // baz binding } }); ```\n\nType: {(!Object<string, string>|undefined)}"
  ^js/Object [^js/ng.RouterModuleDeclaration target]
  (.-bindings target))

(defn router-module-declaration-children
  "Child states owned by this module route tree. Each child is lowered to a normal [[StateDeclaration]] before registration.\n\nType: {(!Array<!ng.RouterModuleDeclaration>|undefined)}"
  ^js/Array [^js/ng.RouterModuleDeclaration target]
  (.-children target))

(defn router-module-declaration-dynamic
  "Marks all the state's parameters as `dynamic`. All parameters on the state will use this value for `dynamic` as a default. Individual parameters may override this default using [[ParamDeclaration.dynamic]] in the [[params]] block. This default applies to all parameters declared on this state.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.RouterModuleDeclaration target]
  (.-dynamic target))

(defn router-module-declaration-name
  "The state name (required) A unique state name, e.g. `\"home\"`, `\"about\"`, `\"contacts\"`. To create a parent/child state use a dot, e.g. `\"about.sales\"`, `\"home.newest\"`. Note: [State] objects require unique names. The name is used like an id.\n\nType: {string}"
  ^string [^js/ng.RouterModuleDeclaration target]
  (.-name target))

(defn router-module-declaration-params
  "Params configuration An object which optionally configures parameters declared in the url, or defines additional non-url parameters. For each parameter being configured, add a [[ParamDeclaration]] keyed to the name of the parameter. #### Example: ```js params: { param1: { type: \"int\", array: true, value: [] }, param2: { value: \"index\" } } ```\n\nType: {(!Object<string, !Object>|undefined)}"
  ^js/Object [^js/ng.RouterModuleDeclaration target]
  (.-params target))

(defn router-module-declaration-policy
  "Declarative state policy metadata consumed by AngularTS framework services. `policy.navigation` is inherited through the state tree and evaluated by the router's security navigation hook before resolves, controllers, or views run. `policy.transition.canExit` is evaluated before exiting states are torn down. `policy.retention` declares keep-alive route subtree behavior and can override router-wide retention defaults.\n\nType: {(!ng.StatePolicyDeclaration|undefined)}"
  ^js/ng.StatePolicyDeclaration [^js/ng.RouterModuleDeclaration target]
  (.-policy target))

(defn router-module-declaration-url
  "The url fragment for the state A URL fragment (with optional parameters) which is used to match the browser location with this state. This fragment will be appended to the parent state's URL in order to build up the overall URL for this state. It may include path parameters, typed parameters, and query parameters.\n\nType: {(string|undefined)}"
  ^string [^js/ng.RouterModuleDeclaration target]
  (.-url target))

(defn router-module-declaration-views
  "Named view declarations for this state. Each key targets an `ng-view`; each value is either a full view declaration or a string shorthand for `{ component: \"componentName\" }`. Examples: ```js views: { mymessages: \"mymessages\", messagelist: { component: \"messageList\" }, \"^.^.messagecontent\": \"message\" } ```\n\nType: {(!Object<string, (!Object|string)>|undefined)}"
  ^js/Object [^js/ng.RouterModuleDeclaration target]
  (.-views target))

(defn router-module-name
  "Public RouterModule.name member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.RouterModule target]
  (.-name target))

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
  "Injector used by the AngularTS app that registered this element.\n\nType: {!ng.InjectorService<?>}"
  ^js/ng.InjectorService [^js/ng.ScopeElement target]
  (.-injector target))

(defn scope-element-scope
  "Scope owned by this custom element instance.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.ScopeElement target]
  (.-scope target))

(defn scope-event-current-scope
  "Public ScopeEvent.currentScope member exposed by the AngularTS namespace contract.\n\nType: {(!Object|null)}"
  ^js/Object [^js/ng.ScopeEvent target]
  (.-currentScope target))

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

(defn scope-event-target-scope
  "Public ScopeEvent.targetScope member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.ScopeEvent target]
  (.-targetScope target))

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

(defn security-config-allow-insecure-origins
  "HTTP origins explicitly permitted to carry credentials.\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.SecurityConfig target]
  (.-allowInsecureOrigins target))

(defn security-config-credentials
  "Public SecurityConfig.credentials member exposed by the AngularTS namespace contract.\n\nType: {(!ng.SecurityCredentialsConfig|undefined)}"
  ^js/ng.SecurityCredentialsConfig [^js/ng.SecurityConfig target]
  (.-credentials target))

(defn security-config-fallback
  "Public SecurityConfig.fallback member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.SecurityConfig target]
  (.-fallback target))

(defn security-credentials-config-basic
  "Public SecurityCredentialsConfig.basic member exposed by the AngularTS namespace contract.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.SecurityCredentialsConfig target]
  (.-basic target))

(defn security-credentials-config-cookie
  "Public SecurityCredentialsConfig.cookie member exposed by the AngularTS namespace contract.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.SecurityCredentialsConfig target]
  (.-cookie target))

(defn security-credentials-config-order
  "Public SecurityCredentialsConfig.order member exposed by the AngularTS namespace contract.\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.SecurityCredentialsConfig target]
  (.-order target))

(defn service-worker-config-auto-register
  "Register automatically when the runtime service is created.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.ServiceWorkerConfig target]
  (.-autoRegister target))

(defn service-worker-config-check-for-updates-on-register
  "Check for an updated worker after registration succeeds.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.ServiceWorkerConfig target]
  (.-checkForUpdatesOnRegister target))

(defn service-worker-message-event-event
  "Native event for callers that need browser-specific fields.\n\nType: {!Object}"
  ^js/Object [^js/ng.ServiceWorkerMessageEvent target]
  (.-event target))

(defn service-worker-post-options-target
  "Worker target for this message.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ServiceWorkerPostOptions target]
  (.-target target))

(defn service-worker-post-options-transfer
  "Transferable objects sent with `postMessage(...)`.\n\nType: {(!Array<!Object>|undefined)}"
  ^js/Array [^js/ng.ServiceWorkerPostOptions target]
  (.-transfer target))

(defn service-worker-registration-state-active
  "State of the active worker, when present.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ServiceWorkerRegistrationState target]
  (.-active target))

(defn service-worker-registration-state-installing
  "State of the installing worker, when present.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ServiceWorkerRegistrationState target]
  (.-installing target))

(defn service-worker-registration-state-registered
  "True when a registration is currently known by the service.\n\nType: {boolean}"
  ^boolean [^js/ng.ServiceWorkerRegistrationState target]
  (.-registered target))

(defn service-worker-registration-state-scope
  "Registration scope, when available.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ServiceWorkerRegistrationState target]
  (.-scope target))

(defn service-worker-registration-state-update-via-cache
  "Update cache policy reported by the browser registration.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ServiceWorkerRegistrationState target]
  (.-updateViaCache target))

(defn service-worker-registration-state-waiting
  "State of the waiting worker, when present.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ServiceWorkerRegistrationState target]
  (.-waiting target))

(defn service-worker-request-options-target
  "Worker target for this message.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ServiceWorkerRequestOptions target]
  (.-target target))

(defn service-worker-request-options-timeout
  "Request timeout in milliseconds.\n\nType: {(number|undefined)}"
  ^number [^js/ng.ServiceWorkerRequestOptions target]
  (.-timeout target))

(defn service-worker-request-options-transfer
  "Transferable objects sent with `postMessage(...)`.\n\nType: {(!Array<!Object>|undefined)}"
  ^js/Array [^js/ng.ServiceWorkerRequestOptions target]
  (.-transfer target))

(defn service-worker-service-controller
  "Current native controller, if the page is controlled.\n\nType: {(!Object|null)}"
  ^js/Object [^js/ng.ServiceWorkerService target]
  (.-controller target))

(defn service-worker-service-registration
  "Latest known native registration.\n\nType: {(!Object|null)}"
  ^js/Object [^js/ng.ServiceWorkerService target]
  (.-registration target))

(defn service-worker-service-registration-state
  "Template-friendly registration snapshot.\n\nType: {!ng.ServiceWorkerRegistrationState}"
  ^js/ng.ServiceWorkerRegistrationState [^js/ng.ServiceWorkerService target]
  (.-registrationState target))

(defn service-worker-service-status
  "Template-facing lifecycle status for the latest service-worker operation.\n\nType: {string}"
  ^string [^js/ng.ServiceWorkerService target]
  (.-status target))

(defn service-worker-service-supported
  "Support flag for templates and guards.\n\nType: {boolean}"
  ^boolean [^js/ng.ServiceWorkerService target]
  (.-supported target))

(defn service-worker-service-update-state
  "Template-friendly update snapshot.\n\nType: {!ng.ServiceWorkerUpdateState}"
  ^js/ng.ServiceWorkerUpdateState [^js/ng.ServiceWorkerService target]
  (.-updateState target))

(defn service-worker-update-state-checking
  "True while an explicit update check is in flight.\n\nType: {boolean}"
  ^boolean [^js/ng.ServiceWorkerUpdateState target]
  (.-checking target))

(defn service-worker-update-state-controller-changed
  "True when the active worker changed during the current page lifetime.\n\nType: {boolean}"
  ^boolean [^js/ng.ServiceWorkerUpdateState target]
  (.-controllerChanged target))

(defn service-worker-update-state-error-code
  "Stable failure code from the last update-related operation.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ServiceWorkerUpdateState target]
  (.-errorCode target))

(defn service-worker-update-state-last-checked-at
  "Last successful update-check time in epoch milliseconds.\n\nType: {(number|undefined)}"
  ^number [^js/ng.ServiceWorkerUpdateState target]
  (.-lastCheckedAt target))

(defn service-worker-update-state-phase
  "Latest observed service worker lifecycle phase.\n\nType: {(string|undefined)}"
  ^string [^js/ng.ServiceWorkerUpdateState target]
  (.-phase target))

(defn service-worker-update-state-registration
  "Registration associated with the latest update event.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.ServiceWorkerUpdateState target]
  (.-registration target))

(defn service-worker-update-state-waiting
  "True when a waiting worker has been discovered.\n\nType: {boolean}"
  ^boolean [^js/ng.ServiceWorkerUpdateState target]
  (.-waiting target))

(defn service-worker-update-state-worker
  "Worker associated with the latest update event.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.ServiceWorkerUpdateState target]
  (.-worker target))

(defn sse-config-event-types
  "Additional EventSource event names to subscribe to\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.SseConfig target]
  (.-eventTypes target))

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

(defn state-declaration-abstract
  "Abstract state indicator An abstract state can never be directly activated. Use an abstract state to provide inherited properties (url, resolve, data, etc) to children states.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.StateDeclaration target]
  (.-abstract target))

(defn state-declaration-bindings
  "An object which maps `resolve`s to [[component]] `bindings`. When using a [[component]] declaration (`component: 'myComponent'`), each input binding for the component is supplied data from a resolve of the same name, by default. You may supply data from a different resolve name by mapping it here. Each key in this object is the name of one of the component's input bindings. Each value is the name of the resolve that should be provided to that binding. Any component bindings that are omitted from this map get the default behavior of mapping to a resolve of the same name. #### Example: ```js app.router('foo', { resolve: { foo: function(FooService) { return FooService.get(); }, bar: function(BarService) { return BarService.get(); } }, component: 'Baz', // The component's `baz` binding gets data from the `bar` resolve // The component's `foo` binding gets data from the `foo` resolve (default behavior) bindings: { baz: 'bar' } }); app.component('Baz', { templateUrl: 'baz.html', controller: 'BazController', bindings: { foo: '<', // foo binding baz: '<' // baz binding } }); ```\n\nType: {(!Object<string, string>|undefined)}"
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

(defn state-declaration-policy
  "Declarative state policy metadata consumed by AngularTS framework services. `policy.navigation` is inherited through the state tree and evaluated by the router's security navigation hook before resolves, controllers, or views run. `policy.transition.canExit` is evaluated before exiting states are torn down. `policy.retention` declares keep-alive route subtree behavior and can override router-wide retention defaults.\n\nType: {(!ng.StatePolicyDeclaration|undefined)}"
  ^js/ng.StatePolicyDeclaration [^js/ng.StateDeclaration target]
  (.-policy target))

(defn state-declaration-url
  "The url fragment for the state A URL fragment (with optional parameters) which is used to match the browser location with this state. This fragment will be appended to the parent state's URL in order to build up the overall URL for this state. It may include path parameters, typed parameters, and query parameters.\n\nType: {(string|undefined)}"
  ^string [^js/ng.StateDeclaration target]
  (.-url target))

(defn state-declaration-views
  "Named view declarations for this state. Each key targets an `ng-view`; each value is either a full view declaration or a string shorthand for `{ component: \"componentName\" }`. Examples: ```js views: { mymessages: \"mymessages\", messagelist: { component: \"messageList\" }, \"^.^.messagecontent\": \"message\" } ```\n\nType: {(!Object<string, (!Object|string)>|undefined)}"
  ^js/Object [^js/ng.StateDeclaration target]
  (.-views target))

(defn state-policy-declaration-navigation
  "Public StatePolicyDeclaration.navigation member exposed by the AngularTS namespace contract.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.StatePolicyDeclaration target]
  (.-navigation target))

(defn state-policy-declaration-retention
  "Public StatePolicyDeclaration.retention member exposed by the AngularTS namespace contract.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.StatePolicyDeclaration target]
  (.-retention target))

(defn state-policy-declaration-transition
  "Public StatePolicyDeclaration.transition member exposed by the AngularTS namespace contract.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.StatePolicyDeclaration target]
  (.-transition target))

(defn state-service-current
  "The current state declaration, when navigation has selected one.\n\nType: {(!ng.StateDeclaration|undefined)}"
  ^js/ng.StateDeclaration [^js/ng.StateService target]
  (.-current target))

(defn state-service-params
  "The latest successful state parameters.\n\nType: {!Object<string, ?>}"
  ^js/Object [^js/ng.StateService target]
  (.-params target))

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

(defn wasm-binding-disposed
  "Public WasmBinding.disposed member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.WasmBinding target]
  (.-disposed target))

(defn wasm-binding-name
  "Public WasmBinding.name member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WasmBinding target]
  (.-name target))

(defn wasm-binding-options-initial
  "Deliver each watched path's current value when binding. Defaults to `true`.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WasmBindingOptions target]
  (.-initial target))

(defn wasm-binding-options-name
  "Stable name exposed to the guest.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WasmBindingOptions target]
  (.-name target))

(defn wasm-binding-options-watch
  "Reactive paths delivered to the guest's update callback.\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.WasmBindingOptions target]
  (.-watch target))

(defn wasm-binding-target
  "Public WasmBinding.target member exposed by the AngularTS namespace contract.\n\nType: {TTarget}"
  ^js/ng.Scope [^js/ng.WasmBinding target]
  (.-target target))

(defn wasm-compile-options-builtins
  "Native WebAssembly builtin modules enabled while compiling.\n\nType: {(!Array<string>|undefined)}"
  ^js/Array [^js/ng.WasmCompileOptions target]
  (.-builtins target))

(defn wasm-compile-options-imported-string-constants
  "Native module name used for imported global string constants.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WasmCompileOptions target]
  (.-importedStringConstants target))

(defn wasm-error-code
  "Public WasmError.code member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WasmError target]
  (.-code target))

(defn wasm-error-stage
  "Public WasmError.stage member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WasmError target]
  (.-stage target))

(defn wasm-load-options-compile
  "Standard options forwarded to WebAssembly compilation.\n\nType: {(!ng.WasmCompileOptions|undefined)}"
  ^js/ng.WasmCompileOptions [^js/ng.WasmLoadOptions target]
  (.-compile target))

(defn wasm-load-options-diagnostics
  "Publish lifecycle timing entries through the browser Performance API.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WasmLoadOptions target]
  (.-diagnostics target))

(defn wasm-load-options-imports
  "Imports supplied in addition to the AngularTS reactive ABI.\n\nType: {(!Object<string, !Object<string, (!Object|number)>>|undefined)}"
  ^js/Object [^js/ng.WasmLoadOptions target]
  (.-imports target))

(defn wasm-resource-disposed
  "Public WasmResource.disposed member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.WasmResource target]
  (.-disposed target))

(defn wasm-resource-error
  "Public WasmResource.error member exposed by the AngularTS namespace contract.\n\nType: {(!ng.WasmError|undefined)}"
  ^js/ng.WasmError [^js/ng.WasmResource target]
  (.-error target))

(defn wasm-resource-instance
  "Public WasmResource.instance member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.WasmResource target]
  (.-instance target))

(defn wasm-resource-module
  "Public WasmResource.module member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.WasmResource target]
  (.-module target))

(defn wasm-resource-ready
  "Public WasmResource.ready member exposed by the AngularTS namespace contract.\n\nType: {!Promise<!ng.WasmResource<TExports>>}"
  ^js/Promise [^js/ng.WasmResource target]
  (.-ready target))

(defn wasm-resource-status
  "Public WasmResource.status member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WasmResource target]
  (.-status target))

(defn wasm-target-dollarid
  "Public WasmTarget.$id member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.WasmTarget target]
  (.-$id target))

(defn wasm-target-dollarparent
  "Public WasmTarget.$parent member exposed by the AngularTS namespace contract.\n\nType: {(!ng.Scope|undefined)}"
  ^js/ng.Scope [^js/ng.WasmTarget target]
  (.-$parent target))

(defn wasm-target-dollarproxy
  "Public WasmTarget.$proxy member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.WasmTarget target]
  (.-$proxy target))

(defn wasm-target-dollarroot
  "Public WasmTarget.$root member exposed by the AngularTS namespace contract.\n\nType: {!ng.Scope}"
  ^js/ng.Scope [^js/ng.WasmTarget target]
  (.-$root target))

(defn wasm-target-dollarscopename
  "Public WasmTarget.$scopename member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WasmTarget target]
  (.-$scopename target))

(defn wasm-target-dollartarget
  "Public WasmTarget.$target member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.WasmTarget target]
  (.-$target target))

(defn web-component-config-defaults
  "Defaults merged into every `appComponent(...)` declaration.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.WebComponentConfig target]
  (.-defaults target))

(defn web-component-context-host
  "Custom element host.\n\nType: {!HTMLElement}"
  ^js/HTMLElement [^js/ng.WebComponentContext target]
  (.-host target))

(defn web-component-context-injector
  "Injector used by the AngularTS app that registered the element.\n\nType: {!ng.InjectorService<?>}"
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

(defn web-transport-config-max-retries
  "Maximum reconnect attempts before `closed` settles. Defaults to no limit.\n\nType: {(number|undefined)}"
  ^number [^js/ng.WebTransportConfig target]
  (.-maxRetries target))

(defn web-transport-config-reconnect
  "Reopen the native WebTransport session when it closes unexpectedly.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WebTransportConfig target]
  (.-reconnect target))

(defn web-transport-connection-closed
  "Resolves or rejects when the managed connection closes permanently.\n\nType: {!Promise<void>}"
  ^js/Promise [^js/ng.WebTransportConnection target]
  (.-closed target))

(defn web-transport-connection-ready
  "Resolves after the current native WebTransport session is ready.\n\nType: {!Promise<!ng.WebTransportConnection>}"
  ^js/Promise [^js/ng.WebTransportConnection target]
  (.-ready target))

(defn web-transport-connection-transport
  "Current browser-native WebTransport instance. Replaced after reconnects.\n\nType: {!Object}"
  ^js/Object [^js/ng.WebTransportConnection target]
  (.-transport target))

(defn web-transport-datagram-event-data
  "Raw bytes received from the browser WebTransport datagram stream.\n\nType: {!Object}"
  ^js/Object [^js/ng.WebTransportDatagramEvent target]
  (.-data target))

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

(defn window-service-angular
  "Public WindowService.angular member exposed by the AngularTS namespace contract.\n\nType: {!ng.Angular}"
  ^js/ng.Angular [^js/ng.WindowService target]
  (.-angular target))

(defn worker-config-max-restarts
  "Maximum automatic restarts. Defaults to 3.\n\nType: {(number|undefined)}"
  ^number [^js/ng.WorkerConfig target]
  (.-maxRestarts target))

(defn worker-config-restart
  "Restart the worker after a native runtime error. Automatic restart is disabled by default.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WorkerConfig target]
  (.-restart target))

(defn worker-config-restart-delay
  "Base restart delay. Exponential backoff is capped at 30s.\n\nType: {(number|undefined)}"
  ^number [^js/ng.WorkerConfig target]
  (.-restartDelay target))

(defn worker-error-code
  "Public WorkerError.code member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkerError target]
  (.-code target))

(defn worker-error-event
  "Public WorkerError.event member exposed by the AngularTS namespace contract.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.WorkerError target]
  (.-event target))

(defn worker-handle-error
  "Latest managed failure, retained across worker replacement.\n\nType: {(!ng.WorkerError|undefined)}"
  ^js/ng.WorkerError [^js/ng.WorkerHandle target]
  (.-error target))

(defn worker-handle-restart-count
  "Number of explicit or automatic worker restarts.\n\nType: {number}"
  ^number [^js/ng.WorkerHandle target]
  (.-restartCount target))

(defn worker-handle-status
  "Current managed lifecycle state.\n\nType: {string}"
  ^string [^js/ng.WorkerHandle target]
  (.-status target))

(defn worker-model-message-channel
  "Public WorkerModelMessage.channel member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkerModelMessage target]
  (.-channel target))

(defn worker-model-message-type
  "Public WorkerModelMessage.type member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkerModelMessage target]
  (.-type target))

(defn worker-request-id
  "Public WorkerRequest.id member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkerRequest target]
  (.-id target))

(defn worker-request-options-signal
  "Abort the request without terminating the worker.\n\nType: {(!AbortSignal|undefined)}"
  ^js/AbortSignal [^js/ng.WorkerRequestOptions target]
  (.-signal target))

(defn worker-request-options-timeout
  "Reject the request after this many milliseconds. Defaults to 30 seconds.\n\nType: {(number|undefined)}"
  ^number [^js/ng.WorkerRequestOptions target]
  (.-timeout target))

(defn worker-request-options-transfer
  "Transfer ownership of values contained by the request payload.\n\nType: {(!Array<!Object>|undefined)}"
  ^js/Array [^js/ng.WorkerRequestOptions target]
  (.-transfer target))

(defn worker-request-type
  "Public WorkerRequest.type member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkerRequest target]
  (.-type target))

(defn worker-response-id
  "Public WorkerResponse.id member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkerResponse target]
  (.-id target))

(defn worker-response-ok
  "Public WorkerResponse.ok member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.WorkerResponse target]
  (.-ok target))

(defn worker-response-type
  "Public WorkerResponse.type member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkerResponse target]
  (.-type target))

(defn workflow-command-context-command
  "Public WorkflowCommandContext.command member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowCommandContext target]
  (.-command target))

(defn workflow-command-context-data
  "Public WorkflowCommandContext.data member exposed by the AngularTS namespace contract.\n\nType: {!Object}"
  ^js/Object [^js/ng.WorkflowCommandContext target]
  (.-data target))

(defn workflow-command-context-signal
  "Public WorkflowCommandContext.signal member exposed by the AngularTS namespace contract.\n\nType: {!AbortSignal}"
  ^js/AbortSignal [^js/ng.WorkflowCommandContext target]
  (.-signal target))

(defn workflow-command-definition-command-timeout
  "Public WorkflowCommandDefinition.commandTimeout member exposed by the AngularTS namespace contract.\n\nType: {(number|undefined)}"
  ^number [^js/ng.WorkflowCommandDefinition target]
  (.-commandTimeout target))

(defn workflow-command-definition-concurrency
  "Public WorkflowCommandDefinition.concurrency member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WorkflowCommandDefinition target]
  (.-concurrency target))

(defn workflow-command-definition-retry
  "Public WorkflowCommandDefinition.retry member exposed by the AngularTS namespace contract.\n\nType: {(number|undefined)}"
  ^number [^js/ng.WorkflowCommandDefinition target]
  (.-retry target))

(defn workflow-contract-state
  "Public WorkflowContract.state member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowContract target]
  (.-state target))

(defn workflow-diagnostics
  "Public Workflow.diagnostics member exposed by the AngularTS namespace contract.\n\nType: {!Array<!Object>}"
  ^js/Array [^js/ng.Workflow target]
  (.-diagnostics target))

(defn workflow-history
  "Public Workflow.history member exposed by the AngularTS namespace contract.\n\nType: {!Array<!Object>}"
  ^js/Array [^js/ng.Workflow target]
  (.-history target))

(defn workflow-id
  "Public Workflow.id member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.Workflow target]
  (.-id target))

(defn workflow-result-diagnostics
  "Public WorkflowResult.diagnostics member exposed by the AngularTS namespace contract.\n\nType: {(!Array<!Object>|undefined)}"
  ^js/Array [^js/ng.WorkflowResult target]
  (.-diagnostics target))

(defn workflow-result-ok
  "Public WorkflowResult.ok member exposed by the AngularTS namespace contract.\n\nType: {boolean}"
  ^boolean [^js/ng.WorkflowResult target]
  (.-ok target))

(defn workflow-result-status
  "Public WorkflowResult.status member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowResult target]
  (.-status target))

(defn workflow-snapshot-diagnostics
  "Public WorkflowSnapshot.diagnostics member exposed by the AngularTS namespace contract.\n\nType: {!Array<!Object>}"
  ^js/Array [^js/ng.WorkflowSnapshot target]
  (.-diagnostics target))

(defn workflow-snapshot-history
  "Public WorkflowSnapshot.history member exposed by the AngularTS namespace contract.\n\nType: {!Array<!Object>}"
  ^js/Array [^js/ng.WorkflowSnapshot target]
  (.-history target))

(defn workflow-snapshot-id
  "Public WorkflowSnapshot.id member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowSnapshot target]
  (.-id target))

(defn workflow-snapshot-version
  "Public WorkflowSnapshot.version member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.WorkflowSnapshot target]
  (.-version target))

(defn workflow-supervisor-config-auto-persist
  "Persist a fresh supervisor snapshot after each completed command.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WorkflowSupervisorConfig target]
  (.-autoPersist target))

(defn workflow-supervisor-config-auto-recover
  "Restore persisted state and retry recoverable commands on startup.\n\nType: {(boolean|undefined)}"
  ^boolean [^js/ng.WorkflowSupervisorConfig target]
  (.-autoRecover target))

(defn workflow-supervisor-config-id
  "Public WorkflowSupervisorConfig.id member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowSupervisorConfig target]
  (.-id target))

(defn workflow-supervisor-diagnostics
  "Public WorkflowSupervisor.diagnostics member exposed by the AngularTS namespace contract.\n\nType: {!Array<!Object>}"
  ^js/Array [^js/ng.WorkflowSupervisor target]
  (.-diagnostics target))

(defn workflow-supervisor-id
  "Public WorkflowSupervisor.id member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowSupervisor target]
  (.-id target))

(defn workflow-supervisor-persistence-config-database
  "Public WorkflowSupervisorPersistenceConfig.database member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WorkflowSupervisorPersistenceConfig target]
  (.-database target))

(defn workflow-supervisor-persistence-config-indexed-db
  "Public WorkflowSupervisorPersistenceConfig.indexedDB member exposed by the AngularTS namespace contract.\n\nType: {(!Object|undefined)}"
  ^js/Object [^js/ng.WorkflowSupervisorPersistenceConfig target]
  (.-indexedDB target))

(defn workflow-supervisor-persistence-config-store
  "Public WorkflowSupervisorPersistenceConfig.store member exposed by the AngularTS namespace contract.\n\nType: {(string|undefined)}"
  ^string [^js/ng.WorkflowSupervisorPersistenceConfig target]
  (.-store target))

(defn workflow-supervisor-persistence-config-type
  "Public WorkflowSupervisorPersistenceConfig.type member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowSupervisorPersistenceConfig target]
  (.-type target))

(defn workflow-supervisor-persistence-config-version
  "Public WorkflowSupervisorPersistenceConfig.version member exposed by the AngularTS namespace contract.\n\nType: {(number|undefined)}"
  ^number [^js/ng.WorkflowSupervisorPersistenceConfig target]
  (.-version target))

(defn workflow-supervisor-ready
  "Public WorkflowSupervisor.ready member exposed by the AngularTS namespace contract.\n\nType: {!Promise<(!ng.WorkflowSupervisorSnapshot<!Object<string, ?>>|undefined)>}"
  ^js/Promise [^js/ng.WorkflowSupervisor target]
  (.-ready target))

(defn workflow-supervisor-snapshot-diagnostics
  "Public WorkflowSupervisorSnapshot.diagnostics member exposed by the AngularTS namespace contract.\n\nType: {!Array<!Object>}"
  ^js/Array [^js/ng.WorkflowSupervisorSnapshot target]
  (.-diagnostics target))

(defn workflow-supervisor-snapshot-id
  "Public WorkflowSupervisorSnapshot.id member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowSupervisorSnapshot target]
  (.-id target))

(defn workflow-supervisor-snapshot-status
  "Public WorkflowSupervisorSnapshot.status member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowSupervisorSnapshot target]
  (.-status target))

(defn workflow-supervisor-snapshot-updated-at
  "Public WorkflowSupervisorSnapshot.updatedAt member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.WorkflowSupervisorSnapshot target]
  (.-updatedAt target))

(defn workflow-supervisor-snapshot-version
  "Public WorkflowSupervisorSnapshot.version member exposed by the AngularTS namespace contract.\n\nType: {number}"
  ^number [^js/ng.WorkflowSupervisorSnapshot target]
  (.-version target))

(defn workflow-supervisor-status
  "Public WorkflowSupervisor.status member exposed by the AngularTS namespace contract.\n\nType: {string}"
  ^string [^js/ng.WorkflowSupervisor target]
  (.-status target))

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
  "Strict convenience wrapper for ng.EventBusService.prototype.publish."
  (^boolean [^js/ng.EventBusService event-bus ^string topic]
   (event-bus-service-publish event-bus topic))
  (^boolean [^js/ng.EventBusService event-bus ^string topic value]
   (event-bus-service-publish event-bus topic value))
  (^boolean [^js/ng.EventBusService event-bus ^string topic value extra]
   (event-bus-service-publish event-bus topic value extra)))
