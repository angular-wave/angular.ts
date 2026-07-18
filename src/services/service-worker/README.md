# Service Worker Service

`$serviceWorker` is the singleton facade for browser-owned registration,
readiness, updates, controller changes, and messaging. `$worker` remains the
page-owned background-computation primitive.

## Module Configuration

```ts
angular.module("app", []).serviceWorker("/service-worker.js", {
  scope: "/app/",
  type: "module",
  updateViaCache: "imports",
  autoRegister: true,
  checkForUpdatesOnRegister: true,
});
```

The module method configures the shared `$serviceWorker`; it does not register a
second named injectable. `scope`, `type`, and `updateViaCache` are native
registration defaults. Automatic registration and the initial update check are
module policy and are not accepted by `$serviceWorker.register()`.

## Lifecycle And Reactivity

`register()` uses the module-configured script and registration defaults.
`register(options)` overrides browser registration options for that configured
script. `register(url, options?)` explicitly overrides them. `ready()`,
`update()`, and `unregister()` expose browser lifecycle operations through
stable promises.
The facade exposes `supported`, `status`, `controller`, `registration`,
`registrationState`, and `updateState`.
The two state views are framework-owned and readonly to consumers.

Assigning the service to a scope or context model binds its state to AngularTS
scheduling. Runtime teardown removes framework listeners and bindings without
unregistering the browser-owned worker.

## Messaging

Use `post()` for one-way messages and `request()` for a response through a
dedicated `MessageChannel`:

```ts
$serviceWorker.post({ type: "cache:warm" }, { target: "active" });

const profile = await $serviceWorker.request<Profile>(
  { type: "profile:load" },
  { timeout: 5000 },
);
```

The service worker replies through the transferred port:

```js
self.addEventListener("message", (event) => {
  event.ports[0]?.postMessage({ name: "Ada" });
});
```

AngularTS does not impose request envelopes, correlation ids, or application
protocol types. `ServiceWorkerError` reports stable lifecycle, posting, timeout,
and deserialization failures.

## Security And Update Policy

Registration passes through `$security`. Bearer and basic policies deny script
creation because service-worker registration cannot attach application-defined
authorization headers; browser-managed cookie credentials remain viable.

AngularTS observes waiting workers but never calls `skipWaiting()`, reloads the
page, or chooses cache and retry policy. Those decisions remain explicit app
policy.

## Tests

`service-worker.spec.ts` covers unsupported behavior, lifecycle operations,
reactive state, messaging channels, security, module configuration, and teardown.
Browser tests exercise real registration, messaging, and update discovery.
