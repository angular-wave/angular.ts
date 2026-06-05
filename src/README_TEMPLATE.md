# [Component Name] Internals

This [file or directory] owns [short description of the component's runtime
responsibility]. The implementation in `[primary-file].ts` is centered on
[core design idea or primitive]. [One sentence about the most important
boundary, invariant, or integration point.]

For services that wrap browser APIs or own long-lived runtime state, apply the
standard in `src/services/SERVICE_CONTRACTS.md`. Contract sections describe
behavior; they do not require shared base interfaces or generic lifecycle APIs.
Services should turn Web Platform primitives into reactive, policy-driven app
primitives when doing so removes operational boilerplate from application code.

## Responsibilities

- [Primary responsibility.]
- [Secondary responsibility.]
- [Important lifecycle, scheduling, parsing, rendering, or integration concern.]
- [Important cleanup, error handling, compatibility, or performance concern.]

## Public Surface

- `[exportedSymbol]`: [what callers use it for].
- `[ProviderOrFactory]`: [how it is created, registered, or injected].
- `[helperFunction]`: [why it is exposed outside this directory].

Public methods or values exposed to callers include `[methodOrValue]`,
`[methodOrValue]`, and `[methodOrValue]`.

## Core Model

[Describe the main object model in concrete terms. Name the central classes,
records, maps, queues, caches, or browser objects. Explain who owns state and
which state is derived.]

The main flow is:

1. [First important step.]
2. [Second important step.]
3. [Third important step.]
4. [Final state update, callback, render, or cleanup step.]

Important invariants:

- [Invariant that protects correctness.]
- [Invariant that protects compatibility with AngularJS behavior.]
- [Invariant that protects cleanup, memory use, ordering, or error handling.]

## Lifecycle

[Describe how instances are created, connected to the rest of the framework,
updated, and destroyed. Include ownership rules for parent/child relationships,
DOM nodes, listeners, subscriptions, caches, or injected services.]

## Lifecycle Contract

- [When construction happens and whether it touches browser APIs immediately.]
- [Which method starts, connects, registers, or activates the runtime resource.]
- [Which method stops, closes, unregisters, aborts, or disposes it.]
- [What remains usable after scope/controller destruction.]
- [Whether restart, reconnect, or repeated registration is supported.]

## Reactivity Contract

- [Which runtime properties are scope-reactive.]
- [When those properties update and whether updates are batched/scheduled.]
- [Which events remain subscription-only or native-only.]
- [What happens to reactive state after observing scopes are destroyed.]

## Policy Contract

- [Default operational policy, if any.]
- [Configuration fields that override the default policy.]
- [When policy is evaluated and whether it can change at runtime.]
- [How policy decisions surface in state, results, callbacks, or diagnostics.]
- [Which policy choices remain application-owned.]

## Dependency Replacement Contract

- [Common dependency, helper library, or boilerplate pattern this replaces.]
- [Web Platform primitive or AngularTS primitive it builds on.]
- [Lifecycle, policy, reactivity, diagnostics, or recovery behavior it adds.]
- [What this component intentionally does not replace.]
- [Native escape hatch or custom adapter path.]

## Composition Contract

- [Lower-level AngularTS primitives this builds on.]
- [Higher-level AngularTS primitives that may build on this.]
- [Dependencies this component must not take.]
- [Whether this is a primitive, adapter, policy layer, or orchestration layer.]
- [How application-owned adapters compose with it.]

## Failure Contract

- [Which failures throw synchronously as configuration/programming errors.]
- [Which runtime/browser failures reject promises, return failed results, or
  append diagnostics.]
- [Stable diagnostic or error codes exposed to callers.]
- [Whether failures are recoverable and how that is indicated.]

## Recovery Contract

- [Whether this component supports snapshot/restore or durable recovery.]
- [Snapshot shape, version, migration rules, and intentionally excluded state.]
- [What restore cancels, invalidates, or leaves running.]
- [Which persistence policy, if any, owns durable storage.]

## Scheduling And Ordering

[Use this section when the component defers work, batches updates, uses
microtasks, uses DOM events, or depends on compile/link/controller ordering.]

- [Which operations run synchronously.]
- [Which operations are deferred or batched.]
- [How callbacks are ordered.]
- [How exceptions are reported.]

## Native Interop

- [Native browser/runtime object wrapped by this component, if any.]
- [Escape hatch for callers that need the native primitive.]
- [Interop boundaries that remain application-owned.]

## Test Harness

- [Deterministic fake backend/container/connection/parser used by unit tests.]
- [Real browser/runtime integration tests and cleanup requirements.]
- [Fixtures or example apps that should keep working across releases.]

## Data Structures

- `[structureName]`: [what it stores and why that shape is useful].
- `[indexName]`: [how it speeds up lookup, removal, propagation, or matching].
- `[cacheName]`: [what invalidates or clears it].

## Integration Points

- `[dependency]`: [what the component expects from this dependency].
- `[consumer]`: [who consumes this component's output or side effects].
- `[browser/runtime API]`: [native API behavior this component preserves or
  wraps].

## Edge Cases

- [Compatibility behavior or intentionally broad handling.]
- [Failure mode and how it is surfaced.]
- [Case that should not trigger work.]
- [Case that must trigger cleanup.]

## Destruction And Cleanup

[Describe deregistration, listener removal, cache clearing, DOM cleanup,
reference release, and what remains valid during teardown callbacks.]

## Types And Interfaces

`[TypeName]`
: [Public or internal type purpose. Mention key fields only when they explain a
behavioral contract.]

`[InterfaceName]`
: [What implements or consumes it.]

`[InternalRecord]`
: [Why the internal shape exists and which operations rely on it.]

## Testing Notes

- [Primary spec file and the behavior it protects.]
- [Regression area that should get a focused test when changed.]
- [Manual or integration behavior that is hard to assert in unit tests.]
