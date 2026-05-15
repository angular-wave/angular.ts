# ng Namespace Parity

The Gleam integration must reach feature parity with every type made public in
the AngularTS `ng` namespace.

The source of truth is:

```text
@types/namespace.d.ts
```

Gleam parity is checked from the TypeScript namespace declaration. Dart is not a
source for this inventory.

## Status Legend

- `started`: initial typed Gleam facade or runtime wrapper exists.
- `inventory`: opaque Gleam namespace handle exists, but no typed facade yet.
- `alias`: Gleam can represent it directly through an existing platform or
  runtime type.
- `planned`: required for parity but not implemented yet.
- `review`: needs design work because the TypeScript type is dynamic,
  overloaded, or structurally broad.

## Core

| ng type | Gleam status |
| --- | --- |
| `Angular` | inventory |
| `AnnotatedDirectiveFactory` | inventory |
| `Attributes` | inventory |
| `BoundTranscludeFn` | inventory |
| `Component` | started |
| `Controller` | inventory |
| `Directive` | started |
| `DirectiveFactory` | inventory |
| `NgModule` | started |
| `PublicLinkFn` | inventory |
| `PubSubProvider` | inventory |
| `Scope` | started |
| `TranscludeFn` | inventory |
| `AnnotatedFactory` | started |
| `ControllerConstructor` | review |
| `Expression` | alias |
| `Injectable` | started |
| `InjectionTokens` | started |
| `InvocationDetail` | inventory |
| `ListenerFn` | inventory |
| `ScopeEvent` | inventory |
| `ServiceProvider` | inventory |
| `Validator` | inventory |

## Providers

| ng type | Gleam status |
| --- | --- |
| `AnchorScrollProvider` | inventory |
| `AngularServiceProvider` | inventory |
| `AnimateProvider` | inventory |
| `FilterProvider` | inventory |
| `ExceptionHandlerProvider` | inventory |
| `HttpParamSerializerProvider` | inventory |
| `InterpolateProvider` | inventory |
| `LocationProvider` | inventory |
| `SceDelegateProvider` | inventory |
| `SceProvider` | inventory |
| `TransitionService` | inventory |

## Services

| ng type | Gleam status |
| --- | --- |
| `AnchorScrollService` | inventory |
| `AngularService` | inventory |
| `AnimateService` | inventory |
| `AnimationHandle` | inventory |
| `AnimationContext` | inventory |
| `AnimationLifecycleCallback` | inventory |
| `AriaService` | inventory |
| `CompileService` | inventory |
| `ControllerService` | inventory |
| `CookieService` | inventory |
| `ExceptionHandlerService` | inventory |
| `FilterFn` | inventory |
| `FilterFactory` | inventory |
| `FilterService` | inventory |
| `HttpParamSerializerSerService` | inventory |
| `HttpService` | inventory |
| `InjectorService` | started |
| `InterpolateService` | inventory |
| `LocationService` | inventory |
| `LogService` | inventory |
| `ParseService` | inventory |
| `ProvideService` | inventory |
| `PubSubService` | inventory |
| `RootElementService` | alias |
| `RootScopeService` | inventory |
| `SceService` | inventory |
| `SceDelegateService` | inventory |
| `StateService` | inventory |
| `StateRegistryService` | inventory |
| `StreamService` | inventory |
| `TemplateCacheService` | inventory |
| `TemplateRequestService` | inventory |
| `TopicService` | inventory |
| `WindowService` | alias |

## HTTP And REST

| ng type | Gleam status |
| --- | --- |
| `CachedRestBackendOptions` | inventory |
| `EntityClass` | inventory |
| `HttpMethod` | started |
| `HttpPromise` | inventory |
| `HttpProviderDefaults` | inventory |
| `HttpResponse` | inventory |
| `HttpResponseStatus` | started |
| `RequestConfig` | started |
| `RequestShortcutConfig` | started |
| `RestBackend` | inventory |
| `RestCacheStore` | inventory |
| `RestCacheStrategy` | inventory |
| `RestDefinition` | inventory |
| `RestFactory` | inventory |
| `RestOptions` | inventory |
| `RestRequest` | inventory |
| `RestResponse` | inventory |
| `RestRevalidateEvent` | inventory |
| `RestService` | inventory |

## Filters

| ng type | Gleam status |
| --- | --- |
| `CurrencyFilterOptions` | started |
| `DateFilterFormat` | started |
| `DateFilterOptions` | started |
| `EntryFilterItem` | started |
| `NumberFilterOptions` | started |
| `RelativeTimeFilterOptions` | started |

## Animation

| ng type | Gleam status |
| --- | --- |
| `AnimationOptions` | inventory |
| `NativeAnimationOptions` | inventory |
| `AnimationPhase` | inventory |
| `AnimationPreset` | inventory |
| `AnimationPresetHandler` | inventory |
| `AnimationResult` | inventory |

## Router

| ng type | Gleam status |
| --- | --- |
| `StateDeclaration` | inventory |
| `StateResolveArray` | inventory |
| `StateResolveObject` | inventory |
| `Transition` | inventory |

## Realtime And Connections

| ng type | Gleam status |
| --- | --- |
| `ConnectionConfig` | inventory |
| `ConnectionEvent` | inventory |
| `RealtimeProtocolEventDetail` | inventory |
| `RealtimeProtocolMessage` | inventory |
| `SseConfig` | inventory |
| `SseConnection` | inventory |
| `SseProtocolEventDetail` | inventory |
| `SseProtocolMessage` | inventory |
| `SseService` | inventory |
| `SwapModeType` | inventory |
| `WebSocketConfig` | inventory |
| `WebSocketConnection` | inventory |
| `WebSocketService` | inventory |
| `NativeWebTransport` | inventory |
| `WebTransportBufferInput` | inventory |
| `WebTransportCertificateHash` | inventory |
| `WebTransportConfig` | inventory |
| `WebTransportConnection` | inventory |
| `WebTransportDatagramEvent` | inventory |
| `WebTransportOptions` | inventory |
| `WebTransportReconnectEvent` | inventory |
| `WebTransportRetryDelay` | inventory |
| `WebTransportService` | inventory |

## Web Components

| ng type | Gleam status |
| --- | --- |
| `AngularElementDefinition` | inventory |
| `AngularElementModuleOptions` | inventory |
| `AngularElementOptions` | inventory |
| `ElementScopeOptions` | inventory |
| `WebComponentContext` | inventory |
| `WebComponentInput` | inventory |
| `WebComponentInputConfig` | inventory |
| `WebComponentInputs` | inventory |
| `WebComponentOptions` | started |
| `WebComponentService` | inventory |

## Storage, Workers, Wasm, And Misc

| ng type | Gleam status |
| --- | --- |
| `CookieOptions` | started |
| `CookieStoreOptions` | started |
| `DocumentService` | alias |
| `ErrorHandlingConfig` | inventory |
| `InterpolationFunction` | inventory |
| `NgModelController` | inventory |
| `StorageBackend` | started |
| `StorageType` | started |
| `WorkerConfig` | inventory |
| `WorkerConnection` | inventory |
| `WasmAbiExports` | inventory |
| `WasmInstantiationResult` | inventory |
| `WasmOptions` | inventory |
| `WasmScope` | inventory |
| `WasmScopeAbi` | inventory |
| `WasmScopeAbiImportObject` | inventory |
| `WasmScopeAbiImports` | inventory |
| `WasmScopeBindingOptions` | inventory |
| `WasmScopeOptions` | inventory |
| `WasmScopeReference` | inventory |
| `WasmScopeUpdate` | inventory |
| `WasmScopeWatchOptions` | inventory |
| `WasmService` | inventory |

## Parity Rules

1. Every public `ng` namespace type in `@types/namespace.d.ts` must be
   represented in this file.
2. Every `started` item must have a corresponding typed Gleam public API or
   runtime wrapper.
3. New public `ng` namespace types require a Gleam parity decision in the same
   change.
4. Unsafe interop does not count as parity unless the type is explicitly marked
   `review` with a reason.
5. `make parity` must pass before Gleam integration changes are considered
   complete.
