---
title: "Real-Time Communication"
weight: 400
description: "Stream server events with $sse, exchange bidirectional messages with $websocket or $webTransport, and offload work with ng-worker and ng-wasm."
---

AngularTS provides five building blocks for real-time and compute-heavy work:

- `$sse` for Server-Sent Events.
- `$websocket` for bidirectional WebSocket connections.
- `$webTransport` for HTTP/3 WebTransport sessions with datagrams and streams.
- `ng-worker` for JavaScript work in a Web Worker.
- `ng-wasm` for loading WebAssembly modules.

Exact service and connection signatures live in TypeDoc:

- [`SseService`](../../../typedoc/types/SseService.html)
- [`SseConfig`](../../../typedoc/interfaces/SseConfig.html)
- [`SseConnection`](../../../typedoc/interfaces/SseConnection.html)
- [`WebSocketService`](../../../typedoc/types/WebSocketService.html)
- [`WebSocketConfig`](../../../typedoc/interfaces/WebSocketConfig.html)
- [`WebSocketConnection`](../../../typedoc/interfaces/WebSocketConnection.html)
- [`WebTransportService`](../../../typedoc/types/WebTransportService.html)
- [`WebTransportConfig`](../../../typedoc/interfaces/WebTransportConfig.html)
- [`WebTransportConnection`](../../../typedoc/interfaces/WebTransportConnection.html)
- [`WorkerConfig`](../../../typedoc/interfaces/WorkerConfig.html)
- [`WorkerConnection`](../../../typedoc/interfaces/WorkerConnection.html)

## Server-Sent Events

`$sse` creates a managed `EventSource` connection. It handles query parameters, JSON message parsing, heartbeat detection, automatic reconnection, and clean shutdown.

```typescript
class NewsFeedController {
  static $inject = ["$sse", "$scope"];

  items: NewsItem[] = [];
  private connection: ng.SseConnection;

  constructor($sse: ng.SseService, $scope: ng.Scope) {
    this.connection = $sse("/api/news/stream", {
      withCredentials: true,
      params: { category: "top" },
      retryDelay: 3000,
      heartbeatTimeout: 30000,
      onMessage: (item: NewsItem) => {
        this.items.unshift(item);
        this.items = this.items.slice(0, 50);
        $scope.$applyAsync();
      },
      onReconnect: (attempt) => {
        console.log("SSE reconnect", attempt);
      },
    });

    $scope.$on("$destroy", () => this.connection.close());
  }
}
```

`EventSource` does not support arbitrary custom headers in browsers. For authenticated streams, use cookies with `withCredentials` or include a short-lived token in query params.

## WebSockets

`$websocket` returns a managed WebSocket connection with reconnects, heartbeat handling, message transforms, and send support.

```typescript
class ChatController {
  static $inject = ["$websocket", "$scope"];

  messages: ChatMessage[] = [];
  private socket: ng.WebSocketConnection;

  constructor($websocket: ng.WebSocketService, $scope: ng.Scope) {
    this.socket = $websocket("wss://api.example.com/chat", ["v1"], {
      retryDelay: 2000,
      maxRetries: 20,
      onMessage: (message: ChatMessage) => {
        this.messages.push(message);
        $scope.$applyAsync();
      },
      onClose: (event) => {
        console.log("WebSocket closed", event.code);
      },
    });

    $scope.$on("$destroy", () => this.socket.close());
  }

  send(text: string) {
    this.socket.send({ type: "message", text });
  }
}
```

`send()` serializes values as JSON before passing them to the native WebSocket.

## WebTransport

`$webTransport` opens a browser-native WebTransport session. Use it when an
endpoint can serve HTTP/3 and the client benefits from unreliable datagrams,
reliable streams, or both in the same session.

```typescript
class TelemetryController {
  static $inject = ["$webTransport", "$scope"];

  events: string[] = [];
  private session: ng.WebTransportConnection;

  constructor($webTransport: ng.WebTransportService, $scope: ng.Scope) {
    this.session = $webTransport("https://localhost:4433/webtransport", {
      reconnect: true,
      retryDelay: 500,
      maxRetries: 5,
      requireUnreliable: true,
      transformDatagram: (data) => new TextDecoder().decode(data),
      onDatagram: ({ message }) => {
        this.events.push(String(message));
        $scope.$applyAsync();
      },
      onReconnect: ({ connection }) => {
        return connection.sendText(JSON.stringify({ subscribe: "telemetry" }));
      },
    });
  }

  send(value: string) {
    return this.session.sendText(value);
  }
}
```

The service expects the browser `WebTransport` API to exist and requires an
`https:` URL with an explicit port. The test backend exposes certificate hash
metadata at `/webtransport/cert-hash` for local browser tests.

Reconnect is opt-in at the service layer. When enabled, the
`WebTransportConnection` object stays stable while its native `transport`
instance is replaced. Use `onReconnect` as the renegotiation hook for
subscriptions, authentication messages, or other session state that the server
does not remember across HTTP/3 sessions.

For template-level feeds, `ng-web-transport` connects on load by default and
evaluates lifecycle expressions. `data-mode="datagram"` is the default;
`data-mode="stream"` reads server-opened unidirectional streams.
Realtime protocol swaps reuse the same DOM swap helper as HTTP and SSE
directives, so adding `animate="true"` routes inserted, replaced, or removed
elements through `$animate`.

```html
<div
  ng-web-transport="transportUrl"
  data-config="transportConfig"
  data-mode="datagram"
  data-transform="json"
  data-as="session"
  data-reconnect="true"
  animate="true"
  data-on-message="events.push($message)"
  data-on-reconnect="reconnects = $attempt"
  data-on-error="error = $error"
></div>
```

`data-transform` accepts `bytes`, `text`, or `json`. Message expressions receive
`$connection`, `$data`, `$message`, `$event`, and `$text` for text/json modes.
Reconnect is opt-in with `data-reconnect="true"`; tune it with
`data-retry-delay` and `data-max-retries`. `data-on-reconnect` runs after the
replacement session is ready and receives `$attempt`, `$connection`, `$error`,
and `$url`.

## Web Workers

Use `ng-worker` when a view action should run CPU-heavy JavaScript outside the main thread.

```html
<button
  ng-worker="./workers/compress.js"
  data-params="vm.fileBuffer"
  data-on-result="vm.compressed = $result"
  data-on-error="vm.error = $error"
  trigger="click"
>
  Compress
</button>

<span
  ng-worker="./workers/sensor-reader.js"
  interval="5000"
  data-on-result="vm.sensorData = $result"
></span>
```

The directive evaluates `data-params`, posts the result to the worker, and exposes worker responses as `$result` in `data-on-result`. When no result expression is provided, it swaps the result into the element using the configured swap strategy.

A worker module receives values through `self.onmessage` and returns results through `self.postMessage`.

```javascript
self.onmessage = function ({ data: { limit } }) {
  const sieve = new Uint8Array(limit + 1).fill(1);
  sieve[0] = sieve[1] = 0;

  for (let i = 2; i * i <= limit; i++) {
    if (sieve[i]) {
      for (let j = i * i; j <= limit; j += i) sieve[j] = 0;
    }
  }

  const primes = [];
  for (let i = 2; i <= limit; i++) {
    if (sieve[i]) primes.push(i);
  }

  self.postMessage(primes);
};
```

## WebAssembly

`ng-wasm` loads a `.wasm` file and exposes its exports on the scope under a configurable name.

```html
<div
  ng-wasm
  src="/wasm/image-processor.wasm"
  as="imageProcessor"
></div>
```

```typescript
const result = $scope.imageProcessor.grayscale(pixelBuffer, width, height);
```

WebAssembly loading is asynchronous. Guard calls until the export object exists or trigger work after the directive has linked.

## Choosing A Transport

| Need | Use |
| --- | --- |
| Server pushes one-way updates | `$sse` |
| Client and server both send messages | `$websocket` |
| HTTP/3 datagrams or streams | `$webTransport` |
| CPU-heavy JavaScript | `ng-worker` |
| Compiled compute module | `ng-wasm` |

## Related

- [$http service]({{< relref "/docs/services/http" >}})
- [PubSub messaging]({{< relref "/docs/services/pubsub" >}})
