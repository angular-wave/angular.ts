# Service Worker Service

`$serviceWorker` wraps browser-owned service worker registration, readiness,
update observation, controller changes, and page-to-worker messaging. It is
separate from `$worker`, which owns page-created Web Workers.

## Public Surface

- `$serviceWorker`: singleton lifecycle and messaging facade.
- `ServiceWorkerConfig`: registration defaults and safe observation policy.
- `ServiceWorkerRegistrationState`: template-friendly registration snapshot.
- `ServiceWorkerUpdateState`: template-friendly update snapshot.
- `ServiceWorkerMessageClient`: request/response adapter over
  `$serviceWorker.post()` and `onMessage()`.

## Lifecycle Contract

- Browser service worker installation, activation, control, and script lifetime
  remain browser-owned.
- `$serviceWorker.register(...)`, `ready()`, `update()`, and `unregister()`
  expose the native lifecycle through stable promises and state snapshots.
- Runtime teardown removes AngularTS container, registration, worker-state, and
  reactive-binding listeners. It does not unregister the browser-owned service
  worker.
- Unsupported browsers receive a stable service with `supported: false` and
  predictable async failures.

## Reactivity Contract

When `$serviceWorker` or a configured module wrapper is assigned to a scope or
controller model, the service binds through the scope proxy system. Browser
events and async lifecycle operations schedule watchers for `status`,
`controller`, `registration`, `registrationState`, and `updateState`.

Destroyed observing scopes are removed opportunistically. Service worker state
continues to live at the browser/service singleton layer.

## Message Client Adapter

`ServiceWorkerMessageClient` is an optional adapter for apps that use a
request/response protocol with their service worker:

```ts
const client = new ServiceWorkerMessageClient($serviceWorker, {
  requestType: "app:request",
  responseType: "app:response",
  timeout: 5000,
});

const profile = await client.request({ action: "loadProfile" });
```

The request envelope is:

```ts
{ type: "app:request", id: "sw:1", payload: { action: "loadProfile" } }
```

The matching response envelope is:

```ts
{ type: "app:response", id: "sw:1", ok: true, data: { name: "Ada" } }
```

If `ok` is false, the client rejects with
`ServiceWorkerMessageClientError` code `response-error` and preserves the
response error detail. Other stable client error codes are `timeout`,
`post-failed`, and `disposed`.

## Policy Contract

Current defaults never call `skipWaiting()`, never reload the page, and never
activate a waiting worker automatically. Update prompts, reload behavior,
service-worker script content, cache strategy, request replay, and retry policy
remain application or adapter policy.

`ServiceWorkerMessageClient` only correlates messages. It does not queue
requests, retry failed posts, enforce idempotency, or persist pending work.

## Test Harness

- `src/services/service-worker/service-worker.spec.ts` uses fake service worker
  containers, registrations, and workers.
- Tests cover unsupported behavior, registration, update detection,
  controller/message events, runtime listener teardown, scope binding,
  configured module wrappers, and the request/response message client.
- Browser integration tests cover real service worker registration through the
  service-worker integration fixture.
