---
title: Receive live server events
description: Update scope or append HTML through Server-Sent Events
weight: 19
---

## Problem

The server must push notifications or status updates to the page without client
polling.

## Before you start

The server must support `text/event-stream`, flush events, and handle
reconnects. Decide what the page shows before the first event arrives.

The browser side uses [`SseService`](../../../typedoc/types/SseService.html)
through `ng-sse`. AngularTS owns the
[`SseConnection`](../../../typedoc/interfaces/SseConnection.html), reconnects
it, and closes it when the scope is destroyed.

For a custom production runtime, include `sseModule` from
`@angular-wave/angular.ts/runtime/realtime`. Do not include the aggregate
`realtimeModule` unless the same runtime also uses WebSocket and WebTransport.

## Set up a JavaScript SSE endpoint

An SSE endpoint is a long-running HTTP `GET`. Send the event-stream headers, end
every event with a blank line, flush each update, and stop work when the request
closes.

<!-- tested-by: src/docs-examples/realtime-cookbook.test.ts, src/services/sse/sse.spec.ts, src/directive/http/get.spec.ts -->

```js
import { createServer } from 'node:http';

const states = ['paid', 'packing', 'shipped'];

createServer((request, response) => {
  if (request.url !== '/api/events/orders') {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  response.flushHeaders();

  let index = 0;
  const send = () => {
    const order = { id: 'A-1042', state: states[index++ % states.length] };
    response.write(`data: ${JSON.stringify(order)}\n\n`);
  };
  const updates = setInterval(send, 15_000);
  const heartbeat = setInterval(
    () => response.write(': keep-alive\n\n'),
    10_000,
  );

  send();
  request.on('close', () => {
    clearInterval(updates);
    clearInterval(heartbeat);
  });
}).listen(8080);
```

The blank line after `data:` completes one event. Lines beginning with `:` are
comments that keep idle proxies from closing the connection. In production,
publish real order changes rather than using timers.

Authenticate and authorize before writing the `200` response. Browser
`EventSource` cannot attach arbitrary headers, so prefer an `HttpOnly`,
`Secure`, `SameSite` session cookie and `with-credentials="true"`. Do not put a
long-lived bearer token in the URL.

Send complete current-state snapshots when reconnecting is enough. If every
event must be delivered, add an `id:` field, store events durably, read the
browser's `Last-Event-ID` header on reconnect, and replay events after that ID
before sending live ones. A process-local counter is not sufficient when more
than one server can handle the request.

## Recipe

Use `ng-sse` and assign incoming JSON from `$res`:

<!-- tested-by: src/services/sse/sse.spec.ts, src/directive/realtime/swap.spec.ts -->

```html
<section
  ng-sse="/api/events/orders"
  trigger="load"
  with-credentials="true"
  on-success="orderStatus = $res; streamState = 'live'"
  on-error="streamState = 'reconnecting'"
  on-reconnect="streamState = 'live'"
>
  <p aria-live="polite">Order {{ orderStatus.id }}: {{ orderStatus.state }}</p>
  <p ng-if="streamState === 'reconnecting'">Reconnecting...</p>
</section>
```

When the server sends HTML fragments, choose a swap strategy:

<!-- tested-by: src/services/sse/sse.spec.ts, src/directive/realtime/swap.spec.ts -->

```html
<ul
  id="notifications"
  ng-sse="/api/events/notifications"
  trigger="load"
  swap="beforeend"
></ul>
```

AngularTS parses JSON for `on-success` and otherwise applies the configured DOM
swap. Keep each message small. Send an identifier and changed fields, or a small
current-state snapshot, instead of an entire page model.

Use SSE for one-way server updates. Use a WebSocket or WebTransport service when
the browser and server both need a long-lived message channel.

## Failure path

SSE is one-way and connections can disappear through proxies, deployments, or
sleep. Show stale or disconnected state and make repeated events safe. Confirm
that your reverse proxy disables response buffering and permits connections to
remain open. Keep polling when your hosting path cannot stream responses.

## Apply it now

Find one polling loop that only asks whether the server has new data. Write the
smallest event payload the server can push, replace the poll with SSE, and show
what the user sees before the first event and after the connection fails. Keep
polling when intermediaries cannot maintain long-lived HTTP connections.

## Verify

Send valid JSON, HTML, malformed data, and a disconnect. Confirm the page shows
its initial, live, error, and reconnect states without polling. Reconnect with a
`Last-Event-ID`, test the page through the production proxy, and confirm the
server releases timers and subscriptions when the browser disconnects.
