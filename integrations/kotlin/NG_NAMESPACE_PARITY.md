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
| `AngularService` | alias |
| `AnnotatedDirectiveFactory` | generated |
| `AriaConfig` | generated |
| `ClassMap` | generated |
| `ClassValue` | generated |
| `Component` | generated |
| `Controller` | generated |
| `DocumentService` | alias |
| `Directive` | generated |
| `DirectiveRestrict` | generated |
| `DirectiveFactory` | generated |
| `ElementService` | alias |
| `InjectionTokenMap` | generated |
| `NgModule` | generated |
| `LinkFn` | generated |
| `Model` | generated |
| `ModelChange` | generated |
| `ModelRestoreOptions` | generated |
| `ModelSyncFailureMode` | generated |
| `ModelSyncOptions` | generated |
| `ModelSyncTarget` | generated |
| `RootElementService` | alias |
| `RootScopeService` | alias |
| `Scope` | generated |
| `ScopeService` | alias |
| `TranscludeFn` | generated |
| `AnnotatedFactory` | generated |
| `ControllerConstructor` | generated |
| `Expression` | alias |
| `Injectable` | generated |
| `ListenerFn` | generated |
| `Machine` | generated |
| `MachineContract` | generated |
| `MachineConfig` | generated |
| `MachineSendResult` | generated |
| `MachineSendStatus` | generated |
| `MachineSnapshot` | generated |
| `Workflow` | generated |
| `WorkflowCommand` | generated |
| `WorkflowCommandContract` | generated |
| `WorkflowCommandContext` | generated |
| `WorkflowCommandDefinition` | generated |
| `WorkflowContract` | generated |
| `WorkflowResult` | generated |
| `WorkflowSnapshot` | generated |
| `WorkflowSupervisorPersistence` | generated |
| `WorkflowSupervisorPersistenceConfig` | generated |
| `Policy` | generated |
| `PolicyContext` | generated |
| `PolicyDecision` | generated |
| `SecurityConfig` | generated |
| `SecurityCredentialsConfig` | generated |
| `TransitionRouteContract` | generated |
| `ScopeEvent` | generated |
| `Validator` | generated |
| `WindowService` | alias |

## Providers

| ng type | Kotlin status |
| --- | --- |
| `ProviderDefinition` | review |

## Workflow Helpers

| ng type | Kotlin status |
| --- | --- |
| `WorkflowSupervisor` | generated |
| `WorkflowSupervisorConfig` | generated |
| `WorkflowSupervisorSnapshot` | generated |

## Services

| ng type | Kotlin status |
| --- | --- |
| `AnchorScrollService` | generated |
| `AnimateService` | generated |
| `AriaService` | generated |
| `CompileService` | generated |
| `ControllerService` | generated |
| `CookieService` | generated |
| `EventBusService` | generated |
| `ExceptionHandlerService` | generated |
| `FilterService` | generated |
| `HttpParamSerializerService` | generated |
| `HttpService` | generated |
| `InjectorService` | generated |
| `InterpolateConfig` | generated |
| `InterpolateService` | generated |
| `LocationService` | generated |
| `LogService` | generated |
| `LogBeaconConfig` | generated |
| `LogBeaconSerializer` | generated |
| `LogEntry` | generated |
| `LogLevel` | generated |
| `MachineService` | generated |
| `SecurityPolicy` | generated |
| `WorkflowService` | generated |
| `ParseService` | generated |
| `EventBusConfig` | generated |
| `ServiceWorkerConfig` | generated |
| `ServiceWorkerErrorCode` | generated |
| `ServiceWorkerMessageEvent` | generated |
| `ServiceWorkerMessageTarget` | generated |
| `ServiceWorkerPostOptions` | generated |
| `ServiceWorkerRegistrationState` | generated |
| `ServiceWorkerRequestOptions` | generated |
| `ServiceWorkerService` | generated |
| `ServiceWorkerUpdateState` | generated |
| `SceDelegateService` | generated |
| `SceService` | generated |
| `StreamService` | generated |
| `TemplateCacheService` | generated |
| `TemplateRequestService` | generated |
| `TransitionsService` | generated |
| `WebComponentService` | generated |
| `WebSocketService` | generated |
| `WebTransportService` | generated |
| `WorkerService` | generated |
| `WorkerStatus` | generated |

## HTTP And REST

| ng type | Kotlin status |
| --- | --- |
| `CachedRestBackendOptions` | generated |
| `EntityClass` | generated |
| `HttpMethod` | generated |
| `HttpDefaults` | generated |
| `HttpResponse` | generated |
| `HttpResponseStatus` | generated |
| `HttpRequestConfig` | generated |
| `HttpRequestOptions` | generated |
| `RestBackend` | generated |
| `RestCachePolicy` | generated |
| `RestCachePolicyContext` | generated |
| `RestCacheStore` | generated |
| `RestCacheStrategy` | generated |
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
| `EntryFilterItem` | generated |
| `FilterFactory` | generated |
| `FilterFn` | generated |

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

## Router

| ng type | Kotlin status |
| --- | --- |
| `ParamsOf` | generated |
| `ResolvesOf` | generated |
| `RouterModule` | generated |
| `RoutesOf` | generated |
| `StateDeclaration` | generated |
| `RouterConfig` | generated |
| `RouterModuleDeclaration` | generated |
| `StatePolicyDeclaration` | generated |
| `RouteContract` | generated |
| `RouteMap` | generated |
| `StateRegistryService` | generated |
| `StateService` | generated |
| `Transition` | generated |

## Realtime And Connections

| ng type | Kotlin status |
| --- | --- |
| `ConnectionConfig` | generated |
| `ConnectionEvent` | generated |
| `EventDeliveryPolicy` | generated |
| `EventDeliveryPolicyContext` | generated |
| `RealtimeProtocolEventDetail` | generated |
| `RealtimeProtocolMessage` | generated |
| `SseConfig` | generated |
| `SseConnection` | generated |
| `SseService` | generated |
| `SwapMode` | generated |
| `WebSocketConfig` | generated |
| `WebSocketConnection` | generated |
| `WebTransportBufferInput` | generated |
| `WebTransportConfig` | generated |
| `WebTransportConnection` | generated |
| `WebTransportDatagramEvent` | generated |
| `WebTransportReconnectEvent` | generated |
| `WebTransportRetryDelay` | generated |

## Wasm

| ng type | Kotlin status |
| --- | --- |
| `WasmBinding` | generated |
| `WasmBindingOptions` | generated |
| `WasmCompileOptions` | generated |
| `WasmError` | generated |
| `WasmErrorCode` | generated |
| `WasmErrorStage` | generated |
| `WasmLoadOptions` | generated |
| `WasmResource` | generated |
| `WasmResourceStatus` | generated |
| `WasmService` | generated |
| `WasmSource` | generated |
| `WasmTarget` | generated |

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
| `WebComponentConfig` | generated |
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
| `HtmlCanvasConfig` | generated |
| `HtmlCanvasRuntimeSupport` | generated |
| `HtmlCanvasService` | generated |
| `StorageBackend` | generated |
| `StorageType` | generated |
| `WorkerConfig` | generated |
| `WorkerError` | generated |
| `WorkerErrorCode` | generated |
| `WorkerHandle` | generated |
| `WorkerModelMessage` | generated |
| `WorkerRequest` | generated |
| `WorkerRequestOptions` | generated |
| `WorkerResponse` | generated |

## Parity Rules

- Every public type alias in `@types/namespace.d.ts` must appear exactly once in
  this file.
- `planned` and `review` entries are allowed while the Kotlin integration is
  being built, but they are not considered parity-complete.
- `alias`, `generated`, `manual`, and `unsupported` entries must have explicit
  member-level coverage or override decisions once implementation begins.
- `unsupported` entries must document the reason and the unsafe fallback before
  release.
