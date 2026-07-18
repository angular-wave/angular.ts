# Workflow

This module implements declarative asynchronous command lifecycles.

## Responsibilities

- Validate workflow and command lifecycle definitions.
- Gate commands by their declared source states.
- Apply pending, success, failure, cancellation, and timeout transitions.
- Keep command execution data readonly and lifecycle update data writable.
- Enforce command concurrency, retry, timeout, and cancellation declarations.
- Record bounded diagnostics and command history.
- Snapshot and restore workflow state.
- Bind workflow state and data to observing scopes.
- Supervise persistence and recovery across named workflows.
- Transport run, snapshot, and restore operations through Worker connections.

## Runtime Boundary

A workflow is not a public state-machine adapter. It exposes commands through
`can()` and `run()`. The runtime owns all state transitions. `$machine` remains
the synchronous event-driven primitive.

Command handlers perform operations and return output. They cannot mutate live
workflow data or request state transitions. Lifecycle `update` callbacks are
the mutation boundary.

## Files

- `workflow.ts`: command lifecycle runtime, snapshots, supervision, and
  persistence.
- `worker-adapter.ts`: optional Worker host and client transport.
- `workflow-ui-fragment.ts`: bounded incremental DOM fragment ownership.
- `workflow.spec.ts`: runtime behavior and browser integration tests.
- `workflow-types.spec.ts`: compile-time API and inference tests.
- `workflow.test.ts`: Playwright bridge for the Jasmine browser suite.
- `workflow.html`: Jasmine test harness.

## Validation

Run formatting, lint, and checks before the browser suite:

```sh
make format
make lint-check
make check
npx playwright test src/services/workflow/workflow.test.ts
```
