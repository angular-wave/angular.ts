# Service Worker Implementation Roadmap

This roadmap is executable: each slice ends with concrete acceptance checks.
Complete slices in order. Keep the first implementation focused on service
worker lifecycle and app-to-worker messaging. Do not fold service workers into
`$worker`, and do not make `$rest` depend on service workers.

Use `src/services/SERVICE_CONTRACTS.md` as the stability gate for every slice
that adds runtime behavior. The service worker README must explicitly document
its lifecycle, reactivity, policy, failure, recovery, scheduling, native
interop, and test harness contracts before the service is marked stable.

## Goal

Add a small AngularTS service worker abstraction for applications that want
first-class registration, update state, controller changes, and message
exchange through dependency injection.

The service should wrap browser service worker lifecycle APIs. It should not
generate service worker scripts, own application cache policy, or replace the
existing REST cache backend seam.

The service should expose useful lifecycle state reactively and provide
sensible defaults for registration/update observation while leaving risky user
experience policy, such as when to activate a waiting worker or reload the
page, explicit.

The dependency-replacement target for v1 is service-worker registration,
update, controller-change, and messaging glue. It is not a Workbox replacement
for precache generation. It should compose with `$rest`, `$workflow`, and future
supervisors through explicit adapters rather than becoming a hidden dependency
of those services.

## Non-Goals

- Do not extend `$worker`; Web Workers and service workers have different
  lifetimes, ownership, and control semantics.
- Do not make `$http` or `$rest` automatically route through a service worker.
- Do not implement a full PWA framework in v1.
- Do not generate or bundle service worker source code in v1.
- Do not add background sync, periodic sync, push, or notification support in
  v1.
- Do not assume a service worker is available in all browsers, test runners, or
  file-based examples.
- Do not hide service worker update rules behind synchronous APIs.

## Existing Boundaries

AngularTS already has adjacent abstractions:

- `$worker`: creates page-owned Web Workers with `post()`, `restart()`, and
  `terminate()`.
- `$rest`: supports `RestBackend`, `RestCacheStore`, and `CachedRestBackend`
  for cache-first, network-first, and stale-while-revalidate reads.
- persistent stores: own application state persistence.
- `$workflow`: owns command execution, diagnostics, snapshots, and recovery.

The service worker service should interoperate with these abstractions through
small adapters and examples, not hidden coupling.

## Slice 1: Public Contract

Add types only.

- `ServiceWorkerService`
- `ServiceWorkerProvider`
- `ServiceWorkerConfig`
- `ServiceWorkerRegistrationState`
- `ServiceWorkerUpdateState`
- `ServiceWorkerMessageEvent`
- `ServiceWorkerMessageTarget`
- `ServiceWorkerSupport`

Candidate API:

```ts
serviceWorker.supported;
serviceWorker.controller;
serviceWorker.registration;
serviceWorker.status;
serviceWorker.register(scriptUrl, options?);
serviceWorker.ready();
serviceWorker.update();
serviceWorker.unregister();
serviceWorker.post(message, transfer?);
serviceWorker.onMessage(callback);
serviceWorker.onControllerChange(callback);
serviceWorker.onUpdate(callback);
```

Rules:

- `supported` is a boolean based on `navigator.serviceWorker`.
- Async methods return promises.
- Event subscription methods return disposer functions.
- `post()` sends to `navigator.serviceWorker.controller` by default and fails
  predictably when there is no controller.
- State objects must be plain enough for templates and generated facades.

Acceptance:

- Add type tests for the public service and config shapes.
- Export public types from the namespace surface.
- No runtime behavior is added in this slice.
- Run:

```bash
./node_modules/.bin/tsc --project tsconfig.test.json
make test-namespace-js
```

## Slice 2: Service Skeleton

Add `src/services/service-worker/service-worker.ts`.

Provider:

```ts
class ServiceWorkerProvider {
  $get = [
    "$log",
    "$exceptionHandler",
    (log, err) =>
      createServiceWorkerService(navigator.serviceWorker, { log, err }),
  ];
}
```

Rules:

- Use dependency injection for logging and exception handling.
- Allow an internal test double for `ServiceWorkerContainer`.
- If service workers are unsupported, return a stable no-op service where
  `supported` is false and async operations reject with a stable error code.
- Do not touch `navigator.serviceWorker` during module loading.

Acceptance:

- Creates a supported service with a fake container.
- Creates an unsupported service without throwing.
- Unsupported `register()`, `ready()`, `update()`, `unregister()`, and `post()`
  reject with stable errors.
- Run:

```bash
npx playwright test src/services/service-worker/service-worker.test.ts
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 3: Registration Lifecycle

Implement registration and ready handling.

Rules:

- `register(scriptUrl, options?)` delegates to
  `navigator.serviceWorker.register()`.
- Track the latest `ServiceWorkerRegistration`.
- Normalize state from `installing`, `waiting`, and `active` workers.
- `ready()` resolves from `navigator.serviceWorker.ready`.
- `unregister()` unregisters the latest registration if present.
- `update()` calls `registration.update()` when registration exists.
- Configuration may include `scope`, `type`, and `updateViaCache`.

Acceptance:

- Registers with script URL and options.
- Stores registration state after register.
- Resolves ready state.
- Updates an existing registration.
- Unregisters an existing registration.
- Rejects update and unregister when no registration exists.
- Run:

```bash
npx playwright test src/services/service-worker/service-worker.test.ts
```

## Slice 4: Controller And Message Events

Add app-to-service-worker communication.

Rules:

- Listen to `navigator.serviceWorker` `message` events.
- Listen to `controllerchange`.
- `onMessage(callback)` receives normalized data and raw event.
- `onControllerChange(callback)` receives the current controller.
- `post(message, transfer?)` posts to the current controller.
- Do not invent request/response semantics in v1.

Acceptance:

- Registers and disposes message listeners.
- Registers and disposes controller-change listeners.
- Updates `controller` when `controllerchange` fires.
- Posts messages to the active controller.
- Rejects `post()` without an active controller.
- Run:

```bash
npx playwright test src/services/service-worker/service-worker.test.ts
```

## Slice 5: Update Detection

Expose update lifecycle without forcing reload behavior.

Rules:

- After registration, listen for `registration.updatefound`.
- Track worker state changes for installing and waiting workers.
- `onUpdate(callback)` fires when a new worker is installing, waiting, or active.
- Provide update metadata, not policy decisions.
- Do not call `skipWaiting()` automatically.
- Do not reload the page automatically.

Candidate update state:

```ts
{
  phase: "installing" | "waiting" | "active" | "redundant";
  worker: ServiceWorker;
  registration: ServiceWorkerRegistration;
}
```

Acceptance:

- Emits update state when `updatefound` fires.
- Emits state transitions for the discovered worker.
- Removes old worker state listeners when a newer update is found.
- Leaves reload and `skipWaiting` policy to application code.
- Run:

```bash
npx playwright test src/services/service-worker/service-worker.test.ts
```

## Slice 6: Scope Binding And Reactivity

Make the service template-friendly.

Rules:

- Expose reactive service state through plain properties:
  `supported`, `status`, `controller`, and `registration`.
- If the service is assigned to a scope or controller, service worker events
  should schedule scope updates.
- Use the existing scope proxy binding pattern if the service owns mutable
  runtime state.
- Keep event callbacks outside digest-style assumptions.

Acceptance:

- Templates update after registration.
- Templates update after controller change.
- Templates update after update detection.
- Destroyed observing scopes are cleaned up opportunistically.
- Run:

```bash
npx playwright test src/services/service-worker/service-worker.test.ts
```

## Slice 7: Module Registration

Add module sugar only after service behavior is tested.

Candidate:

```ts
app.serviceWorker("appServiceWorker", "/sw.js", {
  scope: "/",
  type: "module",
});
```

Rules:

- Module registration creates an injectable service wrapper.
- Registration should remain explicit unless the config asks for auto-register.
- Dynamic config should follow the same pattern as `.worker()`, `.wasm()`,
  `.sse()`, `.websocket()`, `.webTransport()`, `.machine()`, and `.workflow()`.
- Avoid surprising network work during injector creation unless
  `autoRegister: true` is configured.

Acceptance:

- `module.serviceWorker(name, scriptUrl, config)` creates an injectable.
- Dynamic script URL and config resolve through DI.
- `autoRegister: false` does not register during injection.
- `autoRegister: true` starts registration and exposes the promise or status.
- Run:

```bash
npx playwright test src/services/service-worker/service-worker.test.ts
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 8: Namespace And Generated Surfaces

Add the new service to public package and language integration surfaces.

Rules:

- Add injection tokens for `$serviceWorker` and `$serviceWorkerProvider`.
- Register the provider in `ng.ts`.
- Export public types through `namespace.ts`.
- Update Closure externs and generated language bindings after the TypeScript
  surface is stable.

Acceptance:

- `$serviceWorker` is injectable from the core `ng` module.
- Public symbols are available from namespace exports.
- Closure, ClojureScript, Dart, Gleam, Kotlin, and Wasm namespace parity checks
  are updated or intentionally deferred with tracking notes.
- Run:

```bash
make generated-check
make test-namespace-js
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 9: Optional Adapters

Add adapters only if concrete examples prove they reduce application code.

Candidates:

- `ServiceWorkerMessageClient`: request/response helper with request ids.
- `serviceWorkerRestBackend`: REST backend that sends requests to a service
  worker message protocol.
- `cacheApiRestCacheStore`: `RestCacheStore` implementation backed by the
  browser Cache API.
- `$workflow` activity helper for queueing a command request through the service
  worker.

Rules:

- Keep adapters outside the core service worker lifecycle service.
- Each adapter must have its own protocol and failure semantics.
- Do not make `$rest` or `$workflow` depend on service workers.
- Do not add request queues until retry, idempotency, and replay behavior are
  explicit.

Acceptance:

- Each adapter has focused tests and docs.
- Adapter failures preserve the owning abstraction's error model.
- No core service worker API changes are required for adapter-specific behavior.

## Slice 10: Browser Integration Tests

Add real browser tests after the fake-container unit tests are stable.

Rules:

- Service workers require a secure context or localhost.
- Tests must use unique script URLs or scopes to avoid cross-test state leaks.
- Always unregister test registrations during cleanup.
- Avoid relying on browser update timing without explicit waits.

Acceptance:

- Registers a real test service worker from the dev server.
- Receives a message from the service worker.
- Posts a message to the active controller when available.
- Detects an updated service worker script.
- Cleans up registration after each test.
- Run:

```bash
npx playwright test src/services/service-worker/service-worker.test.ts
```

## Slice 11: Documentation

Docs must clearly distinguish the layers:

- Web Worker: page-owned background computation through `$worker`.
- Service worker: browser-owned page control, lifecycle, updates, and message
  events through `$serviceWorker`.
- REST cache: app-owned backend/cache strategies through `RestBackend` and
  `RestCacheStore`.
- Workflow: command execution and recovery; service workers can be an activity
  boundary, not the workflow engine.

Acceptance:

- Add service docs page.
- Add registration and update prompt example.
- Add message example.
- Add REST/cache positioning note.
- Add unsupported-browser behavior note.
- Every executable example has a matching test.
- Run:

```bash
make docs-examples-check
npx playwright test src/services/service-worker/service-worker.test.ts
```

## Future Capabilities

Do not start these until the lifecycle and messaging service is stable:

- push subscription management
- notification permission and display helpers
- background sync queue
- periodic background sync
- navigation preload helpers
- service-worker-side helper library
- app shell precache manifest generation
- update prompt component
- request/response message client
- offline mutation queue

Each future capability should ship as an opt-in adapter or companion service
unless it is part of the browser service worker lifecycle itself.

## Final Readiness Gate

Run before marking service worker support production-ready:

```bash
make check
make coverage-check
npx playwright test src/services/service-worker/service-worker.test.ts
```

Service worker support is production-ready only when:

- unsupported browsers fail predictably
- registration, update, and message lifecycles are deterministic
- tests clean up every real service worker registration
- no existing Web Worker behavior changed
- no `$rest` behavior depends on service workers
- generated language facades are fresh
- docs explain lifecycle limits and browser requirements
