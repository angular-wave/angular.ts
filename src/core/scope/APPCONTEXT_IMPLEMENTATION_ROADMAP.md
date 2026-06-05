# App Context Implementation Roadmap

This is the first and primary refactor for the level-9 AngularTS roadmap.

AngularTS reactivity must be detached from DOM, elements, and the view scope
tree. `$rootScope` should remain the root of UI scopes, but it should not be
the owner of the entire reactive world.

The new internal primitive is `AppContext`.

## Goal

Introduce an app-owned runtime context above every `$rootScope`.

Conceptual ownership:

```text
AppContext
  reactive graph
  injector lifetime
  app-level cleanup hooks
  app records
    app:main
      injector
      root element
      $rootScope
        route scope
        component scope
        directive scope
    app:island:cart
      injector
      root element
      $rootScope
        component scope
        directive scope
  app-owned reactive models
  app-owned machines/workflows
  app-owned browser service state
```

Each `$rootScope` remains the root of one bootstrapped UI scope tree.
`AppContext` remains a singleton runtime owner that can manage multiple root
scopes on the same page.

## Non-Goals

- Do not expose `AppContext` as a normal user-facing service in the first
  refactor.
- Do not make app models children of `$rootScope`.
- Do not change scope event propagation to include app-owned models or services.
- Do not collapse multiple `ng-app` roots into one `$rootScope`.
- Do not rewrite all services in one pass.
- Do not remove `$rootScope`.
- Do not make the DOM or a bootstrap element required for reactive services.
- Do not merge app lifecycle and UI scope lifecycle.

## Core Contract

`AppContext` owns:

- creation and registry of root scopes
- root elements and injectors for bootstrapped app records
- context-wide model registry shared by all root scopes
- app/injector lifetime cleanup
- app-owned reactive model proxies
- detached reactive proxies that are not view scopes
- lifecycle hooks for app-level services
- future app-level diagnostics for reactive primitives

`$rootScope` owns:

- UI scope tree
- `$emit` / `$broadcast` scope event propagation
- directive/component/controller scope lifecycle
- view teardown

There is one singleton `AppContext` per AngularTS runtime. It may own multiple
root scopes. A root scope is per bootstrapped app/root element.

## Submodule And Multi-Root Contract

The existing sub-application abstraction exists so multiple `ng-app` roots can
coexist on one page. Today this is represented by sub-application runtime
instances. The target model should keep the user-facing behavior while moving
ownership into `AppContext`.

Current behavior to preserve:

- `angular.init(document)` can bootstrap multiple `ng-app` roots.
- the first root uses the main runtime instance.
- additional roots are represented as sub-applications.
- each root has its own injector and `$rootScope`.
- bootstrapping the same element twice is rejected.

Target ownership:

```text
window.angular
  AppContext singleton
    app records by root element/app id
      injector
      $rootScope
      cleanup hooks
```

Rules:

- `AppContext` remains singleton.
- `AppContext` can create and track multiple root scopes.
- `$rootScope` injection remains app-record scoped, not global across all roots.
- scope events remain inside one root scope tree.
- app-owned models registered with the root app context are context-wide and
  visible to all root scopes managed by that context.
- app-owned services can be context-wide or app-record scoped, but the choice
  must be explicit per service.
- root cleanup removes only that app record unless full app context teardown is
  requested.
- destroying root contexts does not destroy context-wide models.
- if all root contexts are destroyed and a new root is later attached, that
  root can resolve the existing context-wide models.
- full app context teardown destroys all root scopes and app-owned resources.

## Ownership Registry

`AppContext` should make ownership explicit instead of relying on sub-app
runtime side effects.

Context-wide by default:

- `app.model(...)` models
- app-level machines and workflows, when declared outside a view scope
- app-level realtime connection state, when promoted to reactive service state
- workflow supervisor state and snapshots
- app-level storage/hydration policy

Root-record scoped by default:

- `$rootScope`
- root element
- injector for one bootstrapped root
- `$rootElement`
- DOM-related schedulers and view flush coordination
- `$compile` output and compiled view tree ownership
- route/view state unless explicitly promoted to app-owned state
- DOM lifecycle and DOM event cleanup
- compile lifecycle for one root tree
- route/component/directive/view teardown

Service-specific:

- browser services that can be either app-owned or root-owned must document the
  choice in their service contract before becoming reactive.

Resolution boundary:

- context-wide models are shared across root records
- root-scoped services must not accidentally resolve across sibling roots
- root-scoped services must not act on another root record's DOM
- root-scoped services resolve against an explicit root ownership token, not an
  ambient global root
- DOM-related schedulers belong to the owning root record
- model schedulers belong to `AppContext`
- app-owned services that need root integration must use explicit root attach
  and root destroy hooks

## Slice 1: Current Reactivity Ownership Inventory

Document where reactivity and root scope ownership currently live.

Scope:

- `src/core/scope/scope.ts`
- `src/core/di/injector.ts`
- `src/ng.ts`
- `src/core/compile/compile.ts`
- services that inject `$rootScope`

Inventory questions:

- where is `createScope()` called?
- which calls create UI scopes?
- which calls create detached/service-owned proxies?
- which services inject `$rootScope` for lifecycle?
- which services inject `$rootScope` only to broadcast UI events?
- which tests assume `$rootScope` is the top-level reactive owner?

Candidate inventory:

```text
src/core/scope/APPCONTEXT_REACTIVITY_INVENTORY.md
```

Acceptance:

- every non-test `createScope()` call is classified as app-owned, view-owned,
  binding-owned, or test-only
- every service `$rootScope` dependency is classified as UI event, lifecycle,
  reactive state, or test setup
- no runtime code changes

Verification:

```bash
rg -n "createScope\\(|\\$rootScope|_rootScope|new Scope" src
```

## Slice 2: Internal AppContext Contract

Define the internal contract before moving ownership.

Candidate shape:

```ts
interface AppContext {
  roots: readonly AppRootRecord[];
  models: ReadonlyMap<string, object>;
  generation: number;
  modelScheduler: AppModelScheduler;
  runWithRoot<T>(root: AppRootRecord, operation: () => T): T;
  getCurrentRoot(): AppRootRecord | undefined;
  createRoot(options: AppRootOptions): AppRootRecord;
  getRootByElement(element: Element | Document): AppRootRecord | undefined;
  destroyRoot(root: AppRootRecord | Element | Document): void;
  registerModel<T extends object>(name: string, factory: () => T): T & ng.Scope;
  getModel<T extends object>(name: string): (T & ng.Scope) | undefined;
  createReactive<T extends object>(target: T): T & ng.Scope;
  onRootAttach(cleanup: (root: AppRootRecord) => void): () => void;
  onRootDestroy(cleanup: (root: AppRootRecord) => void): () => void;
  onDestroy(cleanup: () => void): () => void;
  destroy(): void;
  isDestroyed(): boolean;
}

interface AppRootRecord {
  id: string;
  rootElement: Element | Document;
  injector: ng.InjectorService;
  rootScope: ng.RootScopeService;
  generation: number;
  scheduler: RootDomScheduler;
  destroy(): void;
}

interface AppModelScheduler {
  schedule(operation: () => void): void;
  flush(): void;
  destroy(): void;
}

interface RootDomScheduler {
  schedule(operation: () => void): void;
  flush(): void;
  destroy(): void;
}
```

Design decisions:

- whether `AppContext` is created before or during injector creation
- whether it is injectable internally through a private token
- whether it owns `$rootScopeProvider` or is owned by it during migration
- how a bootstrap operation selects or creates the current app root record
- how root injectors resolve context-wide models
- how model name collisions are handled across modules and roots
- how app destroy is triggered
- how one root is destroyed without destroying sibling roots
- how cleanup ordering works between app services and `$rootScope`
- which non-model resources are context-wide and which resources are
  root-record scoped
- how the private root ownership token is represented in DI
- how root-owned work records preserve their owning root for scheduling,
  cleanup, and exception routing
- whether app-owned proxies need a different marker than scope proxies
- whether model registration errors on duplicate names by default
- whether generation increments on root attach, root destroy, or both
- which services may subscribe to root attach/destroy hooks

Acceptance:

- internal interface is documented
- multiple root records are represented
- root-local service resolution boundary is documented
- context-wide model registry is represented
- context generation/version is represented
- app model scheduler is represented
- root attach and root destroy hooks are represented
- current-root execution boundary is represented
- private root ownership token is documented as internal-only
- scheduler ownership is split between app-owned model scheduling and
  root-owned DOM scheduling
- lifecycle order is documented
- no public API is added
- `$rootScope` event semantics remain unchanged

Verification:

```bash
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 2A: Root Record Identity

Define stable root record identity before changing bootstrap internals.

Each root record must have:

- stable `id`
- `rootElement`
- `injector`
- `rootScope`
- DOM scheduler
- private ownership token
- `destroy()` handle
- destroyed state

Rules:

- root record identity does not change while the root is alive
- root records are discoverable by root element
- destroying a root removes the root record from the active registry
- destroying a root does not remove context-wide models
- root-scoped services receive the owning root through an internal token
- current-root tracking is scoped to synchronous bootstrap/injection work and
  must not leak across unrelated async work

Acceptance:

- app context can list active root records
- app context can resolve a root record by element
- duplicate bootstrap detection still works
- destroyed root records cannot receive new view scopes
- root-scoped services can prove their owning root record
- sibling roots cannot accidentally share root-local service state

Verification:

```bash
npx playwright test src/angular.spec.ts
npx playwright test src/core/scope/scope.test.ts
```

## Slice 3: Create Root Scopes Through AppContext

Move root scope ownership into `AppContext` while preserving public behavior.

Current shape:

```ts
export class RootScopeProvider {
  constructor() {
    this._rootScope = createScope();
  }
}
```

Target ownership:

```text
AppContext creates AppRootRecord
AppRootRecord owns $rootScope
RootScopeProvider exposes the current AppRootRecord.rootScope
```

Rules:

- `$rootScope` remains injectable under the same token
- each bootstrapped root gets its own `$rootScope`
- existing scope APIs remain compatible
- scope event propagation remains rooted at that app record's `$rootScope`
- view scopes still derive from `$rootScope`
- app-owned reactive proxies are not children of `$rootScope`
- multiple roots are tracked by the singleton `AppContext`
- context-wide models are visible to all root scopes managed by the singleton
  `AppContext`
- current sub-application behavior remains compatible
- root-scoped injections run inside the correct current-root boundary

Acceptance:

- `$rootScope` identity remains stable within one root/injector
- sibling bootstrapped roots have different `$rootScope` instances
- sibling bootstrapped roots can resolve and observe the same context-wide
  model
- `$rootScope.$new()` behavior is unchanged
- `$rootScope.$destroy()` behavior is unchanged unless an explicit app destroy
  decision is made
- `angular.init(document)` still supports multiple `ng-app` roots
- bootstrapping one root and destroying it does not destroy sibling roots
- root-local service resolution is deterministic during bootstrap and later
  injection
- existing scope and compile tests pass

Verification:

```bash
npx playwright test src/core/scope/scope.test.ts
npx playwright test src/angular.spec.ts
npx playwright test src/core/compile/compile.test.ts
npx playwright test src/core/di/injector.test.ts
```

## Slice 4: App-Owned Reactive Proxy Creation

Add an internal way to create reactive proxies that are owned by the app, not
by the view tree.

Rules:

- app-owned proxies use the same reactivity engine as scopes
- app-owned proxies do not inherit from `$rootScope`
- app-owned proxies do not participate in `$emit` / `$broadcast`
- app-owned proxies are destroyed only by app context teardown
- consuming UI scopes can watch/read app-owned proxies
- context-wide app models can be watched/read from any root scope managed by
  the same `AppContext`
- model mutations are scheduled through the app context model scheduler
- observations belong to the consuming root/scope, not to the model
- destroying a root context must remove watchers/listeners that root registered
  against context-wide models

Acceptance:

- app-owned proxy mutations schedule watchers like normal scope proxies
- app-owned proxies can be injected into services without DOM
- app-owned proxies survive consuming scope destruction
- destroyed root contexts leave no orphan watchers on context-wide models
- context-wide models survive individual root destruction while other roots are
  still alive
- context-wide models survive destruction of all root contexts while
  `AppContext` remains alive
- app destroy releases app-owned watchers/listeners
- model scheduling works when no root records exist

Verification:

```bash
npx playwright test src/core/scope/scope.test.ts
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 5: Scheduler And Failure Isolation

Separate app-owned model scheduling from root-owned DOM scheduling.

Rules:

- DOM-related schedulers belong to root records
- view flushes, DOM listener cleanup, compile flushes, and route/view work use
  the owning root's scheduler
- model schedulers belong to `AppContext`
- context-wide model updates can be scheduled when zero roots are attached
- a model observation records the consuming root/scope that owns the reaction
- failures in root-owned reactions route to that root's `$exceptionHandler`
- failures in one root-owned reaction must not prevent sibling roots from
  processing their own queued work
- app-owned model scheduler failures route through the app-level exception
  boundary until a dedicated diagnostics service exists

Acceptance:

- root-owned DOM work is not queued on the app model scheduler
- app-owned model work is not tied to a DOM root scheduler
- destroying a root cancels or drains only that root's DOM scheduler work
- destroying a root removes its model observations from the app model
  scheduler
- a thrown watcher/listener in one root does not block sibling root work
- model updates are observable before any root exists and after all roots are
  destroyed while `AppContext` remains alive

Verification:

```bash
npx playwright test src/core/scope/scope.test.ts
npx playwright test src/angular.spec.ts
```

## Slice 6: App Destroy Lifecycle

Define app-level teardown separately from `$rootScope.$destroy()`.

Lifecycle operations:

- destroy one root context
- destroy all root contexts
- destroy the `AppContext` itself

Design decisions:

- public app destroy API now or internal-only first
- cleanup order for one root: root-scoped services, view scopes, root scope,
  root record
- cleanup order for full context: app-owned services, models, realtime
  connections, workers, all root records
- whether `$rootScope.$destroy()` triggers app destroy
- whether app destroy triggers `$rootScope.$destroy()`
- whether root destroy triggers only that root record cleanup
- how context-wide models behave when all root contexts are destroyed but
  `AppContext` remains alive
- how a new root reattaches to surviving context-wide models
- how root-owned observations against context-wide models are tracked and
  removed
- behavior after destroy when services publish events or mutate models
- behavior for pending model scheduler work during full app context teardown
- behavior for pending DOM scheduler work during single-root teardown

Acceptance:

- app-level cleanup hooks are idempotent
- root-level cleanup hooks are idempotent
- destroying one root preserves sibling roots
- destroying one or all root contexts preserves context-wide models while
  `AppContext` remains alive
- destroying a root removes that root's model watchers/listeners
- full context teardown destroys every root
- attaching a new root after all previous roots were destroyed can observe
  existing context-wide models
- pending DOM scheduler work is root-local during root teardown
- pending app model scheduler work follows app context teardown
- cleanup order is documented
- tests prove cleanup hooks run once
- `$rootScope` compatibility is preserved or migration notes exist

Verification:

```bash
npx playwright test src/core/di/injector.test.ts
npx playwright test src/core/scope/scope.test.ts
```

## Slice 7: Testing Without DOM

Prove reactivity can be tested without DOM or compiled elements.

Acceptance:

- app context can be created with zero root records
- app context can create reactive proxies without bootstrap element
- app context can schedule model updates without DOM
- `app.model(...)` tests can run without DOM fixtures where possible
- service-owned reactive state can be tested through app context
- DOM compile tests remain UI-specific

Verification:

```bash
npx playwright test src/core/scope/scope.test.ts
npx playwright test src/core/di/ng-module/ng-module.test.ts
```

## Slice 8: Documentation And Internal Guidance

Document the ownership split.

Docs to update:

- `src/core/scope/README.md`
- `src/core/di/ng-module/MODEL_IMPLEMENTATION_ROADMAP.md`
- `src/GLOBAL_LEVEL_9_ROADMAP.md`
- public docs only after a public user-facing primitive depends on the split

Rules:

- public docs should still teach `$rootScope` as the root of UI scopes
- internal docs should teach `AppContext` as runtime/reactivity owner
- `app.model(...)` docs should say models are app-owned reactive services, not
  `$rootScope` children
- internal docs should teach that DOM schedulers are root-owned and model
  schedulers are app-owned
- internal docs should explain the private root ownership token and current-root
  execution boundary

Acceptance:

- ownership diagram exists
- downstream dependency map is current
- model roadmap is blocked on app context readiness
- scheduler ownership split is documented

Verification:

```bash
rg -n "AppContext|app-owned|root of UI scopes|app.model" src docs/content
```

## Wasm Ownership Contract

App context does not move every Wasm bridge out of the root scope tree.
AngularTS needs two Wasm ownership modes.

View-owned Wasm:

- `ng-wasm` is a directive and remains view/root-owned.
- `ng-wasm` writes exports onto the linked scope for template use.
- `ng-wasm` participates in the owning root's DOM scheduler, compile lifecycle,
  and view teardown.
- `$wasm.scope(scope)` remains a bridge over an explicit `ng.Scope`.
- Wasm scopes created from `$rootScope`, child scopes, directive scopes, or
  component scopes remain owned by that root record.
- destroying the owning root must unbind Wasm scope handles and remove watches.

App-owned Wasm:

- non-DOM Wasm modules may be loaded as app-owned runtime services.
- compute modules, game simulation modules, codecs, validators, and parsers
  should not require `$rootScope`.
- app-owned Wasm modules publish state through `app.model(...)`, `$machine`,
  `$workflow`, or another app-owned reactive primitive.
- model data written by app-owned Wasm belongs to `AppContext`.
- root scopes may observe that model data, but those observations remain
  root-owned and are removed on root destruction.
- app-owned Wasm scheduling uses the app context model/runtime scheduler, not a
  root DOM scheduler.

Decision rules:

- if Wasm exists because a template declared it, it is view-owned.
- if Wasm mutates a concrete scope through `$wasm.scope(scope)`, it is owned by
  that scope's root record.
- if Wasm exists as application compute or domain runtime, it is app-owned.
- a Wasm module may expose both modes, but each binding must declare its
  ownership and cleanup boundary.

Acceptance:

- `ng-wasm` remains compatible with template scope usage.
- `$wasm.scope(scope)` keeps explicit scope ownership.
- app-owned Wasm can run with zero root records.
- app-owned Wasm can update context-wide models that later roots observe.
- destroying one root tears down only that root's Wasm scope bridges.
- destroying one root does not destroy app-owned Wasm modules or context-wide
  model data.
- full app context teardown destroys app-owned Wasm modules and all remaining
  Wasm bridges.

Verification:

```bash
npx playwright test src/directive/wasm/wasm.test.ts
npx playwright test src/services/wasm/wasm.test.ts
npx playwright test src/core/scope/scope.test.ts
```

## Downstream Dependencies

These downstream services and roadmaps depend on the app context ownership
split.

### Direct Dependencies

`app.model(...)`
: Must be context-wide app-owned reactive services visible to all root scopes
managed by the root app context, not `$rootScope` children. See
`src/core/di/ng-module/MODEL_IMPLEMENTATION_ROADMAP.md`.

`$rootScope`
: Must become UI scope root exposed by app context, not the whole reactive
runtime owner.

Scope proxy creation
: Needs a distinction between view-owned proxies and app-owned detached
reactive proxies.

Scheduling
: DOM-related schedulers are root-record scoped. Model schedulers are
app-context scoped.

### Service Dependencies

`$eventBus`
: Scope context cleanup can remain scope-owned, but app-level event bus
shutdown and diagnostics should use app context once teardown exists.

`$machine`
: Machines bound into scopes should keep scoped proxy behavior, while
app-owned machines can live outside DOM and UI scopes.

`$workflow`
: Workflows should run as app-owned reactive primitives when not tied to a
view scope; supervisor persistence/recovery depends on app lifetime.

Workflow supervisor
: Needs app lifetime ownership for recovery policy, snapshots, and restart
coordination.

`$websocket`, `$sse`, `$webTransport`
: Connection state and cleanup should be app-owned when declared as app
services, not tied to `$rootScope` or view teardown.

Connection manager
: Should eventually be owned by app context for deterministic app-level
shutdown and diagnostics.

`$worker`
: Page-created worker lifecycle should be app-owned unless explicitly scoped by
a component/directive.

Future `$serviceWorker`
: Registration/controller/update state is browser/app-owned, not view-owned.

`$rest`
: Cache state, stale metadata, invalidation, and custom backend lifecycle may
be app-owned reactive state once policy backfill reaches REST.

`$http`
: Pending request diagnostics and cancellation policy can be app-owned if
promoted to reactive service state.

Storage and future persisted models
: Persistence/hydration should attach to app-owned models, not `$rootScope`.

`$location`
: Browser listener cleanup may be app-owned, while route/location change events
can still broadcast through `$rootScope` for UI compatibility.

`$wasm`
: Template-declared Wasm and `$wasm.scope(scope)` bridges remain root-owned.
Non-DOM Wasm modules can become app-owned runtime services that write to
app-owned models or other app-owned reactive primitives.

Web component services
: Component-local scopes remain view-owned; shared reactive inputs/models
should use app-owned primitives.

`$templateRequest` / `$templateCache`
: Cache and pending request state can be app-owned if made reactive.

`$exceptionHandler` and `$log`
: Do not require reactive ownership, but app context can eventually provide
app-level lifecycle and diagnostics boundaries.

## Final Readiness Gate

The app context refactor is ready when:

- `$rootScope` is the root of UI scopes, not the root of all reactivity
- app-owned reactive proxies can exist without DOM or elements
- `app.model(...)` can create injector-owned reactive services
- context-wide models survive root context destruction while `AppContext`
  remains alive
- DOM scheduler ownership is root-local
- model scheduler ownership is app-context-wide
- root-owned failures do not block sibling roots
- Wasm ownership is split between view-owned scope bridges and app-owned
  non-DOM runtime modules
- app-level cleanup is separate from view scope teardown
- scope event propagation remains compatible
- downstream service roadmaps know whether their reactive state is app-owned,
  view-owned, or not applicable
- tests prove root scope compatibility and detached reactivity
