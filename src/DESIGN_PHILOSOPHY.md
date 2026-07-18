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

Machine, workflow, and router APIs follow the durable API ergonomics contract
below. Public types belong in the `ng` namespace only when users encounter and
need documentation for them.

Preferred user paths:

- declare app structure through `NgModule`
- declare shared reactive state through `app.model(...)`
- declare service config through service-owned config
- declare third-party modules through `angular.module(...)` and module
  dependencies
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

## API Ergonomics Contract

Machine, workflow, and router ergonomics are governed by a no-new-runtime-API
rule: simplify authoring, inference, naming, documentation, and exported types
before adding another runtime method, helper, directive, or test API.

The common authoring path starts from one object literal and does not require
explicit generic parameters. TypeScript should infer state names, route names,
event names, command names, payloads, params, and resolves from that literal
and preserve them through named module registration.

### Runtime Vocabulary

| Name         | Meaning                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `send`       | Deliver a typed event to a machine or workflow state engine. It does not start workflow commands or router navigation.                                       |
| `run`        | Start a named workflow command and return its asynchronous command result.                                                                                   |
| `go`         | Navigate to a named router state through `$state.go(...)`.                                                                                                   |
| `transition` | The router navigation lifecycle and its evidence object. Machine and workflow event delivery uses `send(...)`; application navigation uses `$state.go(...)`. |
| `status`     | A stable result or runtime-state discriminator intended for application control flow.                                                                        |
| `snapshot`   | Capture documented durable evidence without executable callbacks, adapters, or framework internals.                                                          |
| `restore`    | Apply a compatible snapshot to an existing runtime object while preserving its reactive identity.                                                            |

Different verbs are intentional. `machine.send(...)` handles an event,
`workflow.run(...)` starts a command, and `$state.go(...)` starts navigation.
Using one generic dispatch verb for all three would erase meaningful lifecycle
and result differences.

### Outcomes And Evidence

| Boundary            | Control flow                                                                                                                                                                   | Evidence                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `machine.send(...)` | Branch on `ok`, then use `status` to distinguish `transitioned`, `updated`, missing, invalid, guard-denied, or policy-denied outcomes.                                         | The result describes the attempted transition. Machines do not accumulate diagnostics.               |
| `workflow.run(...)` | Branch on `ok`, then use settled `status` values: `completed`, `failed`, `cancelled`, `timeout`, or `rejected`. Queueing is execution policy, not a returned outcome.          | Diagnostics and bounded history explain failures and support retry, repeat, snapshots, and recovery. |
| `$state.go(...)`    | Await the `TransitionPromise`; fulfillment and rejection are the asynchronous navigation branches.                                                                             | The attached `Transition` records success, error, redirects, and lifecycle detail after settlement.  |
| `policy.check(...)` | Branch on the decision `type`. Common gate policies use `allow`, `deny`, and `redirect`; specialized policies use domain terms such as `deliver`, `drop`, or cache strategies. | Optional reason, status, target, error, and metadata explain the decision.                           |

Diagnostics are evidence, not a substitute for `ok`, `status`, Promise
settlement, or policy decision `type`. Specialized policy decision types remain
separate because a cache strategy and an authorization gate do not have the
same semantics.

Snapshots contain durable state and evidence only. They must not contain live
scopes, callbacks, adapters, promises, abort controllers, DOM nodes, or runtime
registries. Restore applies snapshot state to an existing runtime; it does not
revive in-flight commands, hooks, retained views, or external resources.

### Public Type Placement

The ambient `ng` namespace contains types users encounter while authoring an
app or consuming injected runtime objects: declarations, config, callback
arguments that need explicit annotation, runtime services, results, statuses,
snapshots, diagnostics, and supported extension contracts.

The main package entry point contains the ordinary authoring functions and the
runtime/evidence types needed by the common path. Advanced adapters, protocol
messages, mapped inference helpers, and reusable package-author contracts use
direct module imports. Implementation-only mapped types, registries, provider
recipes, and proxy machinery are not public exports.

A type is not hidden merely because its name is verbose. Return values, config
values, callback arguments, snapshots, results, diagnostics, and extension
contracts remain documented wherever users encounter or implement them.

### Registration Inference

| Registration                       | Inference rule                                                                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app.machine(name, definition)`    | Preserve data, event, payload, and state-name information from the machine definition or injectable definition factory.                                                                                        |
| `app.workflow(name, definition)`   | Preserve data, event, command, command input/output, and state-name information from the workflow definition or injectable definition factory.                                                                 |
| `module.router(tree)`              | Infer the route map from the literal route tree and return a typed router module carrying that map.                                                                                                            |
| `module.router(...)`               | Preserve the route map already carried by a typed router module and reject names, params, or resolves outside that map. A route tree registered on an untyped module infers its contract from the declaration. |
| `module.lazyState(prefix, loader)` | Preserve the typed router module's route map and constrain the lazy prefix to a declared lazy boundary. The loader does not silently widen the known route map.                                                |

Named registration must not make ordinary users repeat generic arguments that
were available at the declaration site.

### Policy Attachment

Policy uses existing config ownership boundaries:

| Primitive | Attachment point                                                                                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Machine   | Transition admission policy is the machine definition's `policy` field; guards and hooks stay on the transition or machine definition that owns them.                                                |
| Workflow  | Command timeout and concurrency stay on `WorkflowConfig` or per-run options. Persistence and recovery stay on `WorkflowSupervisorConfig` through `persistence`, `persistencePolicy`, and `recovery`. |
| Router    | App-wide defaults stay in `$router` config. Route-subtree navigation, transition, and retention policy stays under `StateDeclaration.policy` and inherits through the route tree.                    |

Machine, workflow, and router do not gain a second generic policy registry.
Configuration remains declarative and local to the primitive that executes the
decision.

### State Terminology

A machine or workflow `state` is an execution mode in that primitive's local
`states` map. A router state is a named navigation node with views, params,
resolves, and URL behavior. A route tree is the hierarchical module declaration
made from router states.

Router documentation retains “state” because it is the established router
runtime term (`$state`, `StateDeclaration`, and `$transitions`). It uses “route
tree” for module-level hierarchy and always says “router state” where confusion
with machine or workflow state is plausible.

## Type Safety

Configuration and extension APIs should be type-safe.

Type safety should:

- reject unknown config keys
- reject invalid config fields
- infer model and module-local config types
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
- 100% test coverage for new modules
- migration notes when replacing older paths
- a named, documented contract for every public injectable
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

For security policy features, add only when all of these are true:

- the behavior is truly cross-cutting across more than one domain (routing,
  request stack, realtime, service worker, etc.);
- incorrect usage creates a meaningful security risk (permissions, secret
  leakage, privilege escalation, or trust-boundary failure);
- a deterministic centralized policy removes repeated app-specific authorization and
  headers/guard logic;
- safe defaults keep apps secure out of the box, with explicit opt-in for riskier
  behavior.

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
- new modules target 100% test coverage before being considered mature
- docs and generated outputs teach the same stable model
