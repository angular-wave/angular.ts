# AngularTS Design Philosophy

AngularTS exists to make the Web Platform declarative, reactive, and
operationally safe.

The goal is not AngularJS compatibility for its own sake, and it is not API
expansion for its own sake. The goal is a single framework primitive that lets
users declare app structure, state, config, and policy while AngularTS owns the
browser mechanics that otherwise become repeated application code.

## Core Thesis

AngularTS should replace common dependency stacks and boilerplate with
native-aligned framework primitives.

Users should not have to assemble a separate library for every ordinary
browser concern:

- reactive state
- event coordination
- realtime connection lifecycle
- retries and reconnection
- workers and Wasm module lifecycle
- storage and cache policy
- REST backends
- finite-state flow
- workflow orchestration
- service worker registration and update state
- app-level cleanup and diagnostics

The framework earns broad API surface only when that API removes a common
dependency, hides repetitive browser mechanics, or makes app behavior more
declarative and safer.

## Declarative First

AngularTS APIs should make the user's intent obvious.

Preferred user paths:

- declare app structure through `NgModule`
- declare shared reactive state through `app.model(...)`
- declare service config through service-owned config
- declare third-party modules through `app.use(plugin, config)`
- declare operational behavior through policies
- consume runtime services through injection

Avoid teaching users to solve normal app problems through:

- provider mutation
- manual lifecycle wiring
- manual reconnect loops
- manual cross-scope synchronization
- manual DOM scheduling
- ad hoc global singletons

Providers remain valid injector machinery. They should not be the primary
authoring model for normal application code.

## Reactivity Is The Baseline

Reactivity is not an integration detail. It is the baseline AngularTS
contract.

Services and primitives that own useful runtime state should keep that state in
sync with scopes, models, or app-owned reactive objects so application code can
remain declarative.

Examples:

- a websocket exposes connection state and retry metadata
- a service worker service exposes registration, controller, and update state
- a REST abstraction exposes cache and stale metadata
- a workflow exposes running, failed, cancelled, or completed state
- an app-owned model updates every observing root without manual pub/sub

Reactive state should remain bounded and useful. Large streams, raw browser
events, and implementation internals should stay callback-only or native-only
unless rendering or app branching requires them.

## App Ownership And View Ownership

AngularTS has two ownership layers.

`AppContext` owns app/runtime state:

- context-wide models
- app-owned reactive proxies
- app-owned machines and workflows
- app-owned workers and non-DOM Wasm modules
- app-owned browser service state
- app-level cleanup and diagnostics
- model/runtime scheduling

`$rootScope` owns UI state:

- one bootstrapped root scope tree
- directive, component, controller, and route scopes
- scope event propagation
- DOM-related scheduling
- compiled view lifecycle
- template-bound bridges such as `ng-wasm`

`$rootScope` remains the root of UI scopes. It should not be the root of all
reactivity.

## Policy Over Plumbing

AngularTS should own repetitive operational browser mechanics.

Users should configure policy, not write plumbing, for common behavior such as:

- reconnect and retry
- heartbeat and timeout
- cache invalidation
- persistence and hydration
- cancellation and concurrency
- worker and Wasm lifecycle
- service worker update behavior

Defaults should be useful and safe. Risky actions that affect data integrity,
permissions, user experience, durable state, or side effects must stay
explicit.

## Explicit Boundaries

Every abstraction should define its ownership and composition boundary.

Before an abstraction becomes stable, it should answer:

- what browser primitive or app primitive it wraps
- what dependency or boilerplate it replaces
- what lifecycle it owns
- what state is reactive
- what policy is configurable
- what failure behavior is exposed
- what cleanup happens when a scope, root, or app is destroyed
- what native escape hatch exists, if any
- what it intentionally does not replace

If an abstraction cannot name the dependency or boilerplate it removes, it
should remain application code.

## Public API Discipline

The public API should expose user-facing concepts, not implementation recipes.

Public surface should prefer:

- authoring methods
- runtime services
- config types
- callback contracts
- extension points
- evidence and diagnostics types that users actually consume

Public surface should avoid:

- config-free provider types
- implementation-only provider tokens
- proxy internals
- registry internals once `NgModule` methods cover the behavior
- generated types that users do not need to import

Compatibility can preserve old paths during migration, but documentation should
teach the stable user path first.

## Type Safety

Configuration and extension APIs should be type-safe.

Type safety should:

- reject unknown config keys
- reject invalid config fields
- infer model and plugin config types
- prevent root-scoped dependencies from leaking into app-owned factories where
  possible
- avoid exposing internal implementation types just to make the compiler happy

The type system should make correct framework usage easier than incorrect
usage.

## Documentation Is Part Of Maturity

An API is not mature just because it exists and passes tests.

A stable AngularTS API needs:

- generated public docs
- a clear service or concept guide
- executable or testable samples
- migration notes when replacing older paths
- public type inventory classification
- clear ownership and lifecycle guidance

If users can see or import a public API, they should be able to find what it is
for, how to configure it, how to use it correctly, and what replaces it if it
is legacy.

## Complexity Test

Before adding or keeping an API, ask:

- does this make the app more declarative?
- does this keep reactive primitives synchronized with less user work?
- does this replace a common dependency or boilerplate pattern?
- does this hide browser mechanics without hiding important decisions?
- does this improve lifecycle, failure, recovery, or cleanup behavior?
- does this have a clear ownership boundary?
- does this expose only the types users need?
- can it be documented with an executable or testable sample?

If the answer is no, the feature should be redesigned, deferred, or kept
internal.

## Level-9 Definition

AngularTS reaches level 9 when normal applications can be built through
declarative framework primitives without users reaching first for external
dependencies, provider internals, manual synchronization, or browser lifecycle
plumbing.

At that point:

- app authoring is declarative
- reactivity keeps primitives synchronized
- policies replace repeated operational code
- app-owned runtime state is separated from view-owned UI scope state
- public API surface matches user needs
- provider internals remain available to the injector but disappear from the
  normal authoring path
- docs and generated outputs teach the same stable model
