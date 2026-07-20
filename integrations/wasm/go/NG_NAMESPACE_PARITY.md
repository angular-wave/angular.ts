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
diagnostics/events, template request/cache, storage/cookie, router state
declarations, realtime WebSocket/SSE, core REST facades, and the machine
data/config/runtime facade. Machine provider objects are no longer part of the
public `ng` namespace; Go parity tracks `MachineConfig`, machine snapshots, and
runtime machine APIs instead.

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
| `AngularService` | alias |
| `AnnotatedDirectiveFactory` | deferred |
| `AriaConfig` | deferred |
| `ClassMap` | deferred |
| `ClassValue` | deferred |
| `Component` | covered |
| `Controller` | covered |
| `DocumentService` | alias |
| `Directive` | deferred |
| `DirectiveRestrict` | deferred |
| `DirectiveFactory` | deferred |
| `ElementService` | alias |
| `InjectionTokenMap` | deferred |
| `NgModule` | covered |
| `LinkFn` | deferred |
| `Model` | deferred |
| `ModelChange` | deferred |
| `ModelRestoreOptions` | deferred |
| `ModelSyncFailureMode` | deferred |
| `ModelSyncOptions` | deferred |
| `ModelSyncTarget` | deferred |
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
| `MachineConfig` | covered |
| `MachineSendResult` | covered |
| `MachineSendStatus` | covered |
| `MachineSnapshot` | covered |
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
| `Policy` | deferred |
| `PolicyContext` | deferred |
| `PolicyDecision` | deferred |
| `SecurityConfig` | deferred |
| `SecurityCredentialsConfig` | deferred |
| `ServiceWorkerPostOptions` | deferred |
| `TransitionRouteContract` | deferred |
| `ScopeEvent` | covered |
| `Validator` | deferred |
| `WindowService` | alias |

## Providers

| ng type | Go status |
| --- | --- |
| `ProviderDefinition` | deferred |

## Services

| ng type | Go status |
| --- | --- |
| `AnchorScrollService` | deferred |
| `AnimateService` | deferred |
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
| `LogEntry` | covered |
| `LogLevel` | covered |
| `LogService` | covered |
| `MachineService` | covered |
| `SecurityPolicy` | deferred |
| `WorkflowService` | deferred |
| `ParseService` | deferred |
| `EventBusConfig` | deferred |
| `EventDeliveryPolicy` | deferred |
| `EventDeliveryPolicyContext` | deferred |
| `SceDelegateService` | deferred |
| `SceService` | deferred |
| `StreamService` | deferred |
| `TemplateCacheService` | covered |
| `TemplateRequestService` | covered |
| `TransitionsService` | deferred |
| `WebComponentService` | deferred |
| `WebSocketService` | covered |
| `WebTransportService` | deferred |
| `WorkerService` | covered |
| `ServiceWorkerService` | deferred |

## HTTP And REST

| ng type | Go status |
| --- | --- |
| `CachedRestBackendOptions` | deferred |
| `EntityClass` | deferred |
| `HttpMethod` | covered |
| `HttpDefaults` | deferred |
| `HttpResponse` | covered |
| `HttpResponseStatus` | covered |
| `HttpRequestConfig` | covered |
| `HttpRequestOptions` | covered |
| `RestBackend` | covered |
| `RestCachePolicy` | deferred |
| `RestCachePolicyContext` | deferred |
| `RestCacheStore` | deferred |
| `RestCacheStrategy` | deferred |
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
| `EntryFilterItem` | deferred |
| `FilterFactory` | deferred |
| `FilterFn` | deferred |

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

## Router

| ng type | Go status |
| --- | --- |
| `ParamsOf` | deferred |
| `ResolvesOf` | deferred |
| `RouterConfig` | deferred |
| `RouterModule` | deferred |
| `RouterModuleDeclaration` | deferred |
| `RoutesOf` | deferred |
| `StateDeclaration` | covered |
| `StatePolicyDeclaration` | deferred |
| `RouteContract` | deferred |
| `RouteMap` | deferred |
| `StateRegistryService` | deferred |
| `StateService` | deferred |
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

## Service Workers

| ng type | Go status |
| --- | --- |
| `ServiceWorkerConfig` | deferred |
| `ServiceWorkerErrorCode` | deferred |
| `ServiceWorkerMessageEvent` | deferred |
| `ServiceWorkerMessageTarget` | deferred |
| `ServiceWorkerRegistrationState` | deferred |
| `ServiceWorkerRequestOptions` | deferred |
| `ServiceWorkerUpdateState` | deferred |

## Wasm ABI

| ng type | Go status |
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
| `WasmService` | not-applicable |
| `WasmSource` | not-applicable |
| `WasmTarget` | covered |

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
| `WebComponentConfig` | deferred |
| `WebComponentInput` | deferred |
| `WebComponentInputConfig` | deferred |
| `WebComponentInputs` | deferred |

## Storage, Workers, And Misc

| ng type | Go status |
| --- | --- |
| `CookieOptions` | covered |
| `CookieStoreOptions` | covered |
| `ErrorHandlingConfig` | deferred |
| `HtmlCanvasRuntimeSupport` | deferred |
| `HtmlCanvasService` | deferred |
| `InterpolationFunction` | deferred |
| `NgModelController` | deferred |
| `HtmlCanvasConfig` | deferred |
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
2. Every `covered` item must have an idiomatic Go API and tests.
3. `started` is not a final decision. Use `covered`, `deferred`, `alias`,
   `unsafe`, or `not-applicable`.
4. New public `ng` namespace types require a Go parity decision in the same
   change.
5. Unsafe interop does not count as parity unless the type is explicitly marked
   `unsafe` with a reason in follow-up notes.
6. `make parity` must pass before Go integration changes are considered
   complete.
