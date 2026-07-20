---
title: $serviceWorker
description: >
  Service worker lifecycle, update, and message facade
---

`$serviceWorker` wraps browser-owned service worker registration, readiness,
update observation, controller changes, and page-to-worker messaging.

Use it when the browser owns the page-control lifecycle. Use `$worker` for
page-owned background computation. Use `$rest` and `RestBackend` for request and
cache composition. Use `$workflow` for command execution and recovery; a service
worker can be an activity boundary, not the workflow engine.

Exact method signatures live in TypeDoc:

- [`ServiceWorkerService`](../../../typedoc/interfaces/ServiceWorkerService.html)
- [`ServiceWorkerConfig`](../../../typedoc/interfaces/ServiceWorkerConfig.html)
- [`ServiceWorkerUpdateState`](../../../typedoc/interfaces/ServiceWorkerUpdateState.html)
- [`ServiceWorkerPostOptions`](../../../typedoc/interfaces/ServiceWorkerPostOptions.html)
- [`ServiceWorkerRequestOptions`](../../../typedoc/interfaces/ServiceWorkerRequestOptions.html)

## Registration

Configure automatic registration on the module when the application has one
stable worker script:

```ts
angular.module('app', []).serviceWorker('/sw.js', {
  scope: '/',
  updateViaCache: 'none',
  autoRegister: true,
});
```

Or configure the script without automatic registration and start it explicitly:

```ts
angular.module('app', []).serviceWorker('/sw.js', {
  scope: '/',
  updateViaCache: 'none',
});

$serviceWorker.register();

// Override browser registration options without repeating the configured URL.
$serviceWorker.register({ scope: '/feature/' });

$serviceWorker.ready().then(() => {
  status = $serviceWorker.status;
});
```

The default policy is observation only. AngularTS does not reload the page,
activate a waiting worker, or pick a cache strategy for the app.

Destroying an AngularTS runtime removes its service-worker event listeners and
reactive bindings. It does not call `unregister()`; browser registration remains
active until the application explicitly unregisters it.

`registrationState` and `updateState` are readonly framework-owned views. Their
properties update reactively as the browser registration changes.

Executable sample:
[`service-worker.html`](/examples/service-worker/service-worker.html)

## Update Prompt

Observe update state and make activation a user choice:

```ts
$serviceWorker.onUpdate((state) => {
  if (state.waiting) {
    showUpdatePrompt = true;
  }
});
```

If the user opts in, send your own protocol message to the waiting worker. Keep
reload separate so the app can save state, finish work, or defer navigation.

```ts
function activateUpdate() {
  $serviceWorker.registration?.waiting?.postMessage({
    type: 'app:skip-waiting',
  });
}

$serviceWorker.onControllerChange(() => {
  showReloadButton = true;
});

function reloadAfterUserConfirms() {
  window.location.reload();
}
```

## Messages

Use `$serviceWorker.post(...)` for simple page-to-worker messages after a
controller is available:

```ts
$serviceWorker.onMessage((event) => {
  if (event.data.type === 'app:pong') {
    lastWorkerReply = event.data;
  }
});

$serviceWorker.post({
  type: 'app:ping',
}, {
  target: 'controller',
});
```

For request/response protocols, `request()` creates a dedicated
`MessageChannel`, transfers its response port, and applies a timeout:

```ts
const profile = await $serviceWorker.request<Profile>(
  { type: 'profile:load' },
  { timeout: 5000 },
);
```

The service-worker message handler responds through `event.ports[0]`. AngularTS
does not add request ids or prescribe an application message envelope.

## Security

Registration participates in `$security` automatically. Bearer and Basic
credential policies deny registration because the Web Platform registration API
cannot attach application-defined `Authorization` headers. Cookie credentials
remain browser-managed.

## REST And Cache

Do not make `$rest` depend on service workers. REST caching belongs behind
`RestBackend` and `RestCacheStore`; a service-worker-backed REST cache should be
an explicit backend adapter when the app needs that boundary.

## Unsupported Browsers

When `navigator.serviceWorker` is unavailable, `$serviceWorker.supported` is
`false`, `status` is `unsupported`, and async lifecycle methods reject with a
stable service-worker error. Applications can render a non-offline experience
without special provider wiring.

## Related

- [`$worker`]({{< relref "/docs/directives/advanced" >}})
- [`$rest`]({{< relref "/docs/service/rest" >}})
- [`$workflow`]({{< relref "/docs/service/workflow" >}})
