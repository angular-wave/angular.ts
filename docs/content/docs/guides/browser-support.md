---
title: Browser support
description:
  Define an AngularTS browser contract from required Web APIs, compiled output,
  fallbacks, and production tests.
weight: 85
---

List browser families and versions, mobile requirements, assistive-technology
coverage, and optional capabilities. Framework support does not automatically
provide WebTransport, service workers, storage, workers, or WebAssembly
everywhere.

Isolate capability selection:

```ts
function createRealtime() {
  if ('WebTransport' in window) return createWebTransport();
  if ('WebSocket' in window) return createWebSocket();
  return createPolling();
}
```

Detect the API used, not a browser brand. Keep fallback selection in one service
so components consume domain events rather than transport differences.

Test production output: cold load, direct route entry, back/forward, storage
denial, offline transition, reduced motion, keyboard navigation, and
service-worker upgrade. Disable capabilities to test fallbacks even when CI
supports them.

When no fallback exists, render an actionable unsupported state before
constructing the service. A runtime exception is not a support policy.
