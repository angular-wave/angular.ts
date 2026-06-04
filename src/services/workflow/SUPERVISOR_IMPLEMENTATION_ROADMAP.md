# Workflow Supervisor Implementation Roadmap

This roadmap is executable: each slice ends with concrete acceptance checks.
Complete slices in order. Do not implement worker or service-worker adapters until
the in-page supervisor contract is stable.

## Goal

Add a workflow supervisor abstraction that turns existing `$workflow` recovery
primitives into an operational recovery layer.

The supervisor composes workflows. It does not replace `$workflow`, change command
semantics, or own durable distributed execution.

## Non-Goals

- Do not make workflows depend on supervisors.
- Do not make supervisors a second workflow engine.
- Do not run workflows inside service workers.
- Do not add built-in localStorage persistence in v1.
- Do not add Web Worker host/client support in v1.
- Do not implement exactly-once side effects or rollback semantics.

## Temporal-Inspired Model

Borrow Temporal's separation of concerns, not its distributed runtime.

Concepts worth borrowing:

- Workflow vs activity split: workflows coordinate modes, data, commands,
  diagnostics, and history; activities are named side-effect boundaries such as
  HTTP calls, storage writes, worker calls, or service-worker queue requests.
- History as evidence: supervisor recovery decisions should be based on
  structured workflow history and diagnostics, not hidden mutable flags.
- Retry policy: retries should be explicit, bounded, and based on diagnostic
  codes or recoverability flags.
- Cancellation: cancellation should propagate through existing workflow
  `AbortSignal` support and be recorded as diagnostics/history.
- Signals and queries: workflow `send()` is the signal-like API; `snapshot()`,
  `status`, and aggregate diagnostics are query-like APIs.
- Supervisor ownership: the supervisor owns persistence and recovery policy,
  while workflows own command execution semantics.

Concepts not worth borrowing for AngularTS v1:

- Deterministic replay of workflow code.
- Durable server-side execution.
- Exactly-once side effects.
- Full event sourcing.
- Worker/task queues in core.
- Temporal-compatible APIs or terminology where AngularTS already has clearer
  names.

## Slice 1: Public Contract

Add types only.

- `WorkflowSupervisor`
- `WorkflowSupervisorConfig`
- `WorkflowSupervisorSnapshot`
- `WorkflowSupervisorPersistence`
- `WorkflowSupervisorRecoveryPolicy`
- `WorkflowSupervisorDiagnostic`
- `WorkflowSupervisorStatus`

Initial API:

```ts
supervisor.id;
supervisor.status;
supervisor.diagnostics;
supervisor.workflow(name);
supervisor.run(workflowName, commandName, input?, options?);
supervisor.send(workflowName, eventName, payload?);
supervisor.cancel(workflowName, commandName?);
supervisor.cancelAll();
supervisor.snapshot();
supervisor.restore(snapshot);
supervisor.persist();
supervisor.load();
supervisor.recover();
```

Acceptance:

- Add type tests for workflow names.
- Add type tests for command names when configs are strict.
- Add namespace exports for all public supervisor types.
- Run:

```bash
./node_modules/.bin/tsc --project tsconfig.test.json
make test-namespace-js
```

## Slice 2: Service Skeleton

Add `src/services/workflow-supervisor` or a sibling module under
`src/services/workflow/supervisor.ts`. Prefer a sibling module if it can avoid
duplicating workflow internals.

Provider:

```ts
class WorkflowSupervisorProvider {
  $get = [
    "$workflow",
    ($workflow) => (config) => createWorkflowSupervisor($workflow, config),
  ];
}
```

Config should accept:

- existing workflow instances
- workflow configs that the supervisor creates through `$workflow`

Acceptance:

- Creates supervisor from existing workflow instances.
- Creates supervisor from workflow configs.
- Rejects duplicate/empty workflow names.
- Rejects missing supervisor id.
- Run:

```bash
npx playwright test src/services/workflow/workflow.test.ts
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 3: Command Delegation

Implement delegation without persistence.

Rules:

- `run(name, command, input, options)` delegates to the named workflow.
- `send(name, event, payload)` delegates to the named workflow.
- `cancel(name, command?)` delegates to one workflow.
- `cancelAll()` delegates to all workflows.
- Unknown workflow names return diagnostics or throw consistently. Prefer failed
  command-style diagnostics for async operations and thrown configuration errors
  for construction-time issues.

Acceptance:

- Delegates `run` and returns the workflow result unchanged.
- Delegates `send` and returns the workflow boolean unchanged.
- Delegates `cancel` and `cancelAll` with counts.
- Unknown workflow names produce stable supervisor diagnostics.
- Run:

```bash
npx playwright test src/services/workflow/workflow.test.ts
```

## Slice 4: Supervisor Snapshot

Snapshot shape:

```ts
{
  version: 1,
  id: string,
  status: "idle" | "running" | "recovering" | "failed",
  workflows: {
    [name: string]: WorkflowSnapshot
  },
  diagnostics: WorkflowSupervisorDiagnostic[],
  updatedAt: number
}
```

Rules:

- Snapshot every known workflow by calling `workflow.snapshot()`.
- Snapshot supervisor diagnostics as JSON-safe values.
- `restore(snapshot)` validates version and supervisor id.
- Known workflow snapshots restore their matching workflow.
- Unknown workflow snapshot names become supervisor diagnostics.
- Missing workflow snapshot entries leave current workflows unchanged in v1.

Acceptance:

- Snapshots multiple workflows.
- Restores multiple workflows.
- Rejects malformed supervisor snapshots.
- Rejects mismatched supervisor ids.
- Records unknown snapshot workflow names as diagnostics.
- Leaves missing workflow snapshots unchanged.
- Run:

```bash
npx playwright test src/services/workflow/workflow.test.ts
```

## Slice 5: Persistence Adapter

Adapter:

```ts
interface WorkflowSupervisorPersistence {
  load(id: string): Promise<unknown | undefined>;
  save(id: string, snapshot: unknown): Promise<void>;
  remove?(id: string): Promise<void>;
}
```

Rules:

- `persist()` saves `snapshot()`.
- `load()` loads and restores when a snapshot exists.
- V1 includes an IndexedDB persistence adapter as the built-in browser durable
  storage option.
- Other storage backends can implement the same adapter contract.
- Persistence failures append supervisor diagnostics and rethrow only for explicit
  calls. Automatic persistence should record diagnostics without breaking the
  original workflow command result.

Built-in IndexedDB adapter candidate:

```ts
indexedDbWorkflowSupervisorPersistence({
  database: "angular-ts-workflows",
  store: "supervisorSnapshots",
  version: 1,
});
```

IndexedDB rules:

- One object store keyed by supervisor id is enough for v1 snapshot persistence.
- Values are stored as structured-cloneable supervisor snapshots.
- Open, upgrade, read, write, and delete failures become supervisor diagnostics.
- Do not keep transactions open across workflow command execution.
- Do not use IndexedDB as an in-memory coordination primitive.

Acceptance:

- Saves snapshot through adapter.
- Loads and restores snapshot through adapter.
- Handles missing persisted snapshot.
- Records save failures.
- Records load failures.
- Saves and loads through the built-in IndexedDB adapter.
- Creates the IndexedDB database and object store on first use.
- Deletes persisted snapshots when `remove()` is available and called.
- Run:

```bash
npx playwright test src/services/workflow/workflow.test.ts
```

## Slice 6: Persistence Policy

Policy:

```ts
type WorkflowSupervisorPersistPolicy = "manual" | "after-command";
```

Rules:

- Default is `"manual"`.
- `"after-command"` persists after `supervisor.run(...)` settles.
- Do not add `"after-change"` until workflows expose an explicit change
  subscription API.

Acceptance:

- Manual policy does not save after commands.
- After-command policy saves after success.
- After-command policy saves after failed workflow results.
- Persistence failure does not replace the original command result.
- Run:

```bash
npx playwright test src/services/workflow/workflow.test.ts
```

## Slice 7: Recovery Policy

Policy:

```ts
interface WorkflowSupervisorRecoveryPolicy {
  restoreOnStart?: boolean;
  retryRecoverable?: boolean;
}
```

Rules:

- `restoreOnStart` loads persisted state during supervisor creation only if the
  service can expose an async-ready boundary. If not, defer this to an explicit
  `load()` call in v1.
- `recover()` is explicit.
- `retryRecoverable` retries the latest failed command for workflows that have a
  recoverable diagnostic.
- Do not auto-retry by default.

Acceptance:

- `recover()` does nothing by default.
- `recover()` retries recoverable failed commands only when enabled.
- Non-recoverable failures are not retried.
- Recovery diagnostics include workflow name and command name.
- Run:

```bash
npx playwright test src/services/workflow/workflow.test.ts
```

## Slice 8: Module Registration

Add module sugar only after service behavior is tested.

Candidate:

```ts
app.workflowSupervisor("sessionSupervisor", {
  workflows: {
    session: sessionWorkflowConfig,
    sync: syncWorkflowConfig,
  },
});
```

Rules:

- Use the same dynamic config resolution pattern as `.workflow()`, `.machine()`,
  `.sse()`, `.websocket()`, `.webTransport()`, `.worker()`, and `.wasm()`.
- Update Closure, ClojureScript, Dart, Gleam, Kotlin, and namespace generated
  surfaces.

Acceptance:

- Module registration creates injectable supervisor.
- Dynamic supervisor config can resolve through DI.
- All generated language checks pass.
- Run:

```bash
make generated-check
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 9: Documentation

Docs must clearly distinguish the layers:

- Workflow: command execution, diagnostics, history, snapshot/restore for one
  workflow.
- Supervisor: persistence policy, recovery policy, aggregate diagnostics,
  multi-workflow coordination.
- IndexedDB: v1 built-in durable browser storage for supervisor snapshots.
- Web Worker adapter: future transport for hosting workflows off the UI thread.
- Service worker: offline/cache/request-queue support, not the in-memory
  supervisor.

Acceptance:

- Add service docs page or workflow docs section.
- Add IndexedDB persistence adapter example.
- Add multi-workflow recovery example.
- Add service-worker positioning note.
- Every executable example has a matching test.
- Run:

```bash
make docs-examples-check
npx playwright test src/services/workflow/workflow.test.ts
```

## Slice 10: Future Worker Adapter

Do not start this slice until the in-page supervisor is stable.

Candidate APIs:

```ts
createWorkflowWorkerHost({ workflows });
createWorkflowWorkerClient(connection);
```

Rules:

- Build on `WorkerConnection`.
- Use request ids.
- Use structured-cloneable messages.
- Publish workflow snapshots back to the page.
- Supervisor owns recovery decisions on the page side.

Acceptance:

- Worker-hosted workflow can run a command.
- Worker-hosted workflow can send events.
- Worker-hosted workflow publishes snapshots.
- Worker restart can be recovered by restoring a supervisor snapshot.

## Final Readiness Gate

Run before marking the supervisor production-ready:

```bash
make check
make coverage-check
npx playwright test src/services/workflow/workflow.test.ts
```

Supervisor is production-ready only when:

- public types are strict by default
- all examples are test-backed
- generated language facades are fresh
- restore and persistence failures are deterministic
- no supervisor behavior depends on service worker lifetime
- worker support, if added, remains a transport adapter
