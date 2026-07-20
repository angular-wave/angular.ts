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

Directive link callback parity follows the current attrs-free shape:
`(scope, element)`, `(scope, element, transclude)`, or
`(scope, element, controller, transclude?)`. Compile/template/controller
Directive link callbacks no longer receive `$attrs`; attribute helpers are not
part of the Dart public facade.

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
| `AngularService` | alias |
| `AnnotatedDirectiveFactory` | started |
| `AriaConfig` | started |
| `ClassMap` | started |
| `ClassValue` | review |
| `Component` | started |
| `Controller` | started |
| `DocumentService` | alias |
| `Directive` | started |
| `DirectiveRestrict` | started |
| `DirectiveFactory` | started |
| `ElementService` | alias |
| `InjectionTokenMap` | review |
| `NgModule` | started |
| `LinkFn` | started |
| `Model` | started |
| `ModelChange` | started |
| `ModelRestoreOptions` | started |
| `ModelSyncFailureMode` | started |
| `ModelSyncOptions` | started |
| `ModelSyncTarget` | started |
| `RootElementService` | alias |
| `RootScopeService` | alias |
| `Scope` | started |
| `ScopeService` | alias |
| `TranscludeFn` | started |
| `AnnotatedFactory` | started |
| `ControllerConstructor` | started |
| `Expression` | alias |
| `Injectable` | started |
| `ListenerFn` | started |
| `Machine` | started |
| `MachineContract` | started |
| `MachineConfig` | started |
| `MachineSendResult` | started |
| `MachineSendStatus` | started |
| `MachineSnapshot` | started |
| `Workflow` | started |
| `WorkflowCommand` | started |
| `WorkflowCommandContract` | started |
| `WorkflowCommandContext` | started |
| `WorkflowCommandDefinition` | started |
| `WorkflowContract` | started |
| `WorkflowResult` | started |
| `WorkflowSnapshot` | started |
| `WorkflowSupervisorPersistence` | started |
| `WorkflowSupervisorPersistenceConfig` | started |
| `Policy` | started |
| `PolicyContext` | started |
| `PolicyDecision` | started |
| `SecurityConfig` | started |
| `SecurityCredentialsConfig` | started |
| `ServiceWorkerPostOptions` | started |
| `TransitionRouteContract` | started |
| `ScopeEvent` | started |
| `Validator` | started |
| `WindowService` | alias |

## Providers

| ng type | Dart status |
| --- | --- |
| `ProviderDefinition` | review |

## Services

| ng type | Dart status |
| --- | --- |
| `AnchorScrollService` | started |
| `AnimateService` | started |
| `AriaService` | started |
| `CompileService` | started |
| `ControllerService` | started |
| `CookieService` | started |
| `EventBusService` | started |
| `ExceptionHandlerService` | started |
| `FilterService` | started |
| `HttpParamSerializerService` | started |
| `HttpService` | started |
| `InjectorService` | started |
| `InterpolateConfig` | started |
| `InterpolateService` | started |
| `LocationService` | started |
| `LogService` | started |
| `LogBeaconConfig` | started |
| `LogBeaconSerializer` | started |
| `LogEntry` | started |
| `LogLevel` | started |
| `MachineService` | started |
| `SecurityPolicy` | started |
| `WorkflowService` | started |
| `ParseService` | started |
| `SceDelegateService` | started |
| `SceService` | started |
| `StreamService` | started |
| `TemplateCacheService` | started |
| `TemplateRequestService` | started |
| `TransitionsService` | started |
| `WebComponentService` | started |
| `WebSocketService` | started |
| `WebTransportService` | started |
| `WorkerService` | started |

## HTTP And REST

| ng type | Dart status |
| --- | --- |
| `CachedRestBackendOptions` | started |
| `EntityClass` | started |
| `HttpMethod` | started |
| `HttpDefaults` | started |
| `HttpResponse` | started |
| `HttpResponseStatus` | started |
| `HttpRequestConfig` | started |
| `HttpRequestOptions` | started |
| `RestBackend` | started |
| `RestCacheStore` | started |
| `RestCacheStrategy` | started |
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
| `EntryFilterItem` | started |
| `FilterFactory` | started |
| `FilterFn` | started |

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

## Router

| ng type | Dart status |
| --- | --- |
| `ParamsOf` | started |
| `ResolvesOf` | started |
| `RouterModule` | started |
| `RoutesOf` | started |
| `StateDeclaration` | started |
| `StateRegistryService` | started |
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
| `SseService` | started |
| `SwapMode` | started |
| `WebSocketConfig` | started |
| `WebSocketConnection` | started |
| `WebTransportBufferInput` | started |
| `WebTransportConfig` | started |
| `WebTransportConnection` | started |
| `WebTransportDatagramEvent` | started |
| `WebTransportReconnectEvent` | started |
| `WebTransportRetryDelay` | started |

## Wasm

| ng type | Dart status |
| --- | --- |
| `WasmBinding` | started |
| `WasmBindingOptions` | started |
| `WasmCompileOptions` | started |
| `WasmError` | started |
| `WasmErrorCode` | started |
| `WasmLoadOptions` | started |
| `WasmResource` | started |
| `WasmResourceStatus` | started |
| `WasmService` | started |
| `WasmSource` | started |
| `WasmTarget` | started |

## Web Components

| ng type | Dart status |
| --- | --- |
| `AngularElementDefinition` | started |
| `AngularElementModuleOptions` | started |
| `AngularElementOptions` | started |
| `AppComponentOptions` | started |
| `ElementScopeOptions` | started |
| `ScopeElement` | started |
| `ScopeElementConstructor` | started |
| `WebComponentContext` | started |
| `WebComponentConfig` | started |
| `WebComponentInput` | started |
| `WebComponentInputConfig` | started |
| `WebComponentInputs` | started |

## Storage, Workers, And Misc

| ng type | Dart status |
| --- | --- |
| `CookieOptions` | started |
| `CookieStoreOptions` | started |
| `ErrorHandlingConfig` | started |
| `InterpolationFunction` | started |
| `NgModelController` | started |
| `HtmlCanvasConfig` | started |
| `HtmlCanvasRuntimeSupport` | started |
| `HtmlCanvasService` | started |
| `StorageBackend` | started |
| `StorageType` | started |
| `WorkerConfig` | started |
| `WorkerError` | started |
| `WorkerErrorCode` | started |
| `WorkerHandle` | started |
| `WorkerModelMessage` | started |
| `WorkerRequest` | started |
| `WorkerRequestOptions` | started |
| `WorkerResponse` | started |
| `WorkerStatus` | started |

## Recent Generated Surface

These entries were added after the initial Dart parity table. They are tracked
explicitly here until a later ergonomic pass moves them into narrower sections.

| ng type | Dart status |
| --- | --- |
| `EventDeliveryPolicy` | started |
| `EventDeliveryPolicyContext` | started |
| `EventBusConfig` | started |
| `RestCachePolicy` | started |
| `RestCachePolicyContext` | started |
| `RouterConfig` | started |
| `RouterModuleDeclaration` | started |
| `ServiceWorkerConfig` | started |
| `ServiceWorkerErrorCode` | started |
| `ServiceWorkerMessageEvent` | started |
| `ServiceWorkerMessageTarget` | started |
| `ServiceWorkerRegistrationState` | started |
| `ServiceWorkerRequestOptions` | started |
| `ServiceWorkerService` | started |
| `ServiceWorkerUpdateState` | started |
| `WasmErrorStage` | started |
| `StatePolicyDeclaration` | started |
| `RouteContract` | started |
| `RouteMap` | started |
| `StateService` | started |
| `WorkflowSupervisor` | started |
| `WorkflowSupervisorConfig` | started |
| `WorkflowSupervisorSnapshot` | started |

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
