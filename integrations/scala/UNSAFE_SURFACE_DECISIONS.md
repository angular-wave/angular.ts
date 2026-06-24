# Scala.js Unsafe Surface Decisions

This document records which AngularTS surfaces stay typed by default and which
surfaces must remain explicit unsafe interop until they have stable Scala
facades, examples, and tests.

## Rules

- Default Scala APIs must use `Token[A]`, typed config case classes, typed
  callbacks, facade traits, or typed constructors.
- Raw service names, injection arrays, and `js.Dynamic` values belong under
  `angular.ts.unsafe`.
- A dynamic surface can move into the default API only after it has unit
  coverage and, when it affects browser behavior, an executable example or smoke
  assertion.
- Provider internals are not a Scala authoring surface. Scala modules configure
  AngularTS through `NgModule.config(...)`, typed service facades, or typed
  module declarations.

## Decisions

| Surface | Default Scala API | Unsafe Status | Decision |
| --- | --- | --- | --- |
| Arbitrary third-party services | `Token[A]` with user-owned facade | `UnsafeInterop.token(...)` remains available | Typed tokens are safe; unknown service methods are the caller's facade responsibility. |
| Higher-arity or legacy DI arrays | `inject0` through `inject6` | `UnsafeInterop.inject(...)` remains available | Common app code stays token-backed; unusual factories are explicit unsafe interop. |
| Untyped object literals | Case-class builders | `UnsafeInterop.literal(...)` remains available | Builders are required for framework-owned config; literals are for third-party JS and migration. |
| Provider objects | Hidden from default API | Unsafe only by raw module interop | Provider-era customization is not promoted unless a public config contract exists. |
| Router advanced state declarations | `$state`, `$transitions`, router config, `NgModule.state(...)`, `NgModule.router(...)`, `NgModule.lazyState(...)`, route policies, transition policies, retention policies, and runtime transition hook builders typed | Route-map inference pending | Keep direct provider hooks out of default Scala API; prefer route-tree policy declarations first. |
| Security/policy composition | Generic policy decisions, `$security`, REST cache policy, route policies, config builders, and `NgModule.config(...)` security bridge typed | Unsafe only for custom policy implementations without Scala facades | Policy is framework-level; promote additional policy families one at a time. |
| Realtime transports | `$eventBus`, `$sse`, `$websocket`, `$webTransport`, and `$worker` typed | Unsafe only for native stream/datagram internals not represented by the facade | Promote transport internals only when typed browser abstractions and examples justify them. |
| Service workers | `$serviceWorker`, registration config, message options, and `NgModule.serviceWorker(...)` typed | Unsafe only for service-worker-side protocol implementations | Browser lifecycle state is represented through typed snapshots and callbacks. |
| Persistent stores | `NgModule.store(...)`, `PersistentStoreConfig`, `StorageLike`, and `StorageType` typed | Unsafe only for custom third-party storage objects without a facade | Storage is a module primitive, not a `$storage` injectable. |
| App models and `$sync` targets | `NgModule.model(...)`, `AppModelValue`, lifecycle helpers, restore options, and sync target builders typed | Unsafe only for third-party sync target objects without Scala facades | Shared app state uses app-owned models; DOM scopes remain view-local state. |
| Machines | `$machine`, `MachineConfig`, transition/guard/hook/snapshot builders, `defineMachine(...)`, and `NgModule.machine(...)` typed | Unsafe only for third-party machine-like objects that do not implement the AngularTS machine contract | Machines are a first-class orchestration primitive and should remain typed in Scala. |
| Workflows and supervisors | `$workflow`, command/config/snapshot/state-engine builders, supervisor persistence/recovery, worker protocol facades, and `NgModule.workflow(...)`/`NgModule.workflowSupervisor(...)` typed | Unsafe only for custom worker transports or persistence adapters without Scala facades | Workflow orchestration is promoted as typed default API; worker and persistence internals stay behind explicit contracts. |
| WASM scope ABI | View-scope facades only | Raw ABI interop remains explicit | Scala WASM support follows the shared ABI; app models synchronize through host services or `$sync`. |

## Promotion Checklist

- [ ] Define the Scala facade or config builder in `src/main/scala/angular/ts`.
- [ ] Add token coverage when the surface is injectable.
- [ ] Add unit tests for builder output, token names, and typed callbacks.
- [ ] Add a browser smoke assertion when runtime behavior is involved.
- [ ] Update `SCALA_JS_INTEGRATION_ROADMAP.md` and `README.md`.
