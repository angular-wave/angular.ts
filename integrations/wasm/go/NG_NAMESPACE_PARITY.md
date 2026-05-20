# ng Namespace Parity

The Go/Wasm integration must track every type made public in the published
AngularTS `ng` namespace.

The source of truth is:

```text
@types/namespace.d.ts
```

The Go package should provide an equivalent Go type, interface, facade, token,
builder, callback signature, config object, enum, alias, or intentionally
documented unsupported mapping for each public `ng` type. A type is not
considered covered just because raw `syscall/js` can reach it.

Directive link callback parity must follow the current attrs-free link shape:
`(scope, element, controller?, transclude?)`. Compile/template/controller
`$attrs` and attribute helper services are not part of the Go public facade.

## Go Completion Gate

Go targets feature parity with the completed Rust/Wasm app-authoring surface.
The current covered app-authoring surface includes the shared Wasm scope ABI,
restricted scope helpers, module/component/controller/service metadata, `$http`,
diagnostics/events, template request/cache, storage/cookie, router/state,
realtime WebSocket/SSE, and core REST facades.

Forms and validation remain the next useful application-level gap. Provider/
config-time APIs, compile/link internals, browser object aliases, animation,
worker, web component, REST cache/revalidation helpers, WebTransport, and
parse/interpolate/filter/SCE/location APIs remain deferred unless a Go
reference example makes one necessary.

## Status Legend

- `covered`: idiomatic Go API exists and is tested.
- `alias`: Go can represent it directly through an existing platform type.
- `unsafe`: supported only through an explicit unsafe interop boundary.
- `deferred`: required for parity but not implemented yet.
- `not-applicable`: not meaningful for standard Go/Wasm authoring.

## Core

| ng type | Go status |
| --- | --- |
| `Angular` | deferred |
| `AnnotatedDirectiveFactory` | deferred |
| `Component` | covered |
| `Controller` | covered |
| `Directive` | deferred |
| `DirectiveRestrict` | deferred |
| `DirectiveFactory` | deferred |
| `NgModule` | covered |
| `PublicLinkFn` | deferred |
| `PubSubProvider` | deferred |
| `Scope` | covered |
| `TranscludeFn` | deferred |
| `AnnotatedFactory` | deferred |
| `ControllerConstructor` | covered |
| `Expression` | deferred |
| `Injectable` | covered |
| `InjectionTokens` | covered |
| `InvocationDetail` | covered |
| `ListenerFn` | covered |
| `ScopeEvent` | covered |
| `ServiceProvider` | deferred |
| `Validator` | deferred |

## Providers

| ng type | Go status |
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

| ng type | Go status |
| --- | --- |
| `AnchorScrollService` | deferred |
| `AngularService` | deferred |
| `AnimateService` | deferred |
| `AriaService` | deferred |
| `CompileService` | deferred |
| `ControllerService` | deferred |
| `CookieService` | covered |
| `DocumentService` | unsafe |
| `ExceptionHandlerService` | covered |
| `FilterService` | deferred |
| `HttpParamSerializerSerService` | deferred |
| `HttpService` | covered |
| `InjectorService` | deferred |
| `InterpolateService` | deferred |
| `LocationService` | deferred |
| `LogService` | covered |
| `ParseService` | deferred |
| `ProvideService` | deferred |
| `PubSubService` | covered |
| `RootElementService` | unsafe |
| `RootScopeService` | covered |
| `SceDelegateService` | deferred |
| `SceService` | deferred |
| `StateRegistryService` | covered |
| `StateService` | covered |
| `StreamService` | deferred |
| `TemplateCacheService` | covered |
| `TemplateRequestService` | covered |
| `WebComponentService` | deferred |
| `WebSocketService` | covered |
| `WebTransportService` | deferred |
| `WindowService` | unsafe |

## HTTP And REST

| ng type | Go status |
| --- | --- |
| `CachedRestBackendOptions` | deferred |
| `EntityClass` | deferred |
| `HttpMethod` | covered |
| `HttpPromise` | deferred |
| `HttpProviderDefaults` | deferred |
| `HttpResponse` | covered |
| `HttpResponseStatus` | covered |
| `RequestConfig` | covered |
| `RequestShortcutConfig` | covered |
| `RestBackend` | covered |
| `RestCacheStore` | deferred |
| `RestCacheStrategy` | deferred |
| `RestDefinition` | covered |
| `RestFactory` | covered |
| `RestOptions` | covered |
| `RestRequest` | covered |
| `RestResponse` | covered |
| `RestRevalidateEvent` | deferred |
| `RestService` | covered |

## Filters

| ng type | Go status |
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

| ng type | Go status |
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

| ng type | Go status |
| --- | --- |
| `StateDeclaration` | covered |
| `StateResolveArray` | covered |
| `StateResolveObject` | covered |
| `Transition` | covered |

## Realtime And Connections

| ng type | Go status |
| --- | --- |
| `ConnectionConfig` | covered |
| `ConnectionEvent` | covered |
| `RealtimeProtocolEventDetail` | covered |
| `RealtimeProtocolMessage` | covered |
| `SseConfig` | covered |
| `SseConnection` | covered |
| `SseProtocolEventDetail` | deferred |
| `SseProtocolMessage` | deferred |
| `SseService` | covered |
| `SwapModeType` | covered |
| `WebSocketConfig` | covered |
| `WebSocketConnection` | covered |
| `WebTransportBufferInput` | deferred |
| `WebTransportCertificateHash` | deferred |
| `WebTransportConfig` | deferred |
| `WebTransportConnection` | deferred |
| `WebTransportDatagramEvent` | deferred |
| `WebTransportOptions` | deferred |
| `WebTransportReconnectEvent` | deferred |
| `WebTransportRetryDelay` | deferred |
| `NativeWebTransport` | deferred |

## Wasm ABI

| ng type | Go status |
| --- | --- |
| `WasmAbiExports` | covered |
| `WasmInstantiationResult` | not-applicable |
| `WasmOptions` | not-applicable |
| `WasmScope` | covered |
| `WasmScopeAbi` | not-applicable |
| `WasmScopeAbiImportObject` | not-applicable |
| `WasmScopeAbiImports` | covered |
| `WasmScopeBindingOptions` | covered |
| `WasmScopeOptions` | not-applicable |
| `WasmScopeReference` | covered |
| `WasmScopeUpdate` | covered |
| `WasmScopeWatchOptions` | covered |
| `WasmService` | not-applicable |

## Web Components

| ng type | Go status |
| --- | --- |
| `AngularElementDefinition` | deferred |
| `AngularElementModuleOptions` | deferred |
| `AngularElementOptions` | deferred |
| `AppComponentOptions` | deferred |
| `ElementScopeOptions` | deferred |
| `ScopeElement` | deferred |
| `ScopeElementConstructor` | deferred |
| `WebComponentContext` | deferred |
| `WebComponentInput` | deferred |
| `WebComponentInputConfig` | deferred |
| `WebComponentInputs` | deferred |

## Storage, Workers, And Misc

| ng type | Go status |
| --- | --- |
| `CookieOptions` | covered |
| `CookieStoreOptions` | covered |
| `ErrorHandlingConfig` | deferred |
| `InterpolationFunction` | deferred |
| `NgModelController` | deferred |
| `StorageBackend` | covered |
| `StorageType` | covered |
| `WorkerConfig` | deferred |
| `WorkerConnection` | deferred |

## Parity Rules

1. Every public `ng` namespace type must be represented in this file.
2. Every `covered` item must have an idiomatic Go API and tests.
3. `started` is not a final decision. Use `covered`, `deferred`, `alias`,
   `unsafe`, or `not-applicable`.
4. New public `ng` namespace types require a Go parity decision in the same
   change.
5. Unsafe interop does not count as parity unless the type is explicitly marked
   `unsafe` with a reason in follow-up notes.
6. `make parity` must pass before Go integration changes are considered
   complete.
