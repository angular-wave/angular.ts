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

## Rust Completion Gate

Rust is the reference implementation for all Wasm targets. Do not switch active
implementation work to Go, AssemblyScript, C#, Zig, C++, or C until the
required Rust namespace porting surface is covered here and tested.

Required Rust porting entries:

- Wasm scope boundary: `WasmScope`, `WasmScopeAbiImports`, `WasmAbiExports`,
  `WasmScopeUpdate`, `WasmScopeWatchOptions`, `WasmScopeBindingOptions`, and
  `WasmScopeReference`.
- Restricted scope/lifecycle facade: `Scope` and `RootScopeService`.
- Rust authoring metadata: `Component`, `Controller`,
  `ControllerConstructor`, `NgModule`, `Injectable`, and `InjectionTokens`.
- HTTP facade: `HttpService`, `RequestConfig`, `RequestShortcutConfig`,
  `HttpMethod`, `HttpResponse`, and `HttpResponseStatus`.
- Diagnostics and events: `LogService`, `ExceptionHandlerService`,
  `PubSubService`, `TopicService`, `ListenerFn`, `ScopeEvent`, and
  `InvocationDetail`.
- Template-file support: `TemplateRequestService` and `TemplateCacheService`.
- Persistence: `StorageBackend`, `StorageType`, `CookieService`,
  `CookieOptions`, and `CookieStoreOptions`.

These entries may remain `deferred` only while Rust feature completion is still
open. The Rust feature-complete gate requires each required entry to become
`covered` with tests or to be removed from the required surface by an explicit
plan change.

Next-priority Rust entries after the required surface are realtime, forms,
router/state, and REST facades. Provider/config-time APIs, compile/link
internals, browser object aliases, animation, worker, web component, and
parse/interpolate/filter/SCE/location APIs remain deferred unless a Rust
reference example makes one necessary.

## Status Legend

- `covered`: idiomatic Rust API exists and is tested.
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
| `Component` | covered |
| `Controller` | covered |
| `Directive` | deferred |
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
| `CookieService` | covered |
| `DocumentService` | alias |
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
| `RootElementService` | alias |
| `RootScopeService` | covered |
| `SceDelegateService` | deferred |
| `SceService` | deferred |
| `StateRegistryService` | deferred |
| `StateService` | deferred |
| `StreamService` | deferred |
| `TemplateCacheService` | covered |
| `TemplateRequestService` | covered |
| `TopicService` | covered |
| `WebComponentService` | deferred |
| `WebSocketService` | deferred |
| `WebTransportService` | deferred |
| `WindowService` | alias |

## HTTP And REST

| ng type | Rust status |
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

## Wasm ABI

| ng type | Rust status |
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
2. Every `covered` item must have an idiomatic Rust API and tests.
3. `started` is not a final MVP decision. Use `covered`, `deferred`, `alias`,
   `unsafe`, or `not-applicable` before the Rust feature-complete gate.
4. New public `ng` namespace types require a Rust parity decision in the same
   change.
5. Unsafe interop does not count as parity unless the type is explicitly marked
   `unsafe` with a reason in follow-up notes.
6. `make parity` must pass before Rust integration changes are considered
   complete.
7. The required Rust porting entries above block all active non-Rust Wasm
   implementation work until they are covered and tested.
