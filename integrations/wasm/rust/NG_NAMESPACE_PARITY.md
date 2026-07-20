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

Directive link callback parity must follow the current attrs-free link shape:
`(scope, element, controller?, transclude?)`. Compile/template/controller
`$attrs` and attribute helper services are not part of the Rust public facade.

## Rust Completion Gate

Rust is the reference implementation for all Wasm targets. Do not switch active
implementation work to Go, AssemblyScript, C#, Zig, C++, or C until the
required Rust namespace porting surface is covered here and tested.

Required Rust porting entries:

- Direct Wasm scope ABI boundary from
  `@angular-wave/angular.ts/services/wasm`: `WasmScopeAbiImports`,
  `WasmAbiExports`, and `WasmScopeReference`, represented for Rust authoring by
  `Field`, `BinaryField`, `ScopeUpdate`, `WatchOptions`, and `WriteOptions`.
  These are no longer ambient `ng` namespace parity rows.
- Restricted scope/lifecycle facade: `Scope` and `RootScopeService`.
- Rust authoring metadata: `Component`, `Controller`,
  `ControllerConstructor`, `NgModule`, `Injectable`, and `InjectionTokens`.
- HTTP facade: `HttpService`, `HttpRequestConfig`, `HttpRequestOptions`,
  `HttpMethod`, `HttpResponse`, and `HttpResponseStatus`.
- Diagnostics and events: `LogService`, `ExceptionHandlerService`,
  `PubSubService`, `ListenerFn`, `ScopeEvent`, and `InvocationDetail`.
- Template-file support: `TemplateRequestService` and `TemplateCacheService`.
- Persistence: `StorageBackend`, `StorageType`, `CookieService`,
  `CookieOptions`, and `CookieStoreOptions`.

These entries may remain `deferred` only while Rust feature completion is still
open. The Rust feature-complete gate requires each required entry to become
`covered` with tests or to be removed from the required surface by an explicit
plan change.

The selected next-priority Rust app-authoring surfaces after the required
surface are now covered: router/state, realtime, core REST facades, and the
machine data/config/runtime facade. Forms and validation remain the next useful
application-level gap. Other provider/config-time APIs, compile/link internals,
browser object aliases, animation, worker, web component, REST cache/revalidation
helpers, and parse/interpolate/filter/SCE/location APIs remain deferred unless a
Rust reference example makes one necessary.

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
| `AngularService` | alias |
| `AnnotatedDirectiveFactory` | deferred |
| `ClassMap` | deferred |
| `ClassValue` | deferred |
| `Component` | covered |
| `Controller` | covered |
| `Directive` | deferred |
| `DirectiveRestrict` | deferred |
| `DirectiveFactory` | deferred |
| `DocumentService` | alias |
| `ElementService` | alias |
| `InjectionTokenMap` | deferred |
| `NgModule` | covered |
| `LinkFn` | deferred |
| `Scope` | covered |
| `ScopeService` | alias |
| `RootScopeService` | alias |
| `RootElementService` | alias |
| `TranscludeFn` | deferred |
| `AnnotatedFactory` | deferred |
| `ControllerConstructor` | covered |
| `Expression` | deferred |
| `Injectable` | covered |
| `ListenerFn` | covered |
| `Machine` | covered |
| `MachineContract` | deferred |
| `MachineConfig` | deferred |
| `MachineSendResult` | deferred |
| `MachineSendStatus` | deferred |
| `MachineSnapshot` | covered |
| `Model` | deferred |
| `ModelChange` | deferred |
| `ModelRestoreOptions` | deferred |
| `ModelSyncFailureMode` | deferred |
| `ModelSyncOptions` | deferred |
| `ModelSyncTarget` | deferred |
| `Policy` | deferred |
| `PolicyContext` | deferred |
| `PolicyDecision` | deferred |
| `Workflow` | deferred |
| `WorkflowCommand` | deferred |
| `WorkflowCommandContract` | deferred |
| `WorkflowCommandContext` | deferred |
| `WorkflowCommandDefinition` | deferred |
| `WorkflowContract` | deferred |
| `WorkflowResult` | deferred |
| `WorkflowSnapshot` | deferred |
| `WorkflowSupervisor` | deferred |
| `WorkflowSupervisorConfig` | deferred |
| `WorkflowSupervisorPersistence` | deferred |
| `WorkflowSupervisorPersistenceConfig` | deferred |
| `WorkflowSupervisorSnapshot` | deferred |
| `ScopeEvent` | covered |
| `Validator` | deferred |
| `WindowService` | alias |

## Providers

| ng type | Rust status |
| --- | --- |
| `ProviderDefinition` | deferred |

## Services

| ng type | Rust status |
| --- | --- |
| `AnchorScrollService` | deferred |
| `AnimateService` | deferred |
| `AriaConfig` | deferred |
| `AriaService` | deferred |
| `CompileService` | deferred |
| `ControllerService` | deferred |
| `CookieService` | covered |
| `EventBusService` | covered |
| `ExceptionHandlerService` | covered |
| `FilterService` | deferred |
| `HttpParamSerializerService` | deferred |
| `HttpService` | covered |
| `InjectorService` | deferred |
| `InterpolateConfig` | deferred |
| `InterpolateService` | deferred |
| `LocationService` | deferred |
| `LogBeaconConfig` | deferred |
| `LogBeaconSerializer` | deferred |
| `LogEntry` | deferred |
| `LogLevel` | deferred |
| `LogService` | covered |
| `MachineService` | covered |
| `EventBusConfig` | deferred |
| `WorkflowService` | deferred |
| `ParseService` | deferred |
| `SceDelegateService` | deferred |
| `SceService` | deferred |
| `SecurityPolicy` | deferred |
| `SecurityConfig` | deferred |
| `SecurityCredentialsConfig` | deferred |
| `ServiceWorkerService` | deferred |
| `StreamService` | deferred |
| `TemplateCacheService` | covered |
| `TemplateRequestService` | covered |
| `TransitionsService` | deferred |
| `WebComponentService` | deferred |
| `WebSocketService` | covered |
| `WebTransportService` | deferred |
| `WorkerService` | covered |

## HTTP And REST

| ng type | Rust status |
| --- | --- |
| `CachedRestBackendOptions` | deferred |
| `EntityClass` | deferred |
| `HttpMethod` | covered |
| `HttpDefaults` | deferred |
| `HttpResponse` | covered |
| `HttpResponseStatus` | covered |
| `HttpRequestConfig` | covered |
| `HttpRequestOptions` | covered |
| `RestCachePolicy` | deferred |
| `RestCachePolicyContext` | deferred |
| `RestBackend` | covered |
| `RestCacheStore` | deferred |
| `RestCacheStrategy` | deferred |
| `RestFactory` | covered |
| `RestOptions` | covered |
| `RestRequest` | covered |
| `RestResponse` | covered |
| `RestRevalidateEvent` | deferred |
| `RestService` | covered |

## Filters

| ng type | Rust status |
| --- | --- |
| `CurrencyFilterOptions` | deferred |
| `EntryFilterItem` | deferred |
| `FilterFactory` | deferred |
| `FilterFn` | deferred |

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

## Router

| ng type | Rust status |
| --- | --- |
| `ParamsOf` | deferred |
| `ResolvesOf` | deferred |
| `RouterConfig` | deferred |
| `RouterModuleDeclaration` | deferred |
| `RoutesOf` | deferred |
| `StateDeclaration` | covered |
| `StatePolicyDeclaration` | deferred |
| `StateRegistryService` | covered |
| `RouteContract` | deferred |
| `RouteMap` | deferred |
| `RouterModule` | deferred |
| `StateService` | deferred |
| `Transition` | covered |
| `TransitionRouteContract` | deferred |

## Realtime And Connections

| ng type | Rust status |
| --- | --- |
| `ConnectionConfig` | covered |
| `ConnectionEvent` | covered |
| `EventDeliveryPolicy` | deferred |
| `EventDeliveryPolicyContext` | deferred |
| `RealtimeProtocolEventDetail` | covered |
| `RealtimeProtocolMessage` | covered |
| `SseConfig` | covered |
| `SseConnection` | covered |
| `SseService` | covered |
| `SwapMode` | covered |
| `WebSocketConfig` | covered |
| `WebSocketConnection` | covered |
| `WebTransportBufferInput` | deferred |
| `WebTransportConfig` | deferred |
| `WebTransportConnection` | deferred |
| `WebTransportDatagramEvent` | deferred |
| `WebTransportReconnectEvent` | deferred |
| `WebTransportRetryDelay` | deferred |

## Wasm ABI

| ng type | Rust status |
| --- | --- |
| `WasmBinding` | covered |
| `WasmBindingOptions` | covered |
| `WasmCompileOptions` | not-applicable |
| `WasmError` | not-applicable |
| `WasmErrorCode` | not-applicable |
| `WasmErrorStage` | not-applicable |
| `WasmLoadOptions` | not-applicable |
| `WasmResource` | not-applicable |
| `WasmResourceStatus` | not-applicable |
| `WasmSource` | not-applicable |
| `WasmTarget` | covered |
| `WasmService` | not-applicable |

## Web Components

| ng type | Rust status |
| --- | --- |
| `AngularElementDefinition` | deferred |
| `AngularElementModuleOptions` | deferred |
| `AngularElementOptions` | deferred |
| `AppComponentOptions` | deferred |
| `ElementScopeOptions` | deferred |
| `ScopeElement` | deferred |
| `ScopeElementConstructor` | deferred |
| `WebComponentConfig` | deferred |
| `WebComponentContext` | deferred |
| `WebComponentInput` | deferred |
| `WebComponentInputConfig` | deferred |
| `WebComponentInputs` | deferred |

## Storage, Workers, And Misc

| ng type | Rust status |
| --- | --- |
| `CookieOptions` | covered |
| `CookieStoreOptions` | covered |
| `ErrorHandlingConfig` | deferred |
| `InterpolationFunction` | deferred |
| `NgModelController` | deferred |
| `HtmlCanvasConfig` | deferred |
| `HtmlCanvasRuntimeSupport` | deferred |
| `HtmlCanvasService` | deferred |
| `ServiceWorkerConfig` | deferred |
| `ServiceWorkerErrorCode` | deferred |
| `ServiceWorkerMessageEvent` | deferred |
| `ServiceWorkerMessageTarget` | deferred |
| `ServiceWorkerPostOptions` | deferred |
| `ServiceWorkerRegistrationState` | deferred |
| `ServiceWorkerRequestOptions` | deferred |
| `ServiceWorkerUpdateState` | deferred |
| `StorageBackend` | covered |
| `StorageType` | covered |
| `WorkerConfig` | covered |
| `WorkerError` | covered |
| `WorkerErrorCode` | covered |
| `WorkerHandle` | covered |
| `WorkerModelMessage` | covered |
| `WorkerRequest` | covered |
| `WorkerRequestOptions` | covered |
| `WorkerResponse` | covered |
| `WorkerStatus` | covered |

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
