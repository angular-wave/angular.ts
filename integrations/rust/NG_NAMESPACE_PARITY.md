# ng Namespace Parity

The Rust/Wasm integration must reach strict type parity with every type made
public in the published AngularTS `ng` namespace.

The source of truth is:

```text
@types/namespace.d.ts
```

The Rust package should provide an equivalent Rust type, trait, facade, token,
builder, callback signature, config object, enum, alias, or intentionally
documented unsupported mapping for each public `ng` type. A type is not
considered covered just because an unsafe JavaScript escape hatch can reach it.

## Status Legend

- `covered`: idiomatic Rust API exists and is tested.
- `started`: initial Rust API or facade exists, but parity is incomplete.
- `alias`: Rust can represent it directly through an existing platform or crate
  type.
- `unsafe`: supported only through an explicit unsafe interop boundary.
- `deferred`: required for parity but not implemented yet.
- `not-applicable`: not meaningful for Rust/Wasm authoring.

## Core

| ng type | Rust status |
| --- | --- |
| `Angular` | deferred |
| `AnnotatedDirectiveFactory` | deferred |
| `Attributes` | deferred |
| `BoundTranscludeFn` | deferred |
| `Component` | started |
| `Controller` | started |
| `Directive` | deferred |
| `DirectiveFactory` | deferred |
| `NgModule` | started |
| `PublicLinkFn` | deferred |
| `PubSubProvider` | deferred |
| `Scope` | started |
| `TranscludeFn` | deferred |
| `AnnotatedFactory` | deferred |
| `ControllerConstructor` | started |
| `Expression` | deferred |
| `Injectable` | started |
| `InjectionTokens` | started |
| `InvocationDetail` | deferred |
| `ListenerFn` | deferred |
| `ScopeEvent` | deferred |
| `ServiceProvider` | deferred |
| `Validator` | deferred |

## Providers

| ng type | Rust status |
| --- | --- |
| `AnchorScrollProvider` | deferred |
| `AngularServiceProvider` | deferred |
| `AnimateProvider` | deferred |
| `ExceptionHandlerProvider` | deferred |
| `FilterProvider` | deferred |
| `HttpParamSerializerProvider` | deferred |
| `InterpolateProvider` | deferred |
| `LocationProvider` | deferred |
| `SceDelegateProvider` | deferred |
| `SceProvider` | deferred |
| `TransitionService` | deferred |

## Services

| ng type | Rust status |
| --- | --- |
| `AnchorScrollService` | deferred |
| `AngularService` | deferred |
| `AnimateService` | deferred |
| `AriaService` | deferred |
| `CompileService` | deferred |
| `ControllerService` | deferred |
| `CookieService` | deferred |
| `DocumentService` | alias |
| `ExceptionHandlerService` | started |
| `FilterService` | deferred |
| `HttpParamSerializerSerService` | deferred |
| `HttpService` | started |
| `InjectorService` | started |
| `InterpolateService` | deferred |
| `LocationService` | deferred |
| `LogService` | started |
| `ParseService` | deferred |
| `ProvideService` | deferred |
| `PubSubService` | started |
| `RootElementService` | alias |
| `RootScopeService` | started |
| `SceDelegateService` | deferred |
| `SceService` | deferred |
| `StateRegistryService` | deferred |
| `StateService` | deferred |
| `StreamService` | deferred |
| `TemplateCacheService` | deferred |
| `TemplateRequestService` | deferred |
| `TopicService` | deferred |
| `WebComponentService` | deferred |
| `WebSocketService` | deferred |
| `WebTransportService` | deferred |
| `WindowService` | alias |

## HTTP And REST

| ng type | Rust status |
| --- | --- |
| `CachedRestBackendOptions` | deferred |
| `EntityClass` | deferred |
| `HttpMethod` | deferred |
| `HttpPromise` | deferred |
| `HttpProviderDefaults` | deferred |
| `HttpResponse` | deferred |
| `HttpResponseStatus` | deferred |
| `RequestConfig` | deferred |
| `RequestShortcutConfig` | deferred |
| `RestBackend` | deferred |
| `RestCacheStore` | deferred |
| `RestCacheStrategy` | deferred |
| `RestDefinition` | deferred |
| `RestFactory` | deferred |
| `RestOptions` | deferred |
| `RestRequest` | deferred |
| `RestResponse` | deferred |
| `RestRevalidateEvent` | deferred |
| `RestService` | deferred |

## Filters

| ng type | Rust status |
| --- | --- |
| `CurrencyFilterOptions` | deferred |
| `DateFilterFormat` | deferred |
| `DateFilterOptions` | deferred |
| `EntryFilterItem` | deferred |
| `FilterFactory` | deferred |
| `FilterFn` | deferred |
| `NumberFilterOptions` | deferred |
| `RelativeTimeFilterOptions` | deferred |

## Animation

| ng type | Rust status |
| --- | --- |
| `AnimationContext` | deferred |
| `AnimationHandle` | deferred |
| `AnimationLifecycleCallback` | deferred |
| `AnimationOptions` | deferred |
| `AnimationPhase` | deferred |
| `AnimationPreset` | deferred |
| `AnimationPresetHandler` | deferred |
| `AnimationResult` | deferred |
| `NativeAnimationOptions` | deferred |

## Router

| ng type | Rust status |
| --- | --- |
| `StateDeclaration` | deferred |
| `StateResolveArray` | deferred |
| `StateResolveObject` | deferred |
| `Transition` | deferred |

## Realtime And Connections

| ng type | Rust status |
| --- | --- |
| `ConnectionConfig` | deferred |
| `ConnectionEvent` | deferred |
| `RealtimeProtocolEventDetail` | deferred |
| `RealtimeProtocolMessage` | deferred |
| `SseConfig` | deferred |
| `SseConnection` | deferred |
| `SseProtocolEventDetail` | deferred |
| `SseProtocolMessage` | deferred |
| `SseService` | deferred |
| `SwapModeType` | deferred |
| `WebSocketConfig` | deferred |
| `WebSocketConnection` | deferred |
| `WebTransportBufferInput` | deferred |
| `WebTransportCertificateHash` | deferred |
| `WebTransportConfig` | deferred |
| `WebTransportConnection` | deferred |
| `WebTransportDatagramEvent` | deferred |
| `WebTransportOptions` | deferred |
| `WebTransportReconnectEvent` | deferred |
| `WebTransportRetryDelay` | deferred |
| `NativeWebTransport` | deferred |

## Web Components

| ng type | Rust status |
| --- | --- |
| `AngularElementDefinition` | deferred |
| `AngularElementModuleOptions` | deferred |
| `AngularElementOptions` | deferred |
| `ElementScopeOptions` | deferred |
| `WebComponentContext` | deferred |
| `WebComponentInput` | deferred |
| `WebComponentInputConfig` | deferred |
| `WebComponentInputs` | deferred |
| `WebComponentOptions` | deferred |

## Storage, Workers, And Misc

| ng type | Rust status |
| --- | --- |
| `CookieOptions` | deferred |
| `CookieStoreOptions` | deferred |
| `ErrorHandlingConfig` | deferred |
| `InterpolationFunction` | deferred |
| `NgModelController` | deferred |
| `StorageBackend` | deferred |
| `StorageType` | deferred |
| `WorkerConfig` | deferred |
| `WorkerConnection` | deferred |

## Parity Rules

1. Every public `ng` namespace type must be represented in this file.
2. Every `covered` item must have an idiomatic Rust API and tests.
3. Every `started` item must have a corresponding Rust public API, facade, or
   exported marker type.
4. New public `ng` namespace types require a Rust parity decision in the same
   change.
5. Unsafe interop does not count as parity unless the type is explicitly marked
   `unsafe` with a reason in follow-up notes.
6. `make parity` must pass before Rust integration changes are considered
   complete.
