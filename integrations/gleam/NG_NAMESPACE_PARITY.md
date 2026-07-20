# ng Namespace Parity

The Gleam integration must reach feature parity with every type made public in
the AngularTS `ng` namespace.

The source of truth is:

```text
@types/namespace.d.ts
```

Gleam parity is checked from the TypeScript namespace declaration. Dart is not a
source for this inventory.

Directive link callback parity follows the current attrs-free shape:
`(scope, element)`, `(scope, element, transclude)`, or
`(scope, element, controller, transclude?)`. Compile/template/controller
Directive link callbacks no longer receive `$attrs`; attribute helpers are not
part of the Gleam public facade.

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
| `AngularService` | inventory |
| `AnnotatedDirectiveFactory` | inventory |
| `AriaConfig` | inventory |
| `ClassMap` | inventory |
| `ClassValue` | review |
| `Component` | started |
| `Controller` | inventory |
| `Directive` | started |
| `DirectiveRestrict` | inventory |
| `DirectiveFactory` | inventory |
| `DocumentService` | inventory |
| `ElementService` | inventory |
| `InjectionTokenMap` | inventory |
| `NgModule` | started |
| `RouterModule` | inventory |
| `LinkFn` | inventory |
| `Scope` | started |
| `TranscludeFn` | inventory |
| `AnnotatedFactory` | started |
| `ControllerConstructor` | review |
| `Expression` | alias |
| `Injectable` | started |
| `ListenerFn` | inventory |
| `Machine` | inventory |
| `MachineContract` | inventory |
| `MachineConfig` | inventory |
| `MachineSendResult` | inventory |
| `MachineSendStatus` | inventory |
| `MachineSnapshot` | inventory |
| `Model` | inventory |
| `ModelChange` | inventory |
| `ModelRestoreOptions` | inventory |
| `ModelSyncFailureMode` | inventory |
| `ModelSyncOptions` | inventory |
| `ModelSyncTarget` | inventory |
| `RootElementService` | inventory |
| `RootScopeService` | inventory |
| `ScopeService` | inventory |
| `Workflow` | inventory |
| `WorkflowCommand` | inventory |
| `WorkflowCommandContract` | inventory |
| `WorkflowCommandContext` | inventory |
| `WorkflowCommandDefinition` | inventory |
| `WorkflowContract` | inventory |
| `WorkflowResult` | inventory |
| `WorkflowSnapshot` | inventory |
| `WorkflowSupervisor` | inventory |
| `WorkflowSupervisorConfig` | inventory |
| `WorkflowSupervisorPersistence` | inventory |
| `WorkflowSupervisorPersistenceConfig` | inventory |
| `WorkflowSupervisorSnapshot` | inventory |
| `Policy` | inventory |
| `PolicyContext` | inventory |
| `PolicyDecision` | inventory |
| `SecurityConfig` | inventory |
| `SecurityCredentialsConfig` | inventory |
| `ServiceWorkerPostOptions` | inventory |
| `TransitionRouteContract` | inventory |
| `ScopeEvent` | inventory |
| `Validator` | inventory |
| `WindowService` | inventory |

## Providers

| ng type | Gleam status |
| --- | --- |
| `ProviderDefinition` | inventory |

## Services

| ng type | Gleam status |
| --- | --- |
| `AnchorScrollService` | inventory |
| `AnimateService` | inventory |
| `AnimationHandle` | inventory |
| `AnimationContext` | inventory |
| `AnimationLifecycleCallback` | inventory |
| `AriaService` | inventory |
| `CompileService` | inventory |
| `ControllerService` | inventory |
| `CookieService` | inventory |
| `EventBusService` | inventory |
| `ExceptionHandlerService` | inventory |
| `FilterFn` | inventory |
| `FilterFactory` | inventory |
| `FilterService` | inventory |
| `HttpParamSerializerService` | inventory |
| `HttpService` | inventory |
| `InjectorService` | started |
| `InterpolateConfig` | inventory |
| `InterpolateService` | inventory |
| `LocationService` | inventory |
| `LogService` | inventory |
| `LogBeaconConfig` | inventory |
| `LogBeaconSerializer` | inventory |
| `LogEntry` | inventory |
| `LogLevel` | inventory |
| `MachineService` | inventory |
| `WorkflowService` | inventory |
| `ParseService` | inventory |
| `EventBusConfig` | inventory |
| `EventDeliveryPolicy` | inventory |
| `EventDeliveryPolicyContext` | inventory |
| `SceService` | inventory |
| `SceDelegateService` | inventory |
| `SecurityPolicy` | inventory |
| `StreamService` | inventory |
| `TemplateCacheService` | inventory |
| `TemplateRequestService` | inventory |
| `TransitionsService` | inventory |
| `TransitionsService` | inventory |
| `WorkerService` | covered |
| `ServiceWorkerService` | inventory |
| `StateRegistryService` | inventory |

## HTTP And REST

| ng type | Gleam status |
| --- | --- |
| `CachedRestBackendOptions` | inventory |
| `EntityClass` | inventory |
| `HttpMethod` | started |
| `HttpDefaults` | inventory |
| `HttpResponse` | inventory |
| `HttpResponseStatus` | started |
| `HttpRequestConfig` | started |
| `HttpRequestOptions` | started |
| `RestBackend` | inventory |
| `RestCachePolicy` | inventory |
| `RestCachePolicyContext` | inventory |
| `RestCacheStore` | inventory |
| `RestCacheStrategy` | inventory |
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
| `EntryFilterItem` | started |

## Animation

| ng type | Gleam status |
| --- | --- |
| `AnimationOptions` | inventory |
| `AnimationPhase` | inventory |
| `AnimationPreset` | inventory |
| `AnimationPresetHandler` | inventory |
| `AnimationResult` | inventory |

## Router

| ng type | Gleam status |
| --- | --- |
| `RouterConfig` | inventory |
| `RouterModuleDeclaration` | inventory |
| `StateDeclaration` | inventory |
| `StatePolicyDeclaration` | inventory |
| `RouteContract` | inventory |
| `RouteMap` | inventory |
| `RoutesOf` | inventory |
| `ParamsOf` | inventory |
| `ResolvesOf` | inventory |
| `StateService` | inventory |
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
| `SseService` | inventory |
| `SwapMode` | inventory |
| `WebSocketConfig` | inventory |
| `WebSocketConnection` | inventory |
| `WebSocketService` | inventory |
| `WebTransportBufferInput` | inventory |
| `WebTransportConfig` | inventory |
| `WebTransportConnection` | inventory |
| `WebTransportDatagramEvent` | inventory |
| `WebTransportReconnectEvent` | inventory |
| `WebTransportRetryDelay` | inventory |
| `WebTransportService` | inventory |

## Web Components

| ng type | Gleam status |
| --- | --- |
| `AngularElementDefinition` | inventory |
| `AngularElementModuleOptions` | inventory |
| `AngularElementOptions` | inventory |
| `AppComponentOptions` | started |
| `ElementScopeOptions` | inventory |
| `ScopeElement` | started |
| `ScopeElementConstructor` | started |
| `WebComponentContext` | inventory |
| `WebComponentConfig` | inventory |
| `WebComponentInput` | inventory |
| `WebComponentInputConfig` | inventory |
| `WebComponentInputs` | inventory |
| `WebComponentService` | inventory |

## Storage, Workers, Wasm, And Misc

| ng type | Gleam status |
| --- | --- |
| `CookieOptions` | started |
| `CookieStoreOptions` | started |
| `ErrorHandlingConfig` | inventory |
| `InterpolationFunction` | inventory |
| `NgModelController` | inventory |
| `HtmlCanvasConfig` | inventory |
| `HtmlCanvasRuntimeSupport` | inventory |
| `HtmlCanvasService` | inventory |
| `ServiceWorkerConfig` | inventory |
| `ServiceWorkerErrorCode` | inventory |
| `ServiceWorkerMessageEvent` | inventory |
| `ServiceWorkerMessageTarget` | inventory |
| `ServiceWorkerRegistrationState` | inventory |
| `ServiceWorkerRequestOptions` | inventory |
| `ServiceWorkerUpdateState` | inventory |
| `StorageBackend` | started |
| `StorageType` | started |
| `WorkerConfig` | covered |
| `WorkerError` | covered |
| `WorkerErrorCode` | covered |
| `WorkerHandle` | covered |
| `WorkerModelMessage` | covered |
| `WorkerRequest` | covered |
| `WorkerRequestOptions` | covered |
| `WorkerResponse` | covered |
| `WorkerStatus` | covered |
| `WasmBinding` | inventory |
| `WasmBindingOptions` | inventory |
| `WasmCompileOptions` | inventory |
| `WasmError` | inventory |
| `WasmErrorCode` | inventory |
| `WasmErrorStage` | inventory |
| `WasmLoadOptions` | inventory |
| `WasmResource` | inventory |
| `WasmResourceStatus` | inventory |
| `WasmService` | inventory |
| `WasmSource` | inventory |
| `WasmTarget` | inventory |

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
