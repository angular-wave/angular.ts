# Kotlin ng Namespace Parity

The Kotlin integration must reach feature parity with every type made public in
the AngularTS `ng` namespace.

The source of truth is:

```text
@types/namespace.d.ts
```

The Kotlin package should provide an equivalent Kotlin type, generated facade,
token, callback signature, config object, enum, DSL builder, or intentionally
documented unsupported mapping for each public `ng` type. A type is not
considered covered just because an unsafe JavaScript escape hatch can reach it.

Directive link callback parity follows the current attrs-free shape:
`(scope, element)`, `(scope, element, transclude)`, or
`(scope, element, controller, transclude?)`. Compile/template/controller
Directive link callbacks no longer receive `$attrs`; attribute helpers are not
part of the Kotlin public facade.

## Status Legend

- `planned`: required for parity but not implemented yet.
- `generated`: covered by the generated Kotlin/JS raw facade layer.
- `manual`: covered by a handwritten ergonomic Kotlin API.
- `alias`: Kotlin can represent it directly through a platform or language type.
- `review`: needs design work because the TypeScript type is dynamic,
  overloaded, or structurally broad.
- `unsupported`: intentionally not supported by the safe Kotlin API; must
  include a documented unsafe fallback.

## Core

| ng type | Kotlin status |
| --- | --- |
| `Angular` | generated |
| `AnnotatedDirectiveFactory` | generated |
| `Component` | generated |
| `Controller` | generated |
| `Directive` | generated |
| `DirectiveRestrict` | generated |
| `DirectiveFactory` | generated |
| `NgModule` | generated |
| `PublicLinkFn` | generated |
| `Scope` | generated |
| `ScopeService` | generated |
| `TranscludeFn` | generated |
| `AnnotatedFactory` | generated |
| `ControllerConstructor` | generated |
| `Expression` | alias |
| `Injectable` | generated |
| `InjectionTokens` | generated |
| `InvocationDetail` | generated |
| `ListenerFn` | generated |
| `ScopeEvent` | generated |
| `ServiceProvider` | generated |
| `Validator` | generated |

## Providers

| ng type | Kotlin status |
| --- | --- |
| `AnchorScrollProvider` | generated |
| `AngularProvider` | generated |
| `AngularServiceProvider` | generated |
| `AnimateProvider` | generated |
| `AriaProvider` | generated |
| `CompileLifecycleProvider` | generated |
| `CompileProvider` | generated |
| `ControllerProvider` | generated |
| `CookieProvider` | generated |
| `EventBusProvider` | generated |
| `ExceptionHandlerProvider` | generated |
| `FilterProvider` | generated |
| `HttpParamSerializerProvider` | generated |
| `HttpProvider` | generated |
| `InterpolateProvider` | generated |
| `LocationProvider` | generated |
| `LogProvider` | generated |
| `ParseProvider` | generated |
| `PubSubProvider` | generated |
| `RestProvider` | generated |
| `RootScopeProvider` | generated |
| `RouterProvider` | generated |
| `SceDelegateProvider` | generated |
| `SceProvider` | generated |
| `SseProvider` | generated |
| `StateProvider` | generated |
| `StateRegistryProvider` | generated |
| `StreamProvider` | generated |
| `TemplateCacheProvider` | generated |
| `TemplateFactoryProvider` | generated |
| `TemplateRequestProvider` | generated |
| `TransitionProvider` | generated |
| `TransitionsProvider` | generated |
| `TransitionService` | generated |
| `ViewProvider` | generated |
| `WasmProvider` | generated |
| `WebComponentProvider` | generated |
| `WebSocketProvider` | generated |
| `WebTransportProvider` | generated |
| `WorkerProvider` | generated |

## Services

| ng type | Kotlin status |
| --- | --- |
| `AnchorScrollService` | generated |
| `AngularService` | generated |
| `AnimateService` | generated |
| `AriaService` | generated |
| `CompileLifecycleService` | generated |
| `CompileService` | generated |
| `ControllerService` | generated |
| `CookieService` | generated |
| `DocumentService` | alias |
| `ElementService` | alias |
| `EventBusService` | generated |
| `ExceptionHandlerService` | generated |
| `FilterService` | generated |
| `HttpParamSerializerService` | generated |
| `HttpParamSerializerSerService` | generated |
| `HttpService` | generated |
| `InjectorService` | generated |
| `InterpolateService` | generated |
| `LocationService` | generated |
| `LogService` | generated |
| `ParseService` | generated |
| `ProvideService` | generated |
| `PubSubService` | generated |
| `RootElementService` | alias |
| `RootScopeService` | generated |
| `SceDelegateService` | generated |
| `SceService` | generated |
| `StateRegistryService` | generated |
| `StateService` | generated |
| `StreamService` | generated |
| `TemplateCacheService` | generated |
| `TemplateFactoryService` | generated |
| `TemplateRequestService` | generated |
| `TransitionsService` | generated |
| `ViewService` | generated |
| `WebComponentService` | generated |
| `WebSocketService` | generated |
| `WebTransportService` | generated |
| `WindowService` | alias |
| `WorkerService` | generated |

## HTTP And REST

| ng type | Kotlin status |
| --- | --- |
| `CachedRestBackendOptions` | generated |
| `EntityClass` | generated |
| `HttpMethod` | generated |
| `HttpPromise` | generated |
| `HttpProviderDefaults` | generated |
| `HttpResponse` | generated |
| `HttpResponseStatus` | generated |
| `RequestConfig` | generated |
| `RequestShortcutConfig` | generated |
| `RestBackend` | generated |
| `RestCacheStore` | generated |
| `RestCacheStrategy` | generated |
| `RestDefinition` | generated |
| `RestFactory` | generated |
| `RestOptions` | generated |
| `RestRequest` | generated |
| `RestResponse` | generated |
| `RestRevalidateEvent` | generated |
| `RestService` | generated |

## Filters

| ng type | Kotlin status |
| --- | --- |
| `CurrencyFilterOptions` | generated |
| `DateFilterOptions` | generated |
| `EntryFilterItem` | generated |
| `FilterFactory` | generated |
| `FilterFn` | generated |
| `NumberFilterOptions` | generated |
| `RelativeTimeFilterOptions` | generated |

## Animation

| ng type | Kotlin status |
| --- | --- |
| `AnimationContext` | generated |
| `AnimationHandle` | generated |
| `AnimationLifecycleCallback` | generated |
| `AnimationOptions` | generated |
| `AnimationPhase` | generated |
| `AnimationPreset` | generated |
| `AnimationPresetHandler` | generated |
| `AnimationResult` | generated |
| `NativeAnimationOptions` | generated |

## Router

| ng type | Kotlin status |
| --- | --- |
| `StateDeclaration` | generated |
| `StateResolveArray` | generated |
| `StateResolveObject` | generated |
| `Transition` | generated |

## Realtime And Connections

| ng type | Kotlin status |
| --- | --- |
| `ConnectionConfig` | generated |
| `ConnectionEvent` | generated |
| `RealtimeProtocolEventDetail` | generated |
| `RealtimeProtocolMessage` | generated |
| `SseConfig` | generated |
| `SseConnection` | generated |
| `SseProtocolEventDetail` | generated |
| `SseProtocolMessage` | generated |
| `SseService` | generated |
| `SwapModeType` | generated |
| `WebSocketConfig` | generated |
| `WebSocketConnection` | generated |
| `WebTransportBufferInput` | generated |
| `WebTransportCertificateHash` | generated |
| `WebTransportConfig` | generated |
| `WebTransportConnection` | generated |
| `WebTransportDatagramEvent` | generated |
| `WebTransportOptions` | generated |
| `WebTransportReconnectEvent` | generated |
| `WebTransportRetryDelay` | generated |
| `NativeWebTransport` | generated |

## Wasm

| ng type | Kotlin status |
| --- | --- |
| `WasmAbiExports` | generated |
| `WasmInstantiationResult` | generated |
| `WasmOptions` | generated |
| `WasmScope` | generated |
| `WasmScopeAbi` | generated |
| `WasmScopeAbiImportObject` | generated |
| `WasmScopeAbiImports` | generated |
| `WasmScopeBindingOptions` | generated |
| `WasmScopeOptions` | generated |
| `WasmScopeReference` | generated |
| `WasmScopeUpdate` | generated |
| `WasmScopeWatchOptions` | generated |
| `WasmService` | generated |

## Web Components

| ng type | Kotlin status |
| --- | --- |
| `AngularElementDefinition` | generated |
| `AngularElementModuleOptions` | generated |
| `AngularElementOptions` | generated |
| `AppComponentOptions` | generated |
| `ElementScopeOptions` | generated |
| `ScopeElement` | generated |
| `ScopeElementConstructor` | generated |
| `WebComponentContext` | generated |
| `WebComponentInput` | generated |
| `WebComponentInputConfig` | generated |
| `WebComponentInputs` | generated |

## Storage, Workers, And Misc

| ng type | Kotlin status |
| --- | --- |
| `CookieOptions` | generated |
| `CookieStoreOptions` | generated |
| `ErrorHandlingConfig` | generated |
| `InterpolationFunction` | generated |
| `NgModelController` | generated |
| `StorageBackend` | generated |
| `StorageType` | generated |
| `WorkerConfig` | generated |
| `WorkerConnection` | generated |

## Parity Rules

- Every public type alias in `@types/namespace.d.ts` must appear exactly once in
  this file.
- `planned` and `review` entries are allowed while the Kotlin integration is
  being built, but they are not considered parity-complete.
- `alias`, `generated`, `manual`, and `unsupported` entries must have explicit
  member-level coverage or override decisions once implementation begins.
- `unsupported` entries must document the reason and the unsafe fallback before
  release.
