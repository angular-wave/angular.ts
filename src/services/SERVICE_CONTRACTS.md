# Service Contracts

AngularTS services that wrap browser APIs or own long-lived runtime state must
make their operational contract explicit before they are considered stable.
The goal is not to force every service into one base class. The goal is to make
every service answer the same lifecycle, failure, recovery, scheduling,
interop, and testability questions.

AngularTS turns Web Platform primitives into reactive, policy-driven app
primitives. The baseline is scope reactivity: services should keep useful
runtime state synchronized with scopes so application code can stay
declarative. A stable service should let users declare intent and policy while
AngularTS owns the repetitive browser mechanics.

For example, a WebSocket service should not require application code to write a
reconnection loop. The app should declare a reconnect and heartbeat policy, or
accept sensible defaults, while the service exposes reactive connection state
and diagnostics.

## API Complexity Guardrails

Contracts describe behavior. They do not require every service to expose the
same methods, inherit from a common base class, or carry generic lifecycle
state when the native abstraction does not need it.

Follow these guardrails when designing or stabilizing a service:

- Do not add a shared service base class.
- Do not add universal `start()`, `stop()`, `status`, `diagnostics`,
  `snapshot()`, `restore()`, or `native()` APIs by default.
- Do not add a diagnostics array unless the service has meaningful runtime
  failures that callers can inspect or recover from.
- Do not add `snapshot()` or `restore()` unless restore semantics are useful,
  deterministic, and testable.
- Do not add a native escape hatch unless there is a real native handle or
  browser primitive callers need to reach.
- Do not add module registration sugar until the raw injectable service proves
  useful and has stable behavior.
- Prefer service-specific verbs that match the underlying browser primitive:
  `register()` for service workers, `send()` for machines, `run()` for
  workflows, `connect()` for connections, and `request()` for backends.

It is valid for a contract section to say "not applicable" when the service is
pure, synchronous, stateless, or has no durable state. The contract exists to
prevent hidden behavior, not to inflate the public API.

## Reactivity Contract

Each long-lived or browser-facing service must state which runtime state is
scope-reactive and which state remains callback-only or native-only.

Reactive state should be exposed when it helps templates or controllers remain
declarative, such as:

- connection status
- latest message or event metadata
- registration/update status
- running or idle state
- bounded diagnostics
- retry or reconnect counters
- stale/cache/source metadata

Reactive state should not expose large unbounded streams, raw browser event
objects as primary state, or policy internals that users do not need to render
or branch on.

Services that own mutable reactive state must define:

- which properties are reactive
- when those properties update
- whether updates are batched or scope-scheduled
- what happens after observing scopes are destroyed
- which events remain available only through subscriptions

## Policy Contract

Services that own operational browser mechanics must document their default
policy and any configurable policy knobs.

Service-local policy remains service config. A shared `Policy` primitive is used
only when the decision is runtime, cross-cutting, and consistency-sensitive.
Candidate shared primitives are tracked in
`src/POLICY_PRIMITIVE_CANDIDATES.md`.

Policy examples include:

- reconnect and retry behavior
- heartbeat and timeout behavior
- cache read/write strategy
- persistence timing
- update detection and activation behavior
- cancellation and concurrency behavior
- backoff, maximum attempts, and failure thresholds

Each policy-driven service must state:

- the default policy
- which config fields override the default
- when policy is evaluated
- whether policy can change at runtime
- how policy decisions appear in reactive state or diagnostics
- which policy decisions remain application-owned because they affect user
  experience, data integrity, permissions, or side effects

Defaults should be safe and useful. Risky behavior, such as replaying
side-effecting work, activating a waiting service worker, or discarding durable
state, must stay explicit.

## Dependency Replacement Contract

AngularTS can expose a broad API when that API replaces a common dependency or
boilerplate pattern with a native-aligned, reactive, policy-driven primitive.

Each new service or major abstraction should state:

- which common dependency, helper library, or recurring boilerplate pattern it
  replaces
- which Web Platform primitive or app-level primitive it builds on
- what lifecycle, policy, reactivity, diagnostics, or recovery behavior
  AngularTS adds
- what it intentionally does not replace
- how callers can still use the native primitive or a custom adapter
- how the abstraction avoids adding more weight than the dependency or
  boilerplate it replaces

Examples:

- `$websocket` replaces reconnect and heartbeat socket helper libraries.
- `$rest` replaces small REST client and cache helper libraries.
- `$workflow` replaces ad hoc async command orchestration.
- `$machine` replaces finite-state and game-flow state helpers.
- `$serviceWorker` should replace registration, update, and messaging lifecycle
  glue, not full precache generation in v1.

If a proposed service cannot identify the dependency or boilerplate it removes,
it should remain application code.

## Composition Contract

Large API surface stays coherent when each abstraction has a clear place in the
stack.

Each service README should state:

- which lower-level AngularTS primitives it builds on
- which higher-level AngularTS primitives may build on it
- which dependencies it must not take
- whether it is a primitive, adapter, policy layer, or orchestration layer
- how it composes with custom app-owned adapters

Composition rules should prevent circular ownership and hidden coupling.

Examples:

- `$workflow` builds on `$machine`.
- A workflow supervisor builds on `$workflow`.
- `$serviceWorker` can be an activity boundary for workflows or supervisors.
- `$workflow` must not depend on service workers.
- `$rest` can use cache stores and custom backends, but should not require a
  service worker.

## Applicability

Use these contracts for services that do at least one of the following:

- wrap a standard browser API
- keep runtime state after controller or scope destruction
- open, register, connect, subscribe, or schedule external work
- expose retry, reconnect, cancellation, persistence, snapshot, or restore
- translate browser failures into AngularTS-facing behavior

Pure helpers, stateless filters, and compile-time-only utilities may reference
only the sections that apply.

## Lifecycle Contract

Each service README must state:

- when construction happens
- whether construction touches browser APIs
- which method starts, opens, connects, registers, or activates work
- which method stops, closes, unregisters, aborts, or disposes work
- whether repeated start/stop/register calls are allowed
- what remains usable after observing scopes or controllers are destroyed
- who owns references and cleanup for native resources

Construction should be side-effect-light by default. Browser registration or
network work should start through an explicit method or an explicit
`auto*` configuration option.

## Failure Contract

Each service README must state:

- which mistakes throw synchronously as configuration or programming errors
- which runtime failures reject promises
- which runtime failures return failed result objects
- which runtime failures append diagnostics
- stable error or diagnostic codes exposed to callers
- whether each failure is recoverable

Expected browser failures should not leak as random uncategorized exceptions.
When a service has diagnostics, diagnostics should be structured, bounded where
appropriate, and stable enough for tests and user interfaces.

## Recovery Contract

Stateful services must state:

- whether snapshot/restore exists
- snapshot version and shape
- migration rules
- intentionally excluded state
- whether restore cancels, invalidates, or leaves running work
- who owns durable persistence policy

In-memory recovery and durable persistence are different responsibilities.
Machines and workflows expose snapshots; supervisors or application code own
storage policy.

## Scheduling Contract

Each service README must state:

- which operations are synchronous
- which operations use promises or microtasks
- which callbacks come from browser events
- which updates are scope-scheduled or batched
- callback ordering when work succeeds, fails, cancels, or restores
- how thrown callback errors are reported

This contract is required for APIs that update templates, run hooks, or bridge
browser events into AngularTS state.

## Native Interop Contract

Browser-facing services must state:

- the native object or API they wrap
- how callers can access or replace the native primitive when needed
- which protocol, serialization, security, or permission concerns remain
  application-owned
- which lower-level AngularTS abstractions can be composed with the service

AngularTS should provide a safer default path without hiding the web platform.

## Test Harness Contract

Each browser-facing or long-lived service should have:

- deterministic unit tests using a fake backend, container, connection, cache,
  clock, or storage boundary where practical
- browser/runtime integration tests for at least one happy path and one cleanup
  path when fake tests cannot cover the real API
- type tests for public generic contracts
- example fixtures for workflows that must remain compatible across releases

Real browser tests must clean up registrations, connections, timers, workers,
storage, and subscriptions they create.

Use `src/services/SERVICE_TEST_CHECKLIST.md` when implementing or hardening a
service slice. The checklist is the executable form of this contract.

## Stability Gate

A service can be marked stable only when:

- its README includes the applicable contract sections
- expected failures have stable outcomes
- cleanup behavior is tested
- scope destruction behavior is tested when the service is observable
- native interop boundaries are documented
- examples are backed by tests or marked non-executable
