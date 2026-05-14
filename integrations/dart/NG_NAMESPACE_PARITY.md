# ng Namespace Parity

The Dart integration must reach feature parity with every type made public in
the AngularTS `ng` namespace.

The source of truth is:

```text
@types/namespace.d.ts
```

The Dart package should provide an equivalent Dart type, facade, token,
callback signature, config object, enum, or intentionally documented unsupported
mapping for each public `ng` type. A type is not considered covered just because
an unsafe JavaScript escape hatch can reach it.

## Status Legend

- `started`: initial Dart equivalent exists.
- `planned`: required for parity but not implemented yet.
- `alias`: Dart can represent it directly through an existing platform type.
- `review`: needs design work because the TypeScript type is dynamic,
  overloaded, or structurally broad.

## Core

| ng type | Dart status |
| --- | --- |
| `Angular` | started |
| `AnnotatedDirectiveFactory` | started |
| `Attributes` | started |
| `BoundTranscludeFn` | started |
| `Component` | started |
| `Controller` | started |
| `Directive` | started |
| `DirectiveFactory` | started |
| `NgModule` | started |
| `PublicLinkFn` | started |
| `Scope` | started |
| `TranscludeFn` | started |
| `AnnotatedFactory` | started |
| `ControllerConstructor` | started |
| `Expression` | alias |
| `Injectable` | started |
| `InjectionTokens` | started |
| `InvocationDetail` | started |
| `ListenerFn` | started |
| `ScopeEvent` | started |
| `ServiceProvider` | started |
| `Validator` | started |

## Providers

| ng type | Dart status |
| --- | --- |
| `AnchorScrollProvider` | started |
| `AngularServiceProvider` | started |
| `AnimateProvider` | started |
| `ExceptionHandlerProvider` | started |
| `FilterProvider` | started |
| `HttpParamSerializerProvider` | started |
| `InterpolateProvider` | started |
| `LocationProvider` | started |
| `PubSubProvider` | started |
| `SceDelegateProvider` | started |
| `SceProvider` | started |
| `TransitionService` | started |

## Services

| ng type | Dart status |
| --- | --- |
| `AnchorScrollService` | started |
| `AngularService` | started |
| `AnimateService` | started |
| `AriaService` | started |
| `CompileService` | started |
| `ControllerService` | started |
| `CookieService` | started |
| `DocumentService` | alias |
| `ExceptionHandlerService` | started |
| `FilterService` | started |
| `HttpParamSerializerSerService` | started |
| `HttpService` | started |
| `InjectorService` | started |
| `InterpolateService` | started |
| `LocationService` | started |
| `LogService` | started |
| `ParseService` | started |
| `ProvideService` | started |
| `PubSubService` | started |
| `RootElementService` | alias |
| `RootScopeService` | started |
| `SceDelegateService` | started |
| `SceService` | started |
| `StateRegistryService` | started |
| `StateService` | started |
| `StreamService` | started |
| `TemplateCacheService` | started |
| `TemplateRequestService` | started |
| `TopicService` | started |
| `WebComponentService` | started |
| `WebSocketService` | started |
| `WebTransportService` | started |
| `WindowService` | alias |

## HTTP And REST

| ng type | Dart status |
| --- | --- |
| `CachedRestBackendOptions` | started |
| `EntityClass` | started |
| `HttpMethod` | started |
| `HttpPromise` | started |
| `HttpProviderDefaults` | started |
| `HttpResponse` | started |
| `HttpResponseStatus` | started |
| `RequestConfig` | started |
| `RequestShortcutConfig` | started |
| `RestBackend` | started |
| `RestCacheStore` | started |
| `RestCacheStrategy` | started |
| `RestDefinition` | started |
| `RestFactory` | started |
| `RestOptions` | started |
| `RestRequest` | started |
| `RestResponse` | started |
| `RestRevalidateEvent` | started |
| `RestService` | started |

## Filters

| ng type | Dart status |
| --- | --- |
| `CurrencyFilterOptions` | started |
| `DateFilterFormat` | started |
| `DateFilterOptions` | started |
| `EntryFilterItem` | started |
| `FilterFactory` | started |
| `FilterFn` | started |
| `NumberFilterOptions` | started |
| `RelativeTimeFilterOptions` | started |

## Animation

| ng type | Dart status |
| --- | --- |
| `AnimationContext` | started |
| `AnimationHandle` | started |
| `AnimationLifecycleCallback` | started |
| `AnimationOptions` | started |
| `AnimationPhase` | started |
| `AnimationPreset` | started |
| `AnimationPresetHandler` | started |
| `AnimationResult` | started |
| `NativeAnimationOptions` | started |

## Router

| ng type | Dart status |
| --- | --- |
| `StateDeclaration` | started |
| `StateResolveArray` | started |
| `StateResolveObject` | started |
| `Transition` | started |

## Realtime And Connections

| ng type | Dart status |
| --- | --- |
| `ConnectionConfig` | started |
| `ConnectionEvent` | started |
| `RealtimeProtocolEventDetail` | started |
| `RealtimeProtocolMessage` | started |
| `SseConfig` | started |
| `SseConnection` | started |
| `SseProtocolEventDetail` | started |
| `SseProtocolMessage` | started |
| `SseService` | started |
| `SwapModeType` | started |
| `WebSocketConfig` | started |
| `WebSocketConnection` | started |
| `WebTransportBufferInput` | started |
| `WebTransportCertificateHash` | started |
| `WebTransportConfig` | started |
| `WebTransportConnection` | started |
| `WebTransportDatagramEvent` | started |
| `WebTransportOptions` | started |
| `WebTransportReconnectEvent` | started |
| `WebTransportRetryDelay` | started |
| `NativeWebTransport` | started |

## Web Components

| ng type | Dart status |
| --- | --- |
| `AngularElementDefinition` | started |
| `AngularElementModuleOptions` | started |
| `AngularElementOptions` | started |
| `ElementScopeOptions` | started |
| `WebComponentContext` | started |
| `WebComponentInput` | started |
| `WebComponentInputConfig` | started |
| `WebComponentInputs` | started |
| `WebComponentOptions` | started |

## Storage, Workers, And Misc

| ng type | Dart status |
| --- | --- |
| `CookieOptions` | started |
| `CookieStoreOptions` | started |
| `ErrorHandlingConfig` | started |
| `InterpolationFunction` | started |
| `NgModelController` | started |
| `StorageBackend` | started |
| `StorageType` | started |
| `WorkerConfig` | started |
| `WorkerConnection` | started |

## Parity Rules

1. Every public `ng` namespace type must be represented in this file.
2. Every `started` item must have a corresponding Dart public API or exported
   type.
3. New public `ng` namespace types require a Dart parity decision in the same
   change.
4. Unsafe interop does not count as parity unless the type is explicitly marked
   `review` with a reason.
5. Prefer generated checks against `@types/namespace.d.ts` once the Dart package
   stabilizes.
