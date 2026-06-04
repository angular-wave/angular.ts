# Machine Internals

This directory owns AngularTS reactive mode machines for declarative UI and
application flows. The implementation in `machine.ts` is centered on a small
stateful target object that can register with scope proxies when observed,
without tying the machine lifetime to any one scope.

## Responsibilities

- Create reactive machines from `$machine(config)` and `$machine(scope, config)`.
- Expose mode transitions through `send()`, guarded `can()`, and `matches()`.
- Keep `current` and `data` observable when a scope proxy wraps a machine.
- Coalesce transition updates through the active scope's `$batch()` scheduler.
- Preserve machine instances across destroyed observing scopes.
- Snapshot and restore machine state without restoring transition functions or
  hooks.
- Run mode-specific and global transition hooks in deterministic order.

## Public Surface

- `MachineProvider`: registers `$machine` as an injectable service.
- `defineMachine(config)`: preserves strict generic inference for TypeScript
  machine definitions.
- `MachineService`: callable service type for creating machines.
- `Machine`: runtime object exposed to controllers, scopes, and templates.
- `MachineConfig`: configuration shape for initial mode, data, transitions,
  and hooks.
- `MachineSnapshot`: durable state shape returned by `snapshot()`.

Public methods and values exposed to callers include `current`, `data`,
`send()`, `can()`, `matches()`, `snapshot()`, and `restore()`.

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
4. Run the transition target when the guard passes.
5. Apply the returned mode string, or keep the previous mode for `false` and
   `undefined`.
6. Run exit, enter, and transition hooks when appropriate.
7. Schedule all live scope bindings for `current`, `data`, and discovered data
   keys.

Important invariants:

- Missing transitions return `false` and do not run hooks.
- Guarded transitions return `false` without running the target or hooks when the
  guard returns `false`.
- A handled transition returns `true`, including same-mode transitions.
- The machine must remain usable after every observing scope is destroyed.
- Restore mutates the existing data object where possible so proxies keep
  identity.
- Snapshot and restore handle special keys such as `__proto__` as data, not as
  prototype mutation.

## Lifecycle

`$machine(config)` creates an unbound target. Assigning that target to a
controller or scope property lets the scope proxy bind later through
`SCOPE_PROXY_BIND`. `$machine(scope, config)` immediately returns a scope
proxy around the machine when the supplied scope has a handler.

Bindings are kept in a map keyed by scope id. Destroyed bindings are removed
when a transition, restore, or active-binding lookup sees them. The machine
itself does not subscribe to scope destruction and does not get destroyed with
any one scope.

## Scheduling And Ordering

- `send()` runs synchronously.
- `can()` may run a transition guard, but never runs the transition target.
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
- `MachineTransitionMap`: maps modes to event handlers.
- `MachineTransitionDescriptor`: optional guarded form for one event handler.
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

## Edge Cases

- Non-string event names return `false`.
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
: Public definition for initial mode, reactive data, transition table, and
optional hooks.

`MachineTransition`
: Function invoked by `send()`. It receives data, payload, and the active
machine proxy.

`MachineHooks`
: Optional side-effect hooks for mode entry, mode exit, and any handled
transition.

`MachineSnapshot`
: Durable state object containing only `current` and cloned `data`.

`MachineBinding`
: Internal record for one observing scope handler and its machine proxy.

## Testing Notes

- `machine.spec.ts` covers runtime behavior, scope binding, multiple scopes,
  destroyed scopes, hooks, restore, snapshots, maps, sets, and tic tac toe
  scenarios used in documentation.
- `machine-types.spec.ts` covers strict TypeScript event and payload typing.
- `machine.test.ts` covers browser-facing examples and template integration.
- Add focused tests when changing scope binding, hook ordering, restore merge
  behavior, or TypeScript generic defaults.
