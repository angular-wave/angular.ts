# Machine Internals

This directory owns AngularTS reactive mode machines for declarative UI and
application flows. The implementation in `machine.ts` is centered on a small
runtime target object that can register with scope proxies when observed,
without tying the machine lifetime to any one scope.

The public machine API uses a declarative state-tree and event contract.

## Responsibilities

- Create reactive machines from `$machine(config)`.
- Expose mode transitions through `send()`, guarded `can()`, and `matches()`.
- Keep `current` and `data` observable when a scope proxy wraps a machine.
- Coalesce transition updates through the active scope's `$batch()` scheduler.
- Preserve machine instances across destroyed observing scopes.
- Snapshot and restore durable mode and data without restoring transition
  functions or hooks.
- Run mode-specific and global transition hooks in deterministic order.

## Public Surface

- `defineMachine(config)`: preserves strict generic inference for TypeScript
  machine definitions.
- `MachineService`: callable service type for creating machines.
- `Machine`: runtime object exposed to controllers, scopes, and templates.
- `MachineConfig`: public state-tree configuration shape for initial mode,
  reactive data, states, transitions, hooks, and transition policy.
- `MachineSendResult`: structured transition result returned by `send()`.
- `MachineSnapshot`: durable state shape returned by `snapshot()`.

Advanced direct-import surface:

- Transition context, guard, update, hook, and policy types support reusable
  package-level annotations. Inline definitions rely on contextual typing.
- `MachineDataOf`, `MachineEventsOf`, `MachineEventNamesOf`, and
  `MachineModesOf` derive types for adapters built around reusable definitions.

Normal applications use `defineMachine(config)`, `app.machine(name, config)`,
or inject `$machine`. Custom runtimes opt in through
`orchestrationModule` from the `runtime/orchestration` package entry.

Public methods and values exposed to callers include readonly `current`, `data`,
`send()`, `can()`, `matches()`, `snapshot()`, and `restore()`.

Pre-state-tree runtime compatibility has been removed from `$machine`.
Workflow-owned `transitions` are adapted inside `$workflow` before reaching the
machine runtime.

## Type Ergonomics

Machine definitions can be declared from a plain object without generic
parameters. Event names are inferred from the `on` maps, state names are
inferred from `states`, and payloads remain `unknown` until an explicit event
map supplies their types.

Strict event names and payloads are still available by passing an explicit event
map to `defineMachine<Data, Events>(config)` or
`MachineConfig<Data, Events, Modes>`.

State names are part of the type contract. When a state-tree config is passed
through `defineMachine(config)` or `$machine(config)`, the machine result carries
the mode union into `current`, `matches(mode)`, `send()` results, and
`snapshot().current`. Invalid static `to` targets are rejected when they do not
match the state tree.

`MachineDataOf`, `MachineEventsOf`, `MachineEventNamesOf`, and `MachineModesOf`
derive surrounding types from an existing machine or definition so callers do
not have to repeat generic arguments.

## Core Model

Each machine is backed by one raw `machineTarget`. The target owns the durable
`current` mode and the raw `data` object from the config. When a scope proxy
observes the machine, the target receives `SCOPE_PROXY_BIND` and stores a
binding for that scope id. The binding records the scope handler and the proxy
view of the machine for that observer.

The main flow for `send()` is:

1. Validate the event name and find a transition for the current mode.
2. Pick an active, non-destroyed scope binding when one exists.
3. Evaluate the optional transition guard inside that scope's `$batch()`
   scheduler.
4. Run state-tree `before`/`update` when the guard passes.
5. Apply the explicit state-tree `to` mode, any `context.to` update, or the
   current mode when neither is set.
6. Run exit, enter, and transition hooks when appropriate.
7. Schedule all live scope bindings for `current`, `data`, and discovered data
   keys.

Important invariants:

- Missing transitions return `{ ok: false, status: "missing-transition" }` and
  do not run hooks.
- Guarded transitions return `{ ok: false, status: "guard-denied" }` without
  running the target or hooks when the guard returns `false`.
- A handled transition returns `{ ok: true }`, including same-mode transitions.
- `current` is read-only. Mode changes must go through `send()` or `restore()`.
- The machine must remain usable after every observing scope is destroyed.
- Restore mutates the existing data object where possible so proxies keep
  identity.
- Snapshot and restore handle special keys such as `__proto__` as data, not as
  prototype mutation.

## State Tree Execution Contract

The upgraded declaration path uses `states` instead of `transitions`. A state
entry owns an `on` table, and each event entry may define `to`, `guard`,
`before`, `update`, `after`, and `denied`.

State-tree transition ordering is:

1. `guard`
2. when the guard denies, transition-local `denied`
3. when the guard allows, transition-local `before`
4. transition-local `update`
5. global exit hook for the previous mode when the mode changes
6. mode assignment from explicit `to`, or the current mode when `to` is omitted
7. global enter hook for the next mode when the mode changes
8. transition-local `after`
9. global transition hook

`update()` return values are ignored. Mode routing comes only from `to`; omit
`to` for same-mode data updates.

If `before` or `update` throws, the mode remains unchanged and live bindings are
still scheduled for any data mutations that already happened. If `after`,
`enter`, `exit`, or the global transition hook throws, the assigned mode and
data mutations remain visible and live bindings are scheduled.

Guard contexts expose `data` and `machine.data` as readonly in TypeScript.
Guards must be deterministic and side-effect-free because `can()` may evaluate
them repeatedly. `can()` does not run `denied`. Put denial side effects in
`denied`, successful transition mutations in `update`, `before`, or `after`,
and external orchestration in workflow command logic.

## Send Results

`send(type, payload)` returns the structured runtime result for controllers,
workflows, tests, and application orchestration. Use `can(type, payload)` for
boolean template gating.

Send statuses are:

- `transitioned`: a handled transition changed mode.
- `updated`: a handled transition stayed in the same mode.
- `missing-transition`: the current mode has no matching event.
- `guard-denied`: the transition guard returned `false`.
- `invalid-event`: JavaScript callers passed a non-string event name.
- `policy-denied`: the framework policy gate denied the transition.

## Lifecycle

`$machine(config)` creates an unbound target. Assigning that target to a
controller, AppContext model, service, workflow, runtime adapter, or scope
property lets the scope proxy bind later through `SCOPE_PROXY_BIND`.
`$machine(scope, config)` immediately returns a scope proxy around the machine
when the supplied scope has a handler, but that form is advanced runtime
compatibility and is not part of the public TypeScript service contract.

Bindings are kept in a map keyed by scope id. Destroyed bindings are removed
when a transition, restore, or active-binding lookup sees them. The machine
itself does not subscribe to scope destruction and does not get destroyed with
any one scope.

## Lifecycle Contract

- Machine construction is synchronous and does not touch browser APIs.
- `$machine(config)` creates an unbound runtime object.
- AppContext models, controllers, named machine services, workflows, and runtime
  adapters should own that object and let scopes observe it by assignment.
- `$machine(scope, config)` creates a scope proxy immediately when a handler is
  available for advanced runtime compatibility, but ordinary examples should not
  use it.
- Scope observation is opt-in through assignment to a scope or controller
  property. A machine can be observed by several scopes over its lifetime.
- Scope destruction never destroys the machine. Destroyed bindings are removed
  opportunistically during transition, restore, scheduling, or active-binding
  lookup.
- Machines have no explicit `destroy()` method. Callers own references to
  machine instances and any external resources used by transition hooks.

## Reactivity Contract

- `current` and `data` are reactive when a machine is observed through a scope
  proxy.
- `current` is reactive but not writable. Direct assignment is not a supported
  transition mechanism.
- Transition and restore scheduling updates `current`, `data`, and discovered
  nested data keys for every live observing scope.
- Unbound machines remain plain synchronous objects until assigned to a scope or
  controller property.
- AppContext-owned models can hold machines without a DOM root. Destroying every
  root scope removes DOM observers but does not destroy the app-owned machine.
- Destroyed observing scopes stop receiving updates after opportunistic binding
  cleanup. The machine's own mode and data remain valid.
- Transitions and hooks are not event streams. Callers that need durable
  evidence should use `$workflow`.

## Policy Contract

- `$machine` has no retry, persistence, concurrency, or recovery policy.
- The only policy-like behavior is transition legality: the current mode,
  transition table, and optional guard decide whether `send()` can run.
- Guards and transition policy are evaluated synchronously during `can()` and
  `send()`.
- Machine transition policy uses the shared framework `Policy` contract shape.
  It is an optional config-level gate, not a second machine-only policy system.
- The default policy behavior is allow/no-op when no `policy` is configured or
  a JavaScript caller returns a malformed decision.
- Policy contexts include `operation: "machine.transition"`, `machineId`,
  `type`, `from`, `to`, `payload`, readonly `data`, readonly `machine.data`,
  `metadata`, and framework `target`/`meta` aliases.
- Policy denial returns `policy-denied` from `send()` and `false` from `can()`.
- Policy denial does not run `denied`, `before`, `update`, `after`, enter hooks,
  exit hooks, or global transition hooks.
- Policy decisions must be synchronous. Async policy belongs in `$workflow`,
  services, or supervisors that project their result back through a machine
  event.
- Transition targets decide mode changes by returning a non-empty mode string or
  staying in the current mode with `false`, `undefined`, an empty string, or a
  non-string value.
- Persistence timing, side effects, migrations, and external recovery remain
  application-, `$workflow`-, or supervisor-owned.

## Policy Integration Slice (Machine Events)

This section defines how machine transitions consume framework policy gates
without changing the existing synchronous transition contract.

Execution order:

- `send(type, payload)`/`can(type, payload)` first evaluate existing transition
  availability and machine guard logic.
- Framework policy gate is evaluated at the transition boundary before target
  execution.
- Decision semantics:
  - `allow`: continue normal guard/target execution.
  - `deny`: transition is blocked (`send()` returns a denied result, `can()`
    returns `false`).

Context shape for machine gates:

- `operation: "machine.transition"`
- `machineId`: optional config id.
- `type`: event name.
- `from`: current mode.
- `to`: candidate mode from state-tree `to`/`context.to`, or the current mode
  when the event is a same-mode update.
- `payload`: untyped machine payload.
- `data`: readonly transition data.
- `machine`: readonly machine view.
- `metadata`/`meta`: optional config metadata.

Compatibility requirements:

- Default policy is no-op/allow to preserve existing behavior.
- Existing `guard` behavior remains authoritative for transition semantics.
- No transition side-effects are introduced by policy; only allow/deny control.
- `can()` remains deterministic and boolean; `send()` remains deterministic and
  returns structured transition evidence.
- Static state-tree `to` gives policy a deterministic pre-execution context.

## Dependency Replacement Contract

- `$machine` replaces small finite-state, game-flow, wizard-flow, and UI mode
  helper libraries that applications often add for legal transition handling.
- It builds on AngularTS scope proxies and plain synchronous JavaScript objects,
  not a browser runtime API.
- AngularTS adds template reactivity, guarded transition typing, batching around
  observed transitions, deterministic hooks, and snapshot/restore.
- `$machine` intentionally does not replace async command orchestration,
  diagnostics, retries, persistence policy, or distributed state engines.
- Applications can keep using plain functions and objects in state-tree updates;
  hooks remain the escape hatch for app-owned side effects.

## Composition Contract

- `$machine` is a primitive.
- `$workflow` builds on `$machine` for legal mode transitions and reactive data.
- Workflow supervisors may persist or recover machine mode/data indirectly
  through workflow snapshots.
- `$machine` must not depend on `$workflow`, storage, workers, service workers,
  router, HTTP, or realtime services.
- Application-owned adapters compose through state-tree updates and hooks, but
  external resource ownership stays outside `$machine`.

## Failure Contract

- Invalid machine configs throw synchronously during construction.
- Invalid restore snapshots throw synchronously from `restore()`.
- Non-string event names, missing transitions, missing targets, and failed
  guards return `false`.
- Transition targets and hooks are not caught by `$machine`; thrown exceptions
  propagate to the caller after live scope bindings are scheduled when a
  transition had started.
- `$machine` does not append diagnostics. Use `$workflow` when transition or
  command failures need structured evidence, retry, or recovery.

## Recovery Contract

- `snapshot()` returns only `{ current, data }` and excludes transitions, guards,
  hooks, scope bindings, active binding selection, and external effects.
- Snapshot data is cloned with `structuredClone()`. Non-cloneable values throw
  the native structured clone error.
- `restore(snapshot)` replaces `current` and mutates existing plain-object data
  where possible so scope proxies keep object identity.
- Restore removes data keys missing from the snapshot, merges nested plain
  objects, replaces non-plain values, and does not run hooks.
- `$machine` owns no durable persistence policy. Callers persist snapshots
  through storage services, workflow supervisors, or application code.

## Scheduling And Ordering

- `send()` runs synchronously.
- `can()` may run a transition guard, but never runs state-tree `update` or
  `denied`.
- State-tree guard data is readonly at the type level; update contexts remain
  mutable.
- Transition work is wrapped in `$batch()` when an active live scope binding is
  available.
- Nested `machine.send()` calls from hooks are included in the outer batch.
- Binding schedules happen after a transition starts, even when a transition or
  hook throws.
- `restore()` schedules bindings after replacing mode and data.
- Scope watcher callbacks still run according to the scope scheduler.

Hook ordering for a mode change is:

1. `hooks.exit[from]`
2. `current` assignment
3. `hooks.enter[to]`
4. `hooks.transition`

For same-mode transitions, only `hooks.transition` runs.

## Data Structures

- `bindings`: maps scope ids to live machine bindings for all observing
  scopes.
- `activeBinding`: preferred binding used for batching and proxy-aware
  transition contexts.
- `MachineBinding`: stores the observing scope handler and the machine proxy
  associated with that scope.
- `MachineStateMap`: maps modes to state-tree nodes.
- `MachineStateTransitionMap`: maps state-tree events to transition
  descriptors.
- `MachineHooks`: stores exit hooks, enter hooks, and a global transition hook.

## Integration Points

- Scope proxy binding: `SCOPE_PROXY_BIND` registers observing scope handlers.
- Scope batching: `$batch()` suppresses intermediate observer flushes while a
  transition runs.
- Scope scheduling: `_scheduleWatchKeys()` and `_checkListenersForAllKeys()`
  propagate machine and nested data mutations to templates.
- Structured clone: `snapshot()` and restore value replacement rely on native
  clone semantics.
- `module.machine(name, config)`: registers named machines as DI singletons
  through the module layer.

## Native Interop

- `$machine` is a pure AngularTS runtime abstraction and has no native browser
  object underneath it.
- The relevant native boundary is `structuredClone()` for snapshots and restore
  value replacement.
- External side effects in transition hooks remain application-owned. `$machine`
  does not wrap storage, network, workers, timers, or rendering APIs.

## Edge Cases

- Non-string event names return `invalid-event` from `send()`.
- Missing transitions return `missing-transition` from `send()`.
- Denied guards return `guard-denied` from `send()`.
- Denied guards may run a transition-local `denied` hook, but never run
  `before`, `update`, `after`, exit hooks, enter hooks, or global transition
  hooks.
- Guard functions should be side-effect-free because `can()` may run during
  template evaluation.
- Invalid config objects throw during creation.
- Invalid snapshots throw during restore.
- Non-empty string transition results change mode; empty strings do not.
- Arrays, maps, sets, dates, typed arrays, and other non-plain values are
  replaced from snapshots instead of recursively merged.
- Plain object snapshot data is merged into existing plain object targets.
- Missing snapshot keys are deleted from existing data.
- Cyclic data can be snapshotted through `structuredClone()`.

## Destruction And Cleanup

Machines do not own scope lifetimes. Cleanup is opportunistic: destroyed scope
bindings are removed when binding lookup or scheduling runs. After the last
scope is destroyed, the machine still retains its current mode, data, config,
transitions, and hooks so it can later bind to another scope.

## Types And Interfaces

`Machine`
: Public runtime API used by templates, controllers, workflows, and named
machine injectables.

`MachineConfig`
: Public definition for initial mode, reactive data, state-tree transitions,
optional hooks, and optional transition policy.

`MachineSendResult`
: Structured `send()` result with transition status and policy denial details.

`MachineHooks`
: Optional side-effect hooks for mode entry, mode exit, and any handled
transition.

`MachineSnapshot`
: Durable snapshot object containing only `current` and cloned `data`.

`MachineBinding`
: Internal record for one observing scope handler and its machine proxy.

## Test Harness

- `machine.spec.ts` is the deterministic runtime harness and covers transitions,
  guards, hooks, snapshots, restore, scope binding, destroyed scopes, and
  collection data.
- `machine-types.spec.ts` is the public TypeScript contract harness for strict
  event and payload typing.
- `machine.test.ts` is the browser-facing harness for examples and template
  integration.
- Tic tac toe coverage acts as the real workflow-style fixture for game-flow
  behavior and persistence examples.

## Testing Notes

- `machine.spec.ts` covers runtime behavior, scope binding, multiple scopes,
  destroyed scopes, hooks, restore, snapshots, maps, sets, and tic tac toe
  scenarios used in documentation.
- `machine-types.spec.ts` covers strict TypeScript event and payload typing.
- `machine.test.ts` covers browser-facing examples and template integration.
- Add focused tests when changing scope binding, hook ordering, restore merge
  behavior, or TypeScript generic defaults.
