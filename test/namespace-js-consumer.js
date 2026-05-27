// @ts-check
/// <reference path="../@types/namespace.d.ts" />

/**
 * Exercises every public `ng.*` namespace type from a JavaScript project using
 * JSDoc type checking. This catches declaration emit regressions where the
 * namespace references a type that `stripInternal` removed from another
 * generated `.d.ts` file.
 *
 * @typedef {{
 *   Angular: ng.Angular,
 *   AnnotatedDirectiveFactory: ng.AnnotatedDirectiveFactory,
 *   Component: ng.Component,
 *   Controller: ng.Controller,
 *   Directive: ng.Directive<unknown>,
 *   DirectiveRestrict: ng.DirectiveRestrict,
 *   DirectiveFactory: ng.DirectiveFactory,
 *   NgModule: ng.NgModule,
 *   PublicLinkFn: ng.PublicLinkFn,
 *   PubSubProvider: ng.PubSubProvider,
 *   Scope: ng.Scope,
 *   ScopeService: ng.ScopeService,
 *   TranscludeFn: ng.TranscludeFn,
 *   AnchorScrollProvider: ng.AnchorScrollProvider,
 *   AngularProvider: ng.AngularProvider,
 *   AngularServiceProvider: ng.AngularServiceProvider,
 *   AnimateProvider: ng.AnimateProvider,
 *   AriaProvider: ng.AriaProvider,
 *   CompileLifecycleProvider: ng.CompileLifecycleProvider,
 *   CompileProvider: ng.CompileProvider,
 *   ControllerProvider: ng.ControllerProvider,
 *   CookieProvider: ng.CookieProvider,
 *   EventBusProvider: ng.EventBusProvider,
 *   FilterProvider: ng.FilterProvider,
 *   ExceptionHandlerProvider: ng.ExceptionHandlerProvider,
 *   HttpParamSerializerProvider: ng.HttpParamSerializerProvider,
 *   HttpProvider: ng.HttpProvider,
 *   InterpolateProvider: ng.InterpolateProvider,
 *   LocationProvider: ng.LocationProvider,
 *   LogProvider: ng.LogProvider,
 *   ParseProvider: ng.ParseProvider,
 *   RestProvider: ng.RestProvider,
 *   RootScopeProvider: ng.RootScopeProvider,
 *   RouterProvider: ng.RouterProvider,
 *   SceDelegateProvider: ng.SceDelegateProvider,
 *   SceProvider: ng.SceProvider,
 *   SseProvider: ng.SseProvider,
 *   StateProvider: ng.StateProvider,
 *   StateRegistryProvider: ng.StateRegistryProvider,
 *   StreamProvider: ng.StreamProvider,
 *   TemplateCacheProvider: ng.TemplateCacheProvider,
 *   TemplateFactoryProvider: ng.TemplateFactoryProvider,
 *   TemplateRequestProvider: ng.TemplateRequestProvider,
 *   TransitionProvider: ng.TransitionProvider,
 *   TransitionsProvider: ng.TransitionsProvider,
 *   TransitionService: ng.TransitionService,
 *   ViewProvider: ng.ViewProvider,
 *   WasmProvider: ng.WasmProvider,
 *   WebComponentProvider: ng.WebComponentProvider,
 *   WebSocketProvider: ng.WebSocketProvider,
 *   WebTransportProvider: ng.WebTransportProvider,
 *   WorkerProvider: ng.WorkerProvider,
 *   AnchorScrollService: ng.AnchorScrollService,
 *   AnimateService: ng.AnimateService,
 *   AnimationHandle: ng.AnimationHandle,
 *   AnimationContext: ng.AnimationContext,
 *   AnimationLifecycleCallback: ng.AnimationLifecycleCallback,
 *   AriaService: ng.AriaService,
 *   CompileService: ng.CompileService,
 *   CompileLifecycleService: ng.CompileLifecycleService,
 *   ControllerService: ng.ControllerService,
 *   CookieService: ng.CookieService,
 *   ElementService: ng.ElementService,
 *   EventBusService: ng.EventBusService,
 *   ExceptionHandlerService: ng.ExceptionHandlerService,
 *   FilterFn: ng.FilterFn,
 *   FilterFactory: ng.FilterFactory,
 *   FilterService: ng.FilterService,
 *   EntryFilterItem: ng.EntryFilterItem,
 *   DateFilterOptions: ng.DateFilterOptions,
 *   NumberFilterOptions: ng.NumberFilterOptions,
 *   CurrencyFilterOptions: ng.CurrencyFilterOptions,
 *   RelativeTimeFilterOptions: ng.RelativeTimeFilterOptions,
 *   HttpParamSerializerService: ng.HttpParamSerializerService,
 *   HttpService: ng.HttpService,
 *   InjectorService: ng.InjectorService,
 *   InterpolateService: ng.InterpolateService,
 *   LocationService: ng.LocationService,
 *   LogService: ng.LogService,
 *   ParseService: ng.ParseService,
 *   ProvideService: ng.ProvideService,
 *   PubSubService: ng.PubSubService,
 *   RootElementService: ng.RootElementService,
 *   RootScopeService: ng.RootScopeService,
 *   StateService: ng.StateService,
 *   StateRegistryService: ng.StateRegistryService,
 *   SceService: ng.SceService,
 *   SceDelegateService: ng.SceDelegateService,
 *   SseService: ng.SseService,
 *   SseConfig: ng.SseConfig,
 *   SseConnection: ng.SseConnection,
 *   RealtimeProtocolEventDetail: ng.RealtimeProtocolEventDetail<unknown, unknown>,
 *   RealtimeProtocolMessage: ng.RealtimeProtocolMessage,
 *   SseProtocolEventDetail: ng.SseProtocolEventDetail<unknown>,
 *   SseProtocolMessage: ng.SseProtocolMessage,
 *   SwapModeType: ng.SwapModeType,
 *   TemplateCacheService: ng.TemplateCacheService,
 *   TemplateFactoryService: ng.TemplateFactoryService,
 *   TemplateRequestService: ng.TemplateRequestService,
 *   TransitionsService: ng.TransitionsService,
 *   ViewService: ng.ViewService,
 *   WorkerService: ng.WorkerService,
 *   AngularService: ng.AngularService,
 *   AnnotatedFactory: ng.AnnotatedFactory<(...args: never[]) => unknown>,
 *   AnimationOptions: ng.AnimationOptions,
 *   NativeAnimationOptions: ng.NativeAnimationOptions,
 *   AnimationPhase: ng.AnimationPhase,
 *   AnimationPreset: ng.AnimationPreset,
 *   AnimationPresetHandler: ng.AnimationPresetHandler,
 *   AnimationResult: ng.AnimationResult,
 *   AngularElementDefinition: ng.AngularElementDefinition,
 *   AngularElementModuleOptions: ng.AngularElementModuleOptions,
 *   AngularElementOptions: ng.AngularElementOptions<Record<string, unknown>>,
 *   ControllerConstructor: ng.ControllerConstructor,
 *   CookieOptions: ng.CookieOptions,
 *   CookieStoreOptions: ng.CookieStoreOptions,
 *   DocumentService: ng.DocumentService,
 *   EntityClass: ng.EntityClass<unknown>,
 *   ErrorHandlingConfig: ng.ErrorHandlingConfig,
 *   Expression: ng.Expression,
 *   HttpMethod: ng.HttpMethod,
 *   HttpPromise: ng.HttpPromise<unknown>,
 *   HttpProviderDefaults: ng.HttpProviderDefaults,
 *   HttpResponse: ng.HttpResponse<unknown>,
 *   HttpResponseStatus: ng.HttpResponseStatus,
 *   Injectable: ng.Injectable<(...args: never[]) => unknown>,
 *   InjectionTokens: ng.InjectionTokens,
 *   InterpolationFunction: ng.InterpolationFunction,
 *   InvocationDetail: ng.InvocationDetail,
 *   ListenerFn: ng.ListenerFn,
 *   NgModelController: ng.NgModelController,
 *   RequestConfig: ng.RequestConfig,
 *   RequestShortcutConfig: ng.RequestShortcutConfig,
 *   RestDefinition: ng.RestDefinition<unknown>,
 *   RestFactory: ng.RestFactory,
 *   RestBackend: ng.RestBackend,
 *   RestCacheStore: ng.RestCacheStore,
 *   RestCacheStrategy: ng.RestCacheStrategy,
 *   RestOptions: ng.RestOptions,
 *   RestRequest: ng.RestRequest,
 *   RestResponse: ng.RestResponse<unknown>,
 *   RestRevalidateEvent: ng.RestRevalidateEvent<unknown>,
 *   CachedRestBackendOptions: ng.CachedRestBackendOptions,
 *   RestService: ng.RestService<unknown, unknown>,
 *   ScopeEvent: ng.ScopeEvent,
 *   ServiceProvider: ng.ServiceProvider,
 *   StateDeclaration: ng.StateDeclaration,
 *   StateResolveArray: ng.StateResolveArray,
 *   StateResolveObject: ng.StateResolveObject,
 *   StorageBackend: ng.StorageBackend,
 *   StorageType: ng.StorageType,
 *   ConnectionConfig: ng.ConnectionConfig,
 *   ConnectionEvent: ng.ConnectionEvent,
 *   StreamService: ng.StreamService,
 *   Transition: ng.Transition,
 *   Validator: ng.Validator,
 *   ElementScopeOptions: ng.ElementScopeOptions,
 *   AppComponentOptions: ng.AppComponentOptions,
 *   ScopeElement: ng.ScopeElement,
 *   ScopeElementConstructor: ng.ScopeElementConstructor,
 *   WebComponentContext: ng.WebComponentContext,
 *   WebComponentInput: ng.WebComponentInput,
 *   WebComponentInputConfig: ng.WebComponentInputConfig,
 *   WebComponentInputs: ng.WebComponentInputs,
 *   WebComponentService: ng.WebComponentService,
 *   WebSocketConfig: ng.WebSocketConfig,
 *   WebSocketConnection: ng.WebSocketConnection,
 *   WebSocketService: ng.WebSocketService,
 *   NativeWebTransport: ng.NativeWebTransport,
 *   WebTransportBufferInput: ng.WebTransportBufferInput,
 *   WebTransportCertificateHash: ng.WebTransportCertificateHash,
 *   WebTransportConfig: ng.WebTransportConfig,
 *   WebTransportConnection: ng.WebTransportConnection,
 *   WebTransportDatagramEvent: ng.WebTransportDatagramEvent<unknown>,
 *   WebTransportOptions: ng.WebTransportOptions,
 *   WebTransportReconnectEvent: ng.WebTransportReconnectEvent,
 *   WebTransportRetryDelay: ng.WebTransportRetryDelay,
 *   WebTransportService: ng.WebTransportService,
 *   WindowService: ng.WindowService,
 *   WorkerConfig: ng.WorkerConfig,
 *   WorkerConnection: ng.WorkerConnection,
 *   WasmAbiExports: ng.WasmAbiExports,
 *   WasmInstantiationResult: ng.WasmInstantiationResult,
 *   WasmOptions: ng.WasmOptions,
 *   WasmScope: ng.WasmScope,
 *   WasmScopeAbi: ng.WasmScopeAbi,
 *   WasmScopeAbiImportObject: ng.WasmScopeAbiImportObject,
 *   WasmScopeAbiImports: ng.WasmScopeAbiImports,
 *   WasmScopeBindingOptions: ng.WasmScopeBindingOptions,
 *   WasmScopeOptions: ng.WasmScopeOptions,
 *   WasmScopeReference: ng.WasmScopeReference,
 *   WasmScopeUpdate: ng.WasmScopeUpdate,
 *   WasmScopeWatchOptions: ng.WasmScopeWatchOptions,
 *   WasmService: ng.WasmService,
 * }} AngularTsNamespaceTypes
 */

/** @type {Partial<AngularTsNamespaceTypes>} */
export const namespaceTypes = Object.freeze({});

/**
 * @param {ng.HttpProvider} $httpProvider
 */
export function configureHttp($httpProvider) {
  $httpProvider.defaults.withCredentials = true;
  $httpProvider.interceptors.push(() => ({}));
  $httpProvider.xsrfTrustedOrigins.push("https://api.example.com");
}

/**
 * @param {ng.AnimateProvider} $animateProvider
 */
export function configureAnimate($animateProvider) {
  $animateProvider.register("fade", {
    enter: [{ opacity: 1 }],
    leave: [{ opacity: 0 }],
  });
}

/**
 * @param {ng.AriaProvider} $ariaProvider
 */
export function configureAria($ariaProvider) {
  $ariaProvider.config({ tabindex: false });
}

/**
 * @param {ng.HttpParamSerializerProvider} $httpParamSerializerProvider
 */
export function configureHttpParamSerializer($httpParamSerializerProvider) {
  $httpParamSerializerProvider.$get =
    () =>
    (params = {}) =>
      new URLSearchParams(
        /** @type {Record<string, string>} */ (params),
      ).toString();
}

/**
 * @param {ng.SceProvider} $sceProvider
 */
export function configureSce($sceProvider) {
  return $sceProvider.enabled(false);
}
