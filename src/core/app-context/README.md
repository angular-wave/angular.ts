# AppContext Internals

`AppContext` is the internal app-owner for app-wide reactive state and root
coordination. The implementation in `app-context.ts` keeps `$rootScope` as the
UI scope root while moving shared runtime services and shared models above view
scope ownership.

## Responsibilities

- Own app runtime roots created by bootstrap and keep element/injector metadata for
  each root.
- Own app-level reactive models independent of any one view scope.
- Own the model scheduler and isolated root-owned DOM schedulers.
- Register and fire attach/destroy hooks for root lifecycle and app teardown.
- Preserve app-owned models across root destruction and recover them for later root
  attachments.

## Public Surface

- `AppContext`: runtime singleton owned by the injector and shared by the runtime.
- `AppRootRecord`: record for one bootstrapped root tree.
- `RootDomScheduler`: scheduler reserved for DOM/root work.
- `AppModelScheduler`: scheduler reserved for app-owned reactive model work.
- `createReactive(target)`: create an app-owned proxy for a plain object model.
- `registerModel(name, factory)`: register app-owned model factories and return a
  shared model instance.
- `runWithRoot(root, operation)`: run a callback while binding it to a root.
- `destroyRoot(rootOrScope)`, `destroy()`, and destroy hooks for lifecycle cleanup.

## Core Model

`AppContext` maintains registries for:

- root records (`_roots` / `_rootsByElement` / `_rootsByScope`)
- model factories (`_modelFactories`)
- live model instances (`_models`)
- app-owned reactive instances (`_reactiveModels`)
- root attach and destroy hook lists

The lifecycle flow is:

1. Bootstrap creates a `rootScope` and `AppContext.createRoot(...)`.
2. The root receives a generated id, scheduler, injector, and optional root
   element.
3. `app.model(...)` routes through a provider factory that calls
   `appContext.registerModel(...)`.
4. `registerModel(...)` creates the model once and proxies it through
   `createReactive(...)`.
5. Services or runtime modules that need root context use
   `runWithRoot(...)` and root hooks, not ambient shared state.
6. Root and app teardown trigger hook dispatch and scheduler/model cleanup.

## Lifecycle

`AppContext` is created once by `RuntimeComposition` and passed directly to
root and module composition. Root records are created through `createRoot(...)`
and attached by `attachRoot(...)` when metadata arrives later.

- `createRoot(...)`: creates and tracks a new root record and notifies attach
  hooks.
- `destroyRoot(...)`: disposes one root and triggers destroy hooks for that root.
- `destroy()`: disposes all roots, app-owned reactive models, and app-level
  cleanup hooks.

`AppContext` tracks `generation` to provide change visibility after root and app
teardown events.

## Lifecycle Contract

- AppContext creation and model registration fail on a destroyed context.
- Creating or attaching root metadata to a destroyed root throws.
- Root duplicate registration updates metadata and increments generation.
- A destroyed root does not block app-level model continuity.
- App teardown clears the model scheduler queue, model registries, and hook queues.

## Reactivity Contract

- App-owned models are plain-object roots and are proxied through scope listener
  scheduling.
- Model updates are scheduled via `modelScheduler` and flushed through the model
  owner.
- App models are shared across all roots managed by the same `AppContext`.
- Reactive models remain valid after any observing root/scope is destroyed.

## Policy Contract

The current app policy is explicit and conservative:

- Models must be plain object roots to avoid unsafe proxying of arrays and
  primitives.
- `$rootScope` is preserved for UI scope ownership and event propagation.
- DOM work that depends on a bootstrap root is root-owned, not app-owned.
- App-owned scheduler errors route to the context exception handler.

## Dependency Replacement Contract

- Replaces custom ad-hoc app-level model registries used across modules.
- Replaces implicit global-state assumptions for multiple bootstrap roots.
- Replaces coupling from module-level declarations directly to root-specific
  state.

This contract does not replace browser-native state management; it replaces
boilerplate around where to attach and dispose app runtime state.

## Scheduling And Ordering

- `RootDomScheduler`: queue operations for one root and throw when destroyed.
- `AppModelScheduler`: own app-wide model operations and flush through the
  listener scheduler.
- Root teardown destroys root scheduler first so queued DOM work cannot run after
  root disposal.
- App teardown destroys all model work and flush state deterministically.

## Retained Route Scheduling

Retained route pause/resume is a DOM-scope lifecycle concern, not an app-context
model lifecycle concern.

- Retained route views broadcast `$viewRetentionPause` and
  `$viewRetentionResume` to their retained scope subtree.
- Scope-owned DOM adapters decide whether to defer work for the
  `policy.retention.pause` mode.
- App-owned model scheduling ignores retained-view pause/resume events and keeps
  running until the `AppContext` itself is destroyed.
- Root DOM schedulers are not globally paused; retained routes pause only the
  adapters owned by the inactive retained scope subtree.

## Composition Contract

- Lower level: scope proxy and listener scheduler machinery.
- Upstream: `NgModule`, model consumers, and compile/runtime bootstrap.
- Root-scoped services remain constrained to their associated root records.
- App-owned services should depend on AppContext-owned models and model lifecycle
  where appropriate.

## Failure Contract

- Illegal operations on destroyed context/models/roots throw synchronously.
- Scheduling on destroyed scheduler throws with a specific action-focused message.
- Model factory or proxy creation for non-plain roots throws immediately.
- Root creation failures are surfaced at module/bootstrap time through injector
  initialization.

## Recovery Contract

- Root destruction does not remove app model data or factories.
- Destroyed roots can be replaced by new roots while models remain available.
- AppContext destruction acts as the hard recovery boundary for all root-bound and
  model-bound resources.

## Native Interop

- No direct wrapper for persistent browser APIs.
- Uses native `structuredClone` boundaries indirectly through the scope proxy
  callers and model initialization flow.
- Uses native `WeakMap` for root bookkeeping by scope and root element.

## Data Structures

- `AppRootRecord`: root scope, scheduler, injector, element, generation, destroy state.
- `Model<T>`: app-owned model with reactive scope behavior and lifecycle methods.
- `ModelStateFactory`: module-level factory used by `app.model(...)` registration.
- `_rootsByElement` and `_rootsByScope`: fast lookup maps used during bootstrap and
  teardown.

## Integration Points

- `src/core/di/ng-module/ng-module.ts` (`model`) captures the owning runtime's
  `AppContext` and delegates registrations directly.
- `src/core/scope/scope.ts` root creation flows through `AppContext` root APIs.
- `src/angular-runtime.ts`, `src/ng.ts`, and custom runtimes attach bootstrap
  metadata into root records.

## Edge Cases

- Re-registering the same model name with the same factory returns the existing
  model.
- Re-registering with a different factory throws.
- Root attach with unknown root throws.
- App models are not root-scoped and do not participate in `$rootScope` event
  propagation.

## Destruction And Cleanup

- Root destroy:
  - notifies destroy hooks
  - removes root from maps
  - destroys root scheduler
- App destroy:
  - destroys all roots
  - destroys all app-owned reactive models
  - destroys model scheduler and clears registries
  - runs app-level destroy callbacks

## Types And Interfaces

`AppContext`
: App-wide owner for models, roots, and lifecycle hooks.

`AppRootRecord`
: One bootstrap root with `rootScope`, scheduler, generation, and teardown state.

`RootDomScheduler`
: Root-bound scheduler for DOM/view-root work.

`AppModelScheduler`
: App-wide scheduler for app-owned reactive models.

`AppRootAttachOptions`
: Optional injector/element metadata used during attach/re-attach.

`AppRootCreateOptions`
: Input contract for creating a root record.

`ModelStateFactory`
: Factory contract for `app.model` registration.

## Testing Notes

- `src/core/app-context/app-context.spec.ts`
- `src/core/app-context/app-context-service-reactivity.spec.ts`
- `src/core/di/ng-module/ng-module.spec.ts` (`app.model` bootstrapping and cross-root
  behavior)
- `src/angular.spec.ts` multi-root/bootstrap integration behavior
