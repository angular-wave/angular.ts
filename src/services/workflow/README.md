# Workflow Internals

This directory owns AngularTS inspectable command workflows. The implementation
in `workflow.ts` is centered on a `$machine` instance plus command execution
state, diagnostics, bounded history, snapshots, restore, retry, and repeat.

## Responsibilities

- Create reactive workflows from `$workflow(config)` and `$workflow(scope,
config)`.
- Delegate legal mode transitions to `$machine`.
- Run named synchronous or asynchronous commands with normalized results.
- Convert thrown command failures into structured diagnostics.
- Track command history for inspection, retry, repeat, and snapshots.
- Enforce command concurrency, timeout, cancellation, and cleanup policies.
- Restore workflows from versioned snapshots and cancel stale work.

## Public Surface

- `WorkflowProvider`: registers `$workflow` as an injectable service backed by
  `$machine`.
- `defineWorkflow(config)`: preserves strict generic inference for workflow
  definitions.
- `defineCommand(command)`: preserves strict generic inference for command
  handlers.
- `WorkflowService`: callable service type for creating workflows.
- `Workflow`: runtime object exposed to controllers, scopes, and templates.
- `WorkflowConfig`: configuration shape for identity, mode data, transitions,
  commands, and production policies.
- `WorkflowSnapshot`: durable JSON-oriented state shape.

Public methods and values exposed to callers include `id`, `current`, `data`,
`diagnostics`, `history`, `send()`, `can()`, `matches()`, `run()`, `retry()`,
`repeat()`, `cancel()`, `snapshot()`, and `restore()`.

## Core Model

Each workflow wraps one machine created from the workflow's `initial`, `data`,
and `transitions`. The workflow target exposes machine mode and data through
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

- `run()`, `retry()`, and `repeat()` always return promises.
- Unknown commands and invalid options produce failed results, not thrown
  exceptions.
- Command mutations are not rolled back when a command fails.
- Restore is a hard recovery boundary: queued work is invalidated and running
  work is cancelled.
- Late command continuations from cancelled runs must not append history or
  write through the workflow-provided command data/context after restore.

## Lifecycle

`$workflow(config)` creates an unbound workflow target. Assigning it to a
controller or scope property lets scope proxies bind through `SCOPE_PROXY_BIND`.
`$workflow(scope, config)` immediately returns a scope proxy when the supplied
scope has a handler.

Workflow bindings mirror machine bindings and are keyed by scope id. Destroyed
scope bindings are removed during scheduling and active-binding lookup. The
workflow instance is not owned by any one observing scope and can keep running
after an observer is destroyed.

## Scheduling And Ordering

- `send()` delegates to the machine synchronously and schedules workflow
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
  and repeat before snapshot restore.
- `queueGeneration`: monotonic restore boundary used to invalidate queued work.
- `bindings`: maps observing scope ids to workflow bindings.

## Integration Points

- `$machine`: owns mode transition behavior, reactive data, and machine
  snapshots.
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
: Public definition for workflow id, initial mode, data, transitions, commands,
limits, timeout, concurrency, and snapshot migration.

`WorkflowCommand`
: Command handler signature. It receives command context and may return a plain
output, a normalized result, or a promise for either.

`WorkflowCommandContext`
: Runtime context passed to commands, including workflow, data, input, command
name, cleanup registration, and abort signal.

`WorkflowDiagnostic`
: JSON-oriented diagnostic shape used for validation failures, command
failures, cleanup failures, timeout, cancellation, and restore issues.

`WorkflowHistoryEntry`
: Bounded lifecycle evidence record for command start, completion, and failure.

`WorkflowRunState`
: Internal record for one active command's cancellation, cleanup, and stale
write guards.

## Testing Notes

- `workflow.spec.ts` covers runtime behavior, commands, diagnostics, retry,
  repeat, restore, cancellation, concurrency, timeouts, limits, cleanup, and
  scope binding.
- `workflow-types.spec.ts` covers strict TypeScript event, command, input, and
  output typing.
- `workflow.test.ts` covers browser-facing examples and template integration.
- Add focused tests when changing command ordering, cancellation semantics,
  snapshot normalization, queue invalidation, or TypeScript generic defaults.
