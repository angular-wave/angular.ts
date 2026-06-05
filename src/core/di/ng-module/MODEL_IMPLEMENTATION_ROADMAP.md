# Reactive Model Implementation Roadmap

This roadmap adds `app.model(...)` as the first-party AngularTS primitive for
shared reactive application state.

`app.model(...)` should give users the obvious framework-native answer before
they reach for a small state-store dependency. It creates an injectable
singleton model service backed by an AngularTS scope proxy.

This roadmap depends on the app-owned reactivity refactor in
`src/core/scope/APPCONTEXT_IMPLEMENTATION_ROADMAP.md`. Models must be owned by
`AppContext`, not by `$rootScope`, view scopes, DOM elements, or providers.
Models registered with the root app context are context-wide: every root scope
managed by that `AppContext` can resolve and observe the same model.

## Goal

Add a declarative `NgModule` authoring method for reactive model services.

Target shape:

```ts
app.model("user", {
  name: "John",
  authenticated: false,
});
```

Preferred lazy shape:

```ts
app.model("user", () => ({
  name: "John",
  authenticated: false,
}));
```

Usage:

```ts
interface UserModel {
  name: string;
  authenticated: boolean;
}

class HeaderController {
  static $inject = ["user"];

  constructor(public user: UserModel) {}
}
```

The injected value is the reactive proxy itself.

Documentation should prefer the lazy factory shape. Literal object declaration
may remain available for ergonomics, but the factory form is the recommended
default because model creation belongs to `AppContext`, not module declaration
time.

Ownership:

```text
AppContext
  model:user
  model:cart
  app:main
    $rootScope
      component scope
      directive scope
  app:island:cart
    $rootScope
      component scope
```

Models are app-owned reactive services. They are not children of `$rootScope`,
and they are not duplicated per root scope.
They survive destruction of root contexts while their owning `AppContext`
remains alive.

Ownership rule:

- model data belongs to `AppContext`
- model observations belong to the consuming root/scope
- model scheduling belongs to `AppContext`
- destroying an observer removes its watcher/listener
- destroying an observer does not destroy model data
- destroying a root context removes that root's model observations
- destroying `AppContext` destroys context-wide models

## Non-Goals

- Do not call this `scope`; avoid confusion with `$scope` and scope-tree
  objects.
- Do not introduce a Redux-style store, reducers, actions, or global dispatcher.
- Do not add persistence in the first slice.
- Do not add implicit persistence at all; persistence must be explicit future
  config.
- Do not add provider-facing configuration as the public authoring model.
- Do not make models replace component-local scope state.
- Do not make models replace `$eventBus` for cross-boundary events.
- Do not make models replace `$machine` or `$workflow` for finite-state or
  command orchestration.
- Do not reserve user model keys such as `$reset`, `$meta`, `$name`, or
  `$dispose`.
- Do not put framework metadata, diagnostics, or controls on the proxied user
  object.
- Do not use model factories for DOM listeners, sockets, workers, timers, or
  other long-running side effects.
- Do not add individual model disposal in the base primitive.

## Public Contract

`app.model(name, initial)` creates an injectable singleton service whose value
is an AngularTS scope proxy around a plain object.

Model services are for:

- shared app/domain state
- small state-store needs
- state consumed by multiple controllers, components, directives, services, or
  templates
- reactive object mutation without manual pub/sub

Model services are not for:

- parent/child scope-tree events
- external message boundaries
- durable persistence policy
- finite-state transition logic
- long-running workflow orchestration

Root model boundary:

- start with plain object roots only
- reject primitives and `null`
- reject arrays as root models until a use case proves the ergonomics
- reject class instances as root models until lifecycle/prototype behavior is
  designed
- allow nested arrays, `Map`, `Set`, `Date`, promises, and plain objects only
  according to existing scope proxy behavior

Naming:

- prefer domain nouns such as `user`, `cart`, `session`, or `settings`
- avoid `$` prefixes
- avoid `Provider` suffixes and provider-shaped names
- avoid names that collide with existing services, values, factories, or
  framework-owned injectable tokens

Factory purity:

- factories describe initial model state
- factories should be deterministic where possible
- factories must not attach DOM listeners
- factories must not open sockets, workers, timers, or browser subscriptions
- services, workflows, machines, and policy-backed browser abstractions own
  side effects; models expose reactive state

Collision policy:

- duplicate model registration should error by default
- silent replacement is not allowed
- last-write-wins is not allowed
- intentional override or root-local shadowing is deferred until a real module
  extension use case exists

## Slice 1: Contract Design

Finalize the public API shape before implementation.

Candidate signatures:

```ts
model<T extends object>(name: string, initial: T): this;

model<T extends object>(name: string, factory: () => T): this;
```

Design decisions:

- whether literal object form is accepted or factory-only
- whether factory is injectable
- whether model registration happens during module loading while model creation
  remains lazy until first injection/access
- whether non-plain objects are allowed
- whether arrays are allowed as root models
- how model names interact with existing services, values, and factories
- how model names collide across modules bootstrapped into different roots
- whether a root can intentionally shadow a context-wide model
- whether duplicate model registration can be allowed only when factory/value
  identity is identical
- whether readonly TypeScript inference is preserved or widened
- how model factories declare dependencies
- which dependencies are app-safe for context-wide model factories
- how factory purity is documented and enforced
- how model scheduler ownership is represented in `AppContext`

Acceptance:

- accepted method signatures
- accepted runtime creation timing
- model names are registered during module loading
- model factory execution is lazy
- accepted collision behavior
- accepted root value restrictions
- duplicate model names error by default unless an explicit identical-identity
  exception is accepted
- app context ownership requirement is satisfied
- model scheduler ownership requirement is satisfied
- no user model keys are reserved for framework metadata or controls
- factory purity guidance is documented
- no runtime code changes

Verification:

```bash
rg -n "model\\(" src/core/di/ng-module src/namespace.ts docs/content
```

## Slice 2: Type Surface

Add type-level coverage for `NgModule.model(...)`.

Type goals:

- infer model type from literal object
- infer model type from factory return
- reject primitives
- reject `null`
- reject arrays as root models in the first implementation
- reject class instances as root models in the first implementation if
  structural typing can express the constraint
- preserve chained `NgModule` return type
- allow explicit generic annotation when useful

Candidate tests:

```ts
const app = new NgModule("demo", []);

app.model("user", {
  name: "John",
  authenticated: false,
});

app.model("session", () => ({
  token: undefined as string | undefined,
}));

// @ts-expect-error primitives are not reactive models
app.model("count", 0);
```

Acceptance:

- type tests cover literal and factory forms
- invalid root values fail type checks
- public declarations expose only the intended method and supporting public
  types, if any

Verification:

```bash
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 3: Runtime Registration

Implement `NgModule.model(...)` as module sugar over internal DI.

Implementation options:

- register a factory that asks `AppContext` to create the app-owned reactive
  model
- register a value created from `createScope(initial)` during module
  declaration, only if app context ownership is preserved
- add a small internal helper to normalize literal and factory forms

Decision rule:

- register model names during module loading to catch duplicates early
- execute model factories lazily on first injection/access
- prefer lazy factory creation through `AppContext` so every root managed by
  the same context resolves the same model instance
- create model proxies through the app context model scheduler
- avoid storing a shared proxied literal at module declaration time
- keep provider mechanics internal
- do not create model proxies as `$rootScope` children
- duplicate model names throw during registration or first resolution,
  whichever matches DI timing most safely

Acceptance:

- injecting a model returns a scope proxy
- duplicate names are caught before model factory execution when possible
- model factory runs at most once per `AppContext`
- the model is singleton per root app context
- different root scopes managed by the same `AppContext` share model state
- different `AppContext` instances do not share mutable model state
- model lifetime follows app context lifetime, not consuming scope lifetime
- model lifetime is not tied to root context lifetime
- model scheduling is not tied to a DOM root scheduler
- chained module declarations still work
- name collision behavior matches `value`/`factory` expectations or is
  explicitly documented
- duplicate model names are not silently replaced

Verification:

```bash
npx playwright test src/core/di/ng-module/ng-module.test.ts
npx playwright test src/core/di/injector.test.ts
```

## Slice 3A: Injectable Model Factory Boundary

Design injectable model factories without letting context-wide models depend on
root-scoped services accidentally.

Candidate future shape:

```ts
app.model("session", [
  "$cookie",
  ($cookie) => ({
    token: $cookie.get("token"),
  }),
]);
```

Rules:

- injectable model factories are allowed only after the dependency boundary is
  designed
- injectable model factories still create initial state only
- model factories must not depend on root-scoped services such as `$rootScope`,
  `$rootElement`, compile output, route view state, or DOM lifecycle services
  unless an explicit root-scoped model mode is later designed
- context-wide model factories may depend on context-wide/app-safe services
- invalid root-scoped dependencies should fail early where dependency metadata
  allows it
- factories that need side effects should move those effects into services,
  workflows, machines, or policy-backed browser abstractions

Acceptance:

- app-safe dependency list is documented
- root-scoped dependency rejection behavior is documented
- side-effect guidance is documented
- tests prove `$rootScope`/`$rootElement` cannot silently leak into
  context-wide model factories
- non-injectable factory form remains supported

Verification:

```bash
./node_modules/.bin/tsc --project tsconfig.test.json
npx playwright test src/core/di/ng-module/ng-module.test.ts
```

## Slice 4: Reactivity Behavior

Prove that injected models participate in AngularTS scope reactivity.

Behavior to test:

- assigning model properties triggers watchers when model is observed
- nested object reads are proxied lazily
- array mutations trigger existing array watcher behavior
- deleting properties behaves like other scope proxy mutations
- assigning promises follows existing scope promise-settlement behavior, if
  applicable
- destroying a consuming scope does not destroy the app-level model service
- two sibling roots can observe the same context-wide model
- destroying one root removes only that root's observations
- mutating the model after one root is destroyed updates the remaining root
- mutating the model after all roots are destroyed is still valid while
  `AppContext` remains alive

Acceptance:

- model proxy behavior matches `createScope(...)`
- model service remains alive for the injector lifetime
- consuming scopes can watch model properties without manual synchronization
- destroying a consuming scope does not destroy or detach the model
- destroying a consuming scope removes its model watchers/listeners
- destroying one root scope does not destroy a context-wide model that sibling
  root scopes still use
- destroying one root scope removes only that root's model observations
- destroying all root contexts does not destroy context-wide models while
  `AppContext` remains alive
- cross-root observation behavior is covered by tests
- model updates use the app context model scheduler, not a DOM scheduler
- model mutations do not require `$eventBus`

Verification:

```bash
npx playwright test src/core/scope/scope.test.ts
npx playwright test src/core/di/ng-module/ng-module.test.ts
```

## Slice 5: Template And Component Usage

Add an executable sample that demonstrates the intended user path.

Sample requirements:

- declare a model through `app.model("user", ...)`
- inject it into a controller or component
- mutate it from one place
- render the change from another place
- avoid provider objects
- avoid `$eventBus` for local reactive state

Candidate docs sample:

```text
docs/static/examples/model/user-model.ts
docs/static/examples/model/user-model.html
```

Acceptance:

- docs sample is testable or covered by docs example checks
- sample demonstrates shared reactive model state
- sample does not teach manual synchronization

Verification:

```bash
make docs-examples-check
```

## Slice 6: Documentation

Document `app.model(...)` as a first-class authoring primitive.

Docs to add or update:

- `docs/content/docs/concepts/modules.md`
- `docs/content/docs/services/models.md`
- `docs/content/docs/get-started` page that needs shared state, if present
- TypeDoc comments on `NgModule.model(...)`

Rules:

- explain that models are injectable reactive services
- explain that model data belongs to `AppContext`
- explain that model scheduling belongs to `AppContext`
- explain that observations belong to consuming scopes/roots
- distinguish models from `$scope`
- distinguish models from `$eventBus`
- distinguish models from `$machine` and `$workflow`
- show literal and factory forms only if both are accepted
- recommend factory form as the default
- explain root model restrictions and duplicate-name errors
- explain that root destruction removes observations but not model data
- explain that model objects do not reserve `$reset`, `$meta`, `$name`,
  `$dispose`, or any other framework control keys
- explain that model factories should initialize state and leave side effects
  to services/workflows/machines/browser abstractions
- explain naming guidance

Acceptance:

- users can find the primitive from module docs
- docs state when to use a model
- docs state when not to use a model
- docs include one executable or testable sample
- `src/DOCUMENTATION_REQUIREMENT.md` is satisfied

Verification:

```bash
make docs-examples-check
make doc
```

## Slice 7: Public Surface And Generated Outputs

Update generated public artifacts if the method changes exposed types.

Rules:

- `NgModule.model(...)` is public authoring API
- avoid adding a public provider type
- expose a public `ModelFactory<T>` type only if it improves docs or type
  readability
- do not expose implementation-only proxy helper types
- do not expose model metadata on the user model object
- do not reserve user object keys for framework metadata or lifecycle controls
- generated integrations should track the curated public `NgModule` method only
  if they expose module authoring APIs

Acceptance:

- declaration files include `NgModule.model(...)`
- TypeDoc includes `NgModule.model(...)`
- public inventory classifies it as authoring API
- internal diagnostics can identify model name, owner AppContext id, source
  module, and creation state without polluting the model shape
- internal metadata uses side tables or equivalent hidden storage
- generated output changes are intentional

Verification:

```bash
make generated-check
make docs-examples-check
make doc
```

## Slice 8: Future Extensions

Defer these until the base model primitive is proven:

- persisted models
- reset policies
- model snapshots
- model hydration from server data
- model schema validation
- readonly/computed model views
- model dev diagnostics
- model lifecycle hooks
- individual model disposal

Reset design note:

- do not add `$reset` directly onto the proxied user object in the base
  primitive
- reset must not pollute or reserve user model shape
- future reset should likely live on an app/model service, helper API, or
  explicit config-backed control surface

Disposal design note:

- do not add `$dispose` directly onto the proxied user object in the base
  primitive
- individual model disposal is deferred until ownership and observation rules
  are proven
- future disposal must be explicit
- future disposal must fail, detach safely, or require an explicit force option
  when any root still observes the model
- app context teardown remains the only base model destruction path

Future extensions must use explicit config and satisfy
`src/DOCUMENTATION_REQUIREMENT.md`.

## Final Readiness Gate

`app.model(...)` is ready when:

- users can declare a shared reactive model without providers
- injected value is the proxied model object
- type inference works for literal and accepted factory forms
- model instances are shared across all root scopes managed by one `AppContext`
- model instances are isolated between different `AppContext` instances
- model instances survive root context destruction while their `AppContext`
  remains alive
- model mutations participate in scope reactivity
- model mutations use the app context model scheduler
- no public framework metadata or lifecycle keys are added to model objects
- cross-root observation and root destruction behavior is tested
- docs clearly distinguish models from `$scope`, `$eventBus`, `$machine`, and
  `$workflow`
- docs include executable or testable samples
- generated declarations and TypeDoc are current
- public inventory classifies the method as authoring API
