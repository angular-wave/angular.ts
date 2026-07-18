# Workflow Internals

This directory owns AngularTS inspectable command workflows. The public
implementation is centered on a `WorkflowStateEngine` plus command execution
state, diagnostics, bounded history, snapshots, restore, and retry.

Current implementation status:

- state transitions are machine-backed by default
- API/type-level state-engine abstraction is exposed through
  `WorkflowStateEngine` and `WorkflowConfig.stateEngine`
- the completed API-form hardening pass defines workflow authoring, command
  results, supervisor recovery, and public-surface ergonomics

The target architecture is to make the workflow engine an extensible abstraction
that users can build upon, with `$machine` as the default adapter.

## Responsibilities

- Create reactive workflows from `$workflow(config)`.
- Delegate legal mode transitions to a state engine (currently `$machine`).
- Run named synchronous or asynchronous commands with normalized results.
- Convert thrown command failures into structured diagnostics.
- Track command history for inspection, retry, and snapshots.
- Enforce command concurrency, timeout, cancellation, and cleanup policies.
- Restore workflows from versioned snapshots and cancel stale work.

## Public Surface

- Custom runtimes register `$workflow` together with `$machine` through
  `orchestrationModule` from the `runtime/orchestration` package entry.
  Normal applications use direct context-object command maps,
  `defineWorkflow(config)`, `app.workflow(name, config)`, or inject `$workflow`.

Ordinary user surface:

- `defineWorkflow(config)`: preserves strict generic inference for workflow
  definitions, including direct inline command-map input/output when no command
  map generic is supplied.
- `defineCommand(command)`: optional helper for reusable context-object command
  constants that should preserve strict generic inference outside an inline
  command map.
- `WorkflowService`: callable service type for creating workflows.
- `Workflow`: runtime object exposed to controllers, scopes, and templates.
- `WorkflowConfig`: configuration shape for identity, mode data, state-tree
  events, commands, and production policies.
- `WorkflowCommand`: canonical context-object command-map handler signature,
  `command(context)`.
- `WorkflowCommandContext`: command handler context containing `input`, workflow
  data, cancellation, cleanup, and the command name.
- `WorkflowCommandResult`: normalized command outcome used by `run()`,
  and `retry()`.
- `WorkflowCommandStatus`: stable command outcome status for control flow.
- `WorkflowDiagnostic`: JSON-oriented diagnostic evidence for command and
  recovery failures.
- `WorkflowHistoryEntry`: bounded command lifecycle evidence used for retry,
  snapshots, and inspection.
- `WorkflowSnapshot`: durable JSON-oriented state shape.
- `WorkflowSupervisor`: runtime object for multi-workflow delegation,
  persistence, recovery, aggregate diagnostics, and supervisor snapshots.
- `WorkflowSupervisorConfig`: configuration shape for supervised workflows,
  persistence adapter, persistence policy, and recovery policy.
- `WorkflowSupervisorPersistence`: adapter contract for durable supervisor
  snapshots.
- `WorkflowSupervisorRecoveryPolicy`: config shape for supervisor recovery
  behavior.
- `indexedDbWorkflowSupervisorPersistence(config)`: built-in IndexedDB adapter
  for durable supervisor snapshots.
- `app.workflow(name, config)`: registers a named workflow as a DI singleton
  through the module layer.
- `app.workflowSupervisor(name, config)`: registers a named supervisor as a DI
  singleton through the module layer.

Named workflow and supervisor registration infer data, event, command, and
workflow-map types from definitions produced by `defineWorkflow(...)`; ordinary
registration does not repeat those generic arguments.

Advanced extension surface:

- `WorkflowStateEngine`, `WorkflowStateEngineContext`, and
  `WorkflowStateEngineFactory`: state-engine adapter contract for custom
  workflow engines.
- `WorkflowStateEngineSnapshot` and `WorkflowSendResult`:
  state-engine adapter evidence contracts.
- `createWorkflowWorkerHost(config)`: creates a structured-cloneable workflow
  message host for worker-side workflow instances.
- `createWorkflowWorkerClient(connection)`: creates a page-side client over a
  `WorkerConnection`.
- `WorkflowWorkerRequest`, `WorkflowWorkerResponse`,
  `WorkflowWorkerSnapshotMessage`, and `WorkflowWorkerMessage`: public protocol
  messages for package authors that host workflows in Worker scripts.

Public methods and values exposed to callers include `id`, readonly `current`,
`data`, `diagnostics`, `history`, `send()`, `can()`, `matches()`, `run()`,
`retry()`, `cancel()`, `snapshot()`, and `restore()`.

## Core Model

Each workflow owns one state engine created from the workflow's `initial`,
`data`, and state definition. The default engine adapts `$machine` internally.
The workflow target exposes readonly current mode and reactive data through
getters, then adds command execution APIs and append-only evidence arrays for
diagnostics and history.

The main flow for `run()` is:

1. Validate the command name and lookup the command handler.
2. Validate per-run options and apply the concurrency policy.
3. Append a `command.started` history entry.
4. Create a run state with an `AbortController`, cleanup list, and cancellation
   promise.
5. Execute the command with workflow, data, input, command name, cleanup, and
   abort signal context.
6. Normalize successful return values or thrown failures into a
   `WorkflowCommandResult`.
7. Append `command.completed` or `command.failed`, trim bounded arrays, run
   cleanups, and schedule scope bindings.

Important invariants:

- `run()` and `retry()` always return promises.
- Unknown commands and invalid options produce failed results, not thrown
  exceptions.
- Command mutations are not rolled back when a command fails.
- Restore is a hard recovery boundary: queued work is invalidated and running
  work is cancelled.
- Restored supervisor snapshots do not revive transient runtime statuses:
  `running`, `persisting`, and `recovering` normalize to `idle` unless
  non-recoverable diagnostics require `failed`.
- Late command continuations from cancelled runs must not append history or
  write through the workflow-provided command data/context after restore.

## Lifecycle

`$workflow(config)` creates an unbound workflow target. Assigning it to a
controller or scope property lets scope proxies bind through `SCOPE_PROXY_BIND`.

Workflow bindings mirror machine bindings and are keyed by scope id. Destroyed
scope bindings are removed during scheduling and active-binding lookup. The
workflow instance is not owned by any one observing scope and can keep running
after an observer is destroyed.

## Lifecycle Contract

- Workflow construction is synchronous and creates a state engine; the default
  state engine uses `$machine` internally. Construction does not start commands
  or touch browser APIs by itself.
- `$workflow(config)` creates an unbound runtime object.
- Commands start only through `run()` or `retry()`.
- Scope destruction never destroys the workflow, cancels commands, or clears
  diagnostics/history. Destroyed bindings are removed opportunistically.
- `restore(snapshot)` is the hard lifecycle recovery boundary: it cancels
  running commands, clears queues, invalidates queued continuations, and
  replaces workflow mode/data/evidence with snapshot state.

## Reactivity Contract

- `id`, `current`, `data`, `diagnostics`, and `history` are reactive when a
  workflow is observed through a scope proxy.
- `send()` returns `WorkflowSendResult` and schedules workflow bindings after
  delegating to the state engine. `can()` accepts the same event payload.
- Command completion, failure, timeout, cancellation, cleanup diagnostics,
  retry and restore schedule live observing scopes.
- Destroyed observing scopes stop receiving updates after opportunistic binding
  cleanup. Workflow commands and recovery state continue independently.
- Command progress is represented through bounded diagnostics and history, not
  an unbounded event stream.

## UI Fragment Contract

Workflow UI is root-owned even when the workflow runtime is app-owned.
Progress views, diagnostics panels, recovery prompts, human approval steps, and
resumed command surfaces must render through bounded compiled fragments instead
of recompiling the whole view.

The internal proof lives in:

```text
src/services/workflow/workflow-ui-fragment.ts
```

Current contract:

- `createWorkflowUiFragmentHost(...)` is internal-only and is not exported from
  the public namespace.
- Rendering a workflow UI surface uses `$compile` so the existing root-owned
  fragment record is created by the compiler.
- Re-rendering replaces only the target element's owned fragment and disposes
  the previous progress/recovery fragment.
- Destroying the UI binding disposes compiled nodes, scopes, listeners, and
  late DOM work owned by that fragment.
- Destroying the UI binding does not cancel workflow commands, clear
  diagnostics, clear history, or destroy app-owned workflow state.
- `restore(snapshot)` remains the workflow recovery boundary. UI code can
  re-render a bounded recovery/progress fragment from restored state without
  owning persistence or command cancellation.

## Policy Contract

- Workflow config keeps service-specific behavior explicit instead of exposing
  an over-generic `policy` field.
- `concurrency` controls whether duplicate command runs are allowed, rejected,
  or queued.
- Timeout and cancellation policies use `AbortController` and `AbortSignal`.
- `retry()` uses recorded command evidence and live replay inputs
  where available.
- Diagnostics and history limits bound retained evidence.
- Snapshot migration policy is configured per workflow and evaluated during
  restore.
- Durable persistence, multi-workflow recovery, and cross-service orchestration
  remain supervisor- or application-owned.

Framework policy decisions consistently use `type` as the decision field.
Machines use `policy` for their single transition gate. Router declarations use
`policy` as a grouped object with `navigation`, `transition`, and `retention`
branches. Workflows keep `concurrency`, snapshot migration, and supervisor
`persistencePolicy`/`recovery` named for their distinct semantics; they do not
pretend those controls are interchangeable policy decisions.

## Engine Abstraction Slice

Goal:

- decouple `Workflow` from `$machine` at API/type level while preserving current
  runtime behavior for default flows.

Planned implementation:

- add `WorkflowStateEngine` contract for:
  - current state access (`current`)
  - legality checks (`can`)
  - transition execution (`send`)
  - snapshot and restore
- add optional `stateEngine` config hook on `WorkflowConfig` that returns an
  engine instance
- ship a built-in `$machine` adapter so existing configs continue to work unchanged
- route command-driven transition calls through the workflow-level engine adapter

Acceptance checklist:

- [x] Introduce `WorkflowStateEngine` type and default machine adapter.
- [x] Add optional `WorkflowConfig.stateEngine` path for user-provided engines.
- [x] Preserve `send()`, `can()`, `matches()`, `snapshot()`, and `restore()`
      behavior for default machine configs.
- [x] Preserve command semantics, retries, diagnostics, and history ordering with
      custom engines.
- [x] Add type-level tests validating a custom engine can be injected.
- [x] Add implementation tests proving machine-backed default behavior is unchanged.

## Dependency Replacement Contract

- `$workflow` replaces ad hoc async command orchestration, local retry/cancel
  helpers, command history arrays, diagnostic plumbing, and scattered
  promise-state flags.
- It builds on the workflow state-engine contract, the built-in `$machine`
  adapter, `AbortController`, `AbortSignal`, promises, and structured clone
  behavior.
- AngularTS adds reactive command evidence, stable diagnostics, bounded history,
  timeout/cancellation cleanup, retry, and versioned snapshot/restore.
- `$workflow` intentionally does not replace durable persistence, background
  execution, service-worker queues, distributed workflow engines, or
  exactly-once side-effect semantics.
- Commands remain the custom adapter path for HTTP, storage, workers, service
  workers, timers, and application-specific side effects.

## Composition Contract

- `$workflow` is an orchestration primitive built on a state-engine contract.
- The default state engine is backed by `$machine`, but custom engines can be
  supplied through `WorkflowConfig.stateEngine`.
- Workflow supervisors may build on `$workflow` for persistence policy,
  recovery policy, and multi-workflow coordination.
- Browser services such as `$rest`, `$worker`, `$websocket`, and future
  `$serviceWorker` can be used inside commands as activity boundaries.
- `$workflow` must not depend on supervisor, service worker, storage, REST,
  router, or realtime services.
- Application-owned adapters compose through command handlers and command
  context cleanup/abort hooks.

## Failure Contract

- Invalid workflow configs throw synchronously during construction.
- Unknown commands, invalid command names, invalid command options, concurrency
  rejection, timeout, cancellation, command throws, and cleanup throws resolve
  as failed `WorkflowCommandResult` values with stable diagnostics.
- Invalid workflow transitions append `workflow.invalidTransition`
  diagnostics.
- Invalid restore snapshots throw synchronously unless a configured migration
  returns a valid v1 snapshot.
- Command failures are evidence-first: diagnostics and history record what
  happened; workflow data mutations are not rolled back.

## Recovery Contract

- `snapshot()` returns a versioned workflow snapshot containing id, current
  mode, cloned data, bounded diagnostics, bounded history, and command metadata.
- Snapshot data uses `structuredClone()`; diagnostics and history values are
  JSON-normalized projections.
- Snapshot restore requires version `1` and matching workflow id after optional
  migration.
- Restore cancels active commands, runs cleanups, clears command queues, and
  prevents stale async continuations from appending history or writing through
  workflow-provided data/context.
- `$workflow` does not own durable persistence. Supervisors or application code
  own load/save policy for workflow snapshots.

## Scheduling And Ordering

- `send()` delegates to the state engine synchronously and schedules workflow
  bindings afterward.
- Commands may be synchronous or asynchronous.
- `concurrency: "allow"` starts commands immediately.
- `concurrency: "reject"` returns a failed result when the same command is
  already running.
- `concurrency: "queue"` chains runs per command name and skips queued work
  invalidated by restore.
- Command cleanups run after completion, failure, timeout, or cancellation.
- Scope scheduling happens after diagnostics/history/data changes.

Command result ordering is intentionally evidence-first:

1. `command.started`
2. command body and any workflow transitions it sends
3. diagnostics append for failures or returned diagnostics
4. `command.completed` or `command.failed`
5. cleanup callbacks
6. binding schedule

## Data Structures

- `diagnostics`: bounded array of structured workflow diagnostics.
- `history`: bounded array of command lifecycle entries.
- `runningCommands`: set of active run states used by cancellation and reject
  concurrency.
- `commandQueues`: per-command promise tails used by queue concurrency.
- `replayInputs`: map of history entry ids to original live inputs for retry
  before snapshot restore.
- `queueGeneration`: monotonic restore boundary used to invalidate queued work.
- `bindings`: maps observing scope ids to workflow bindings.

## Integration Points

- `WorkflowStateEngine`: owns mode transition behavior, reactive data, and
  state snapshots for workflows.
- `$machine`: built-in state-engine adapter used when no custom engine is
  configured.
- Scope proxy binding: `SCOPE_PROXY_BIND` registers observing scope handlers.
- Scope scheduling: workflow bindings schedule `current`, `data`,
  `diagnostics`, and `history` changes.
- `AbortController` and `AbortSignal`: cancellation, timeout, and external
  abort integration.
- Structured clone: snapshots clone workflow `data` with native
  `structuredClone()` semantics.
- JSON normalization: diagnostics and history inputs/outputs are stored as
  JSON-safe projections.
- `module.workflow(name, config)`: registers named workflows as DI singletons
  through the module layer.
- `module.workflowSupervisor(name, config)`: registers named supervisors as DI
  singletons through the module layer.

## Supervisor Contract

Workflow supervisors compose workflows. They do not replace `$workflow`, change
command semantics, or own browser background execution.

Supervisor responsibilities:

- delegate `run()`, `send()`, `cancel()`, and `cancelAll()` to named workflows
- snapshot and restore multiple workflows as one versioned supervisor snapshot
- persist and load snapshots through an explicit adapter
- apply persistence policy, currently `"manual"` or `"after-command"`
- apply startup recovery through explicit `ready` when `restoreOnStart: true`
  and retry recoverable command failures only when `recover()` is called
- record aggregate supervisor diagnostics for missing workflows, persistence
  failures, snapshot mismatch, unknown snapshot workflows, and failed recovery
  retries

Layer boundaries:

- Workflows own command execution, concurrency, timeout, cancellation, retry,
  command status, diagnostics, history, snapshot, and restore for one
  workflow.
- Supervisors own persistence policy, recovery policy, aggregate diagnostics,
  startup restore, and multi-workflow coordination.
- IndexedDB is a built-in durable browser storage adapter for supervisor
  snapshots only. It is not an in-memory coordination primitive.
- Web workers are future execution boundaries for hosting work off the UI
  thread.
- Service workers own offline/cache/request-queue behavior. They may be called
  from workflow commands as activity boundaries, but they do not own the
  in-page supervisor or live workflow instances.

## Advanced State Engine Contract

`WorkflowStateEngine`, `WorkflowStateEngineContext`, and
`WorkflowStateEngineFactory` are extension APIs for package authors that need to
host workflow mode transitions behind a custom engine. Ordinary applications
should author `states` and let the built-in `$machine` adapter handle the
state-tree execution.

Custom engines must preserve the public workflow invariants: readonly observed
mode, reactive workflow data, explicit `send()`, snapshot/restore support, and
no hidden command execution.

## Worker Adapter Contract

The worker adapter is optional transport glue for hosting workflow instances
behind a `WorkerConnection`. It is not required by `$workflow`, and the
supervisor remains the page-side owner of persistence and recovery decisions.

Host side:

```ts
const host = createWorkflowWorkerHost({
  workflows: {
    build: buildWorkflow,
  },
});

self.onmessage = (event) => {
  void host.handle(event.data, (message) => {
    self.postMessage(message);
  });
};
```

Page side:

```ts
const client = createWorkflowWorkerClient(connection);

const result = await client.run<{ file: string }>(
  "build",
  "compile",
  "index.html",
);

const snapshot = await client.snapshot();
```

Protocol rules:

- requests use stable ids and one of `"run"`, `"send"`, `"snapshot"`, or
  `"restore"`
- responses return either a result or a workflow diagnostic error
- snapshot messages can be published after mutating requests
- messages must stay structured-cloneable
- page-side recovery restores snapshots explicitly after worker restart

Example module registration:

```ts
app.workflowSupervisor("docsSupervisor", {
  id: "docs-supervisor",
  workflows: {
    build: buildWorkflowConfig,
    publish: publishWorkflowConfig,
  },
  persistence: indexedDbWorkflowSupervisorPersistence({
    database: "docs-workflows",
    store: "supervisorSnapshots",
  }),
  persistencePolicy: "after-command",
  recovery: {
    restoreOnStart: true,
  },
});
```

When `restoreOnStart` is enabled, supervisor construction remains synchronous.
The supervisor starts its persisted load immediately and exposes the async
boundary as `supervisor.ready`. Await `ready` before reading restored workflow
state. Startup load failures do not throw from construction; they are recorded
as supervisor diagnostics and leave `status` as `"failed"`.

Prefer workflow handles when writing application code:

```ts
const build = supervisor.workflow("build");

await build.run("compile", "index.html");
build.send("complete", { output: "index.html" });
```

The matching runtime coverage lives in:

- named supervisor registration:
  `workflow.spec.ts` `"registers named workflow supervisors as singleton injectables"`
- IndexedDB persistence:
  `workflow.spec.ts` `"saves, loads, and removes workflow supervisor snapshots through IndexedDB"`
- multi-workflow recovery:
  `workflow.spec.ts` `"recovers multiple workflow supervisor workflows from recoverable failures"`
- worker adapter command delegation:
  `workflow.spec.ts` `"runs workflow commands through the workflow worker adapter"`
- worker adapter event delegation:
  `workflow.spec.ts` `"sends workflow events through the workflow worker adapter"`
- worker adapter restart recovery:
  `workflow.spec.ts` `"restores worker-hosted workflows from supervisor snapshots after restart"`
- worker adapter type contract:
  `workflow-types.spec.ts` `"typechecks the workflow worker adapter contract"`

## Native Interop

- `$workflow` is a pure AngularTS runtime abstraction built on the workflow
  state-engine contract. The default adapter uses `$machine`.
- Native browser primitives used directly are `AbortController`, `AbortSignal`,
  promises, and `structuredClone()`.
- Browser side effects belong in commands or workflow activities. The command
  context passes an abort signal and cleanup registration so callers can wire
  HTTP, storage, workers, timers, or service workers without `$workflow`
  depending on those services.

## Edge Cases

- Empty command names fail with `workflow.invalidCommand`.
- Missing command handlers fail with `workflow.missingCommand`.
- Invalid command options fail with `workflow.invalidCommandOptions`.
- Invalid workflow transitions append `workflow.invalidTransition`
  diagnostics.
- Timeout and cancellation resolve failed command results with diagnostics.
- Cleanup exceptions are converted to diagnostics when the command result is
  still being recorded.
- Snapshot restore requires version `1` and a matching workflow id, unless a
  configured migration returns a valid v1 snapshot.
- History ids restored from snapshots are normalized to unique positive
  integers.
- Bounded history and diagnostics trim older entries after appends and restore.

## Destruction And Cleanup

Workflows do not get destroyed with observing scopes. Scope binding cleanup is
opportunistic, like machines. Command cleanup is explicit per run: every command
context receives `cleanup(callback)`, and callbacks run when the run settles,
times out, or is cancelled. `restore()` cancels running commands, clears queues,
and prevents cancelled continuations from writing stale results.

## Types And Interfaces

`Workflow`
: Public runtime API for mode reads, reactive data, command execution,
diagnostics, history, snapshots, and recovery.

`WorkflowConfig`
: Public definition for workflow id, initial mode, data, state-tree events,
commands, limits, timeout, concurrency, and snapshot migration.

`WorkflowCommand`
: Context-object command handler signature. It may return a plain output, a
normalized result, or a promise for either.

`WorkflowCommandContext`
: Runtime context passed to every command, including its typed `input` field.

`WorkflowDiagnostic`
: JSON-oriented diagnostic shape used for validation failures, command
failures, cleanup failures, timeout, cancellation, and restore issues.

`WorkflowHistoryEntry`
: Bounded lifecycle evidence record for command start, completion, and failure.

`WorkflowRunState`
: Internal record for one active command's cancellation, cleanup, and stale
write guards.

## Test Harness

- `workflow.spec.ts` is the deterministic runtime harness and covers commands,
  diagnostics, history, retry, restore, cancellation, concurrency,
  timeouts, cleanup, and scope binding.
- `workflow-types.spec.ts` is the public TypeScript contract harness for strict
  events, commands, inputs, and outputs.
- `workflow.test.ts` is the browser-facing harness for examples and template
  integration.
- Workflow UI fragment tests live in `workflow.spec.ts` until a public workflow
  directive or view API exists.
- Add supervisor and persistence fixtures outside `$workflow`; workflow tests
  should keep the command/runtime contract independent of durable storage.

## Testing Notes

- `workflow.spec.ts` covers runtime behavior, commands, diagnostics, retry,
  restore, cancellation, concurrency, timeouts, limits, cleanup, and
  scope binding.
- `workflow-types.spec.ts` covers strict TypeScript event, command, input, and
  output typing.
- `workflow.test.ts` covers browser-facing examples and template integration.
- Add focused tests when changing command ordering, cancellation semantics,
  snapshot normalization, queue invalidation, or TypeScript generic defaults.
