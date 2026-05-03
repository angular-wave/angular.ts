---
title: "Real-Time Communication"
weight: 400
description: "Stream server events with $sse, exchange bidirectional messages with $websocket, and offload work with ng-worker and ng-wasm."
---

AngularTS provides four building blocks for real-time and compute-heavy work:

- `$sse` for Server-Sent Events.
- `$websocket` for bidirectional WebSocket connections.
- `ng-worker` for JavaScript work in a Web Worker.
- `ng-wasm` for loading WebAssembly modules.

Exact service and connection signatures live in TypeDoc:

- [`SseService`](../../../typedoc/types/SseService.html)
- [`SseConfig`](../../../typedoc/interfaces/SseConfig.html)
- [`SseConnection`](../../../typedoc/interfaces/SseConnection.html)
- [`WebSocketService`](../../../typedoc/types/WebSocketService.html)
- [`WebSocketConfig`](../../../typedoc/interfaces/WebSocketConfig.html)
- [`WebSocketConnection`](../../../typedoc/interfaces/WebSocketConnection.html)
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
| CPU-heavy JavaScript | `ng-worker` |
| Compiled compute module | `ng-wasm` |

## Related

- [$http service]({{< relref "/docs/services/http" >}})
- [PubSub messaging]({{< relref "/docs/services/pubsub" >}})
