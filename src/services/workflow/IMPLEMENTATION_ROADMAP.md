# Workflow Implementation Roadmap

Goal: add a first-party `$workflow` service for agent-readable workflows that
can be run, inspected, repaired, repeated, persisted, and diagnosed. `$workflow`
is built on `$machine`; it does not replace `$machine` or add workflow behavior
to scope/DI internals.

## Working Rules

- [x] Keep `$machine` small. `$workflow` composes `$machine` for mode and
      transition correctness.
- [x] Make `$workflow` injectable as `$workflow`.
- [x] Support named injectable workflows through `module.workflow(name, config)`.
- [x] Keep provider-level configuration out of v1 unless a concrete global
      policy appears. Workflow behavior belongs in each `WorkflowConfig`.
- [x] Every public type added to the namespace must have a matching type test.
- [x] Every documentation example must have an executable test.
- [x] JSON snapshots must be versioned and stable.
- [x] Diagnostics must be structured, stable, and safe to serialize.
- [x] External effects must run through explicit command boundaries.
- [x] Failures must be recoverable by default: capture diagnostics, preserve
      state, and allow repair/retry/repeat where configured.

## Baseline

- [x] Capture existing machine and module registration surfaces.

  ```sh
  rg -n "Machine|\\$machine|module\\.machine|NgModule|InvokeQueueItem" \
    src/services/machine src/core/di/ng-module src/index.ts src/namespace.ts \
    @types docs/content/docs/service
  ```

- [ ] Run the current gates before adding `$workflow`.

  ```sh
  make check
  make test-namespace-js
  git diff --check
  ```

## Slice 1: Public Contract And Types

Define the v1 API before implementation.

- [x] Add `src/services/workflow/workflow.ts`.
- [x] Add public types:
      `WorkflowMode`, `WorkflowStatus`, `WorkflowDiagnostic`,
      `WorkflowCommand`, `WorkflowCommandContext`, `WorkflowCommandResult`,
      `WorkflowConfig`, `WorkflowSnapshot`, `WorkflowHistoryEntry`,
      `Workflow`, `WorkflowService`, and `WorkflowProvider`.
- [x] Define workflow status separately from machine mode only if needed. Prefer
      terse mode names and avoid duplicate state fields.
- [x] Define stable diagnostics:

  ```ts
  interface WorkflowDiagnostic {
    code: string;
    message: string;
    recoverable?: boolean;
    path?: string;
    command?: string;
    detail?: unknown;
  }
  ```

- [x] Define command result:

  ```ts
  type WorkflowCommandResult<TOutput = unknown> =
    | { ok: true; output?: TOutput; diagnostics?: WorkflowDiagnostic[] }
    | { ok: false; diagnostics: WorkflowDiagnostic[] };
  ```

- [x] Add type tests for TS and JSDoc namespace usage.

Gate:

```sh
./node_modules/.bin/tsc --noEmit --project tsconfig.json
./node_modules/.bin/tsc --project tsconfig.test.json
make test-namespace-js
```

## Slice 2: Injectable Service Skeleton

Add the service without command execution first.

- [x] Register `$workflow` in the same provider group as `$machine`.
- [x] Implement `WorkflowProvider` with no provider-level config.
- [x] Implement `WorkflowService(config)` and optional
      `WorkflowService(scope, config)` overloads matching `$machine` ergonomics.
- [x] Internally create a `$machine` instance with workflow-owned data.
- [x] Expose basic methods:
      `current`, `data`, `diagnostics`, `history`, `send`, `can`, `matches`,
      `snapshot`, and `restore`.
- [x] Add runtime tests proving workflow instances are reactive in templates.
- [x] Add tests proving scope destruction does not destroy the workflow when
      another scope observes it.

Gate:

```sh
npx playwright test src/services/workflow/workflow.spec.ts
./node_modules/.bin/tsc --project tsconfig.test.json
make check
```

## Slice 3: Named Module Registration

Make workflows injectable by name.

- [x] Add `NgModule.workflow(name, config)`.
- [x] Queue named workflows through `$workflow` at runtime, mirroring
      `module.machine(...)`.
- [x] Add `ng.WorkflowConfig` and `ng.Workflow` namespace tests.
- [x] Add tests proving named workflows are singleton injectables.
- [x] Add tests proving named workflows can be used by multiple directives or
      controllers without tying lifetime to the first scope.

Gate:

```sh
npx playwright test src/core/di/ng-module/ng-module.spec.ts
npx playwright test src/services/workflow/workflow.spec.ts
make test-namespace-js
make check
```

## Slice 4: Command Boundaries

Commands are the workflow-specific layer above `$machine`.

- [x] Add `commands` to `WorkflowConfig`.
- [x] Implement `run(commandName, input?)`.
- [x] Commands may be sync or async, but workflow state changes around command
      start/complete/fail must be deterministic.
- [x] Capture command history with stable boundaries:
      `command.started`, `command.completed`, `command.failed`.
- [x] Convert thrown values into `WorkflowDiagnostic[]`.
- [x] Preserve partial workflow data mutations. Do not add rollback semantics.
- [x] Add tests for sync command success, async command success, thrown errors,
      rejected promises, and malformed command results.

Gate:

```sh
npx playwright test src/services/workflow/workflow.spec.ts
./node_modules/.bin/tsc --project tsconfig.test.json
make check
```

## Slice 5: Diagnostics And Failure Modes

Make failures inspectable and repairable.

- [x] Normalize every failure to stable `WorkflowDiagnostic` objects.
- [x] Add `lastError` or `lastDiagnostics` only if needed; prefer
      `diagnostics` plus history.
- [x] Add `clearDiagnostics()` and `addDiagnostic()` only if real examples need
      manual control.
- [x] Add `recoverable` semantics for retry/repair decisions.
- [x] Add tests proving diagnostics are JSON-serializable.
- [x] Add tests proving missing commands and invalid transitions return stable
      diagnostics instead of throwing where recoverable.

Gate:

```sh
npx playwright test src/services/workflow/workflow.spec.ts
make check
```

## Slice 6: Snapshot, Restore, Repeat

Snapshots are the agent handoff format.

- [x] Define `WorkflowSnapshot` with a version field:

  ```ts
  interface WorkflowSnapshot<TData = Record<string, unknown>> {
    version: 1;
    id: string;
    current: string;
    data: TData;
    diagnostics: WorkflowDiagnostic[];
    history: WorkflowHistoryEntry[];
  }
  ```

- [x] Implement `snapshot()`.
- [x] Implement `restore(snapshot)`.
- [x] Implement `repeat()` only if it can be defined without hidden policy;
      otherwise document repeat as a transition users configure.
- [x] Add tests for restore from failed, complete, and repaired workflows.
- [x] Add tests for snapshot version mismatch diagnostics.

Gate:

```sh
npx playwright test src/services/workflow/workflow.spec.ts
make check
```

## Slice 7: Repair And Retry

Add agent-friendly recovery helpers without inventing a planner.

- [x] Add `retry(commandName?)` if the command boundary history can identify a
      previous failed command unambiguously.
- [x] Add `repair(input?)` only as a configured command/transition convention,
      not as magic built-in behavior.
- [x] Add tests for:
      failed -> repair -> running -> complete,
      failed -> retry -> complete,
      failed -> reset -> idle.
- [x] Ensure repair/retry preserve diagnostics and append history rather than
      deleting evidence.

Gate:

```sh
npx playwright test src/services/workflow/workflow.spec.ts
make check
```

## Slice 8: Documentation

Document the feature as first-party Angular.ts orchestration built on
`$machine`.

- [x] Add `docs/content/docs/service/workflow.md`.
- [x] Add examples for:
      local workflow,
      named injectable workflow,
      command failure diagnostics,
      snapshot/restore,
      repair/retry.
- [x] Add a short comparison with `$machine`: `$machine` controls modes;
      `$workflow` controls commands, diagnostics, snapshots, and recovery.
- [x] Add every docs example to a matching executable spec.

Gate:

```sh
npx playwright test src/services/workflow/workflow.spec.ts
make docs-check
make check
```

## Slice 9: Namespace And Integrations

Public types must not outrun generated integrations.

- [x] Export workflow types from `src/index.ts`.
- [x] Add namespace aliases in `src/namespace.ts`.
- [x] Regenerate types.
- [x] Update JavaScript namespace consumer tests.
- [x] Update Closure, Dart, Kotlin, Gleam, Rust Wasm, and Go Wasm parity.
- [x] Decide whether Wasm bindings expose workflow as native facades now or
      explicitly defer with rationale.

Gate:

```sh
make types
make test-namespace-js
make -C integrations/closure closure-generate
make -C integrations/closure closure-validate
make -C integrations/dart generate
make -C integrations/dart generate-check
make -C integrations/kotlin generate
make -C integrations/kotlin generate-check
make -C integrations/gleam check
make -C integrations/wasm/rust check
make -C integrations/wasm/go check
make check
```

## Slice 10: Production Readiness

- [x] Add edge-case tests for concurrent async command completions.
- [x] Add cancellation policy, or explicitly defer cancellation with docs.
- [x] Add history size policy, or explicitly document unbounded v1 history.
- [x] Add malformed restore tests.
- [x] Add command result schema tests.
- [x] Add examples proving an agent can inspect JSON, repair, and rerun a
      workflow without ad hoc parsing.
- [x] Keep public command history JSON-safe while preserving live retry/repeat
      inputs.
- [x] Normalize restored diagnostics and history so external snapshots cannot
      reintroduce non-serializable public workflow state.
- [x] Normalize restored history IDs to unique positive integers so replay
      bookkeeping cannot collide.
- [x] Make TypeScript workflow definitions strict by default; use
      `WorkflowCommandMap` only for intentionally dynamic command names.
- [x] Confirm no workflow API leaks internal machine fields or methods into
      docs.

Final gate:

```sh
make check
make test
make build
make test-namespace-js
git diff --check
```
