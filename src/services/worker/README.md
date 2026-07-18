# Worker Service

`$worker` wraps page-owned Web Workers as managed AngularTS service
connections. It is for background computation owned by the current page, not
browser-level page control. Service workers stay separate under
`src/services/service-worker`.

## Public Surface

- `$worker(scriptPath, config?)`: creates a managed module `Worker`.
- `WorkerConfig`: optional callbacks and lifecycle policy.
- `WorkerConnection`: managed connection with `postMessage`, `onMessage`,
  `restart`, and `terminate`.
- `createWorkerConnection(scriptPath, config?)`: testable factory used by the
  provider.

## Lifecycle Contract

- Construction creates a native `Worker` immediately with `{ type: "module" }`.
- `postMessage(data)` sends to the current native worker.
- `onMessage(listener)` subscribes without mutating connection state and returns
  a disposer.
- `restart()` terminates the current worker and creates a replacement unless the
  connection was already terminated.
- `terminate()` is idempotent. It clears managed listeners and native event
  handlers, marks the connection permanently terminated, and calls the native
  worker's `terminate()` once.
- Connections created through injected `$worker` are terminated when their
  owning `AppContext` is destroyed.
- The service does not bind connections to individual DOM scopes. Callers and
  directives should still call `terminate()` when a connection has a shorter
  lifetime than the application.

## Policy Contract

Current defaults:

- `autoRestart: false`
- JSON string message parsing with fallback to raw strings
- an empty `onError` callback
- `$log` and `$exceptionHandler` from dependency injection when called through
  `$worker`

Call-site config can provide an initial message listener and override error,
restart, and message-transform behavior. Scope or directive owners should call
`terminate()` when their connection lifetime ends before application teardown.

## Failure Contract

- Missing script paths throw synchronously with `Worker script path required`.
- Native worker `error` events call `onError`.
- If `autoRestart` is enabled, native worker errors restart the underlying
  worker after `onError`.
- Message transform exceptions are swallowed and the original message payload is
  delivered.
- Posting after `terminate()` logs `Worker already terminated` and still attempts
  to call the native worker. Native `postMessage` failures are logged as
  `Worker post failed`.
- `restart()` after `terminate()` logs `Worker cannot restart after terminate`
  and does not create a replacement worker.

## Reactivity Contract

`$worker` is callback-driven and does not expose reactive status today. Worker
state should become reactive only if AppContext ownership and template use cases
justify it. Until then, directives may project results into scope while the
service remains DOM-independent.

## Recovery Contract

Recovery is in-memory and connection-local. `autoRestart` replaces the native
worker after an error, but AngularTS does not replay messages, restore worker
internal state, or persist worker progress. Applications should use workflow or
supervisor policy when work must be resumable or durable.

## Scheduling And Ordering

Native worker `message` and `error` events drive callback order. `restart()`
and `autoRestart` replace the worker synchronously after termination. There is
no hidden retry timer, polling loop, or queue.

## Native Interop

The service intentionally keeps the native `Worker` object private. The stable
interop boundary is `postMessage`, `restart`, `terminate`, `onMessage`,
`onError`, and
`transformMessage`. Exposing the native worker remains a future policy decision
because it would let application code bypass cleanup and restart semantics.

## Dependency Replacement Contract

`$worker` replaces repeated app boilerplate around module worker construction,
message parsing, error callbacks, restart-on-error behavior, and termination.
It does not replace worker script authoring, transferable-object design,
durable job queues, or service worker lifecycle.

## Composition Contract

- Lower-level: native `Worker`, `postMessage`, `message`, `error`, and
  `terminate`.
- Same layer: `ng-worker` directive owns DOM-triggered worker execution and
  result projection.
- Higher-level: workflows and supervisors may use `$worker` as an execution
  activity, but durable retry/replay policy stays with workflow/supervisor.
- Separate layer: `$serviceWorker` will own browser-controlled registration,
  update, controller-change, and app-to-service-worker messaging.

## Test Harness

- `src/services/worker/worker.spec.ts` replaces `window.Worker` with a fake
  module worker.
- Tests cover script validation, message posting, default JSON parsing,
  transform fallback, error callbacks, configured restart, termination,
  post-after-terminate behavior, failed `postMessage`, dependency injection,
  and application-owned teardown.
- `src/services/worker/worker.test.ts` runs the Jasmine suite through
  Playwright.
