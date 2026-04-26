---
title: "Real-time communication: WebSocket, SSE, and Workers"
weight: 400
description: "Stream server events with $sse, exchange bidirectional messages with $websocket, and offload computation with ng-worker and ng-wasm directives."
---
AngularTS provides four building blocks for real-time and compute-intensive work: `$sse` for Server-Sent Events, `$websocket` for bidirectional WebSocket connections, `ng-worker` for running JavaScript in Web Workers, and `ng-wasm` for loading WebAssembly modules. All four are designed to integrate cleanly with the AngularTS scope and lifecycle.
## `$sse` — Server-Sent Events

`$sse` creates a managed `EventSource` connection. The `StreamConnection` it returns handles automatic reconnection, heartbeat detection, JSON parsing, and clean shutdown.
### Creating a connection

```typescript
  withCredentials: true,
  params: { category: "sports" },
  // Reconnect behavior
  retryDelay: 2000,      // wait 2 s between retries (default: 1000)
  maxRetries: 10,         // give up after 10 attempts (default: Infinity)
  heartbeatTimeout: 30000, // reconnect if no message for 30 s (default: 15000)
  // Lifecycle callbacks
  onMessage(data, event) {
    console.log("New item:", data); // data is JSON-parsed automatically
  },
  onOpen(event) {
    console.log("SSE connected");
  },
  onError(err) {
    console.warn("SSE error:", err);
  },
  onReconnect(attempt) {
    console.log(`Reconnect attempt ${attempt}`);
  },
});

// Later: clean up
feed.close();

// Restart manually
feed.connect();
```
### Configuration options
#### `Parameter`

- **Type:** `boolean`

Pass cookies with the `EventSource` request. Required for SSE endpoints behind session-based auth.
#### `Parameter`

- **Type:** `Record<string, any>`

Query parameters appended to the SSE URL. Useful for filtering which events the server sends.
#### `Parameter`

- **Type:** `number`

Milliseconds to wait between reconnection attempts. Default: `1000`.
#### `Parameter`

- **Type:** `number`

Maximum number of reconnect attempts before giving up. Default: `Infinity`.
#### `Parameter`

- **Type:** `number`

If no message or open event is received within this window (milliseconds), the connection is considered dead and a reconnect is triggered. Default: `15000`.
#### `Parameter`

- **Type:** `(data: string) => any`

Transform each raw message string before it is passed to `onMessage`. By default, `JSON.parse` is attempted; if parsing fails, the raw string is passed through.
#### `Parameter`

- **Type:** `(data: any, event: MessageEvent) => void`

Called for every incoming message.
#### `Parameter`

- **Type:** `(event: Event) => void`

Called when the connection opens or reopens after a reconnect.
#### `Parameter`

- **Type:** `(err: Event) => void`

Called when the `EventSource` emits an error. A reconnect is scheduled automatically.
#### `Parameter`

- **Type:** `(attempt: number) => void`

Called just before each reconnect attempt. Receives the attempt counter (1-indexed).
### Example: live news feed

```typescript
  static $inject = ["$sse", "$scope"];
  items: NewsItem[] = [];
  private connection: SseConnection;

  constructor($sse: SseService, $scope: ng.Scope) {
    this.connection = $sse("/api/news/stream", {
      params: { category: "top" },
      retryDelay: 3000,
      onMessage: (data: NewsItem) => {
        this.items.unshift(data);
        if (this.items.length > 50) this.items.pop();
        $scope.$applyAsync(); // sync SSE data into Angular's digest
      },
    });

    // Clean up when the controller's scope is destroyed
    $scope.$on("$destroy", () => this.connection.close());
  }
}
```

> **Note:** `EventSource` does not support custom headers natively. If you need to send authentication tokens, use query parameters (`params.token`) or rely on cookies via `withCredentials`.

***
## `$websocket` — bidirectional WebSocket

`$websocket` wraps the native `WebSocket` API with the same `StreamConnection` infrastructure as `$sse`: automatic reconnection, heartbeat, and JSON transform.
### Creating a connection

```typescript
  "wss://api.example.com/chat",
  ["v1"],              // optional WebSocket subprotocols
  {
    autoReconnect: true,
    reconnectInterval: 2000, // ms between reconnects (default: 1000)
    maxRetries: 20,
    heartbeatInterval: 0,    // ms; 0 = disabled (default)
    onOpen(event) {
      console.log("Connected to chat");
    },
    onMessage(data, event) {
      console.log("Received:", data); // already JSON-parsed
    },
    onClose(event) {
      console.log("Disconnected, code:", event.code);
    },
    onError(event) {
      console.error("WebSocket error:", event);
    },
  },
);

// Send a message (serialized to JSON automatically)
chat.send({ type: "message", text: "Hello!" });

// Close the connection permanently (no reconnect)
chat.close();
```
### Configuration options
#### `Parameter`

- **Type:** `string[]`

WebSocket subprotocols. Passed as the second argument to the `WebSocket` constructor.
#### `Parameter`

- **Type:** `boolean`

Whether to reconnect automatically on close or error. Default: `true`.
#### `Parameter`

- **Type:** `number`

Milliseconds to wait before reconnecting. Default: `1000`.
#### `Parameter`

- **Type:** `number`

Maximum reconnect attempts. Default: `Infinity`.
#### `Parameter`

- **Type:** `number`

Interval in milliseconds between heartbeat pings. Set to `0` to disable. Default: `0`.
#### `Parameter`

- **Type:** `(data: string) => any`

Transform raw message data. Default behavior attempts `JSON.parse`; falls back to the raw string on parse error.
#### `Parameter`

- **Type:** `(event: CloseEvent) => void`

Called when the WebSocket connection closes. Inspect `event.code` and `event.reason` for details.
### Example: real-time chat

```typescript
  static $inject = ["$websocket", "$scope"];
  messages: ChatMessage[] = [];
  private socket: StreamConnection;

  constructor($websocket: WebSocketService, $scope: ng.Scope) {
    this.socket = $websocket("wss://api.example.com/chat", [], {
      onMessage: (data: ChatMessage) => {
        this.messages.push(data);
        $scope.$applyAsync();
      },
      onReconnect: (attempt) => {
        console.log(`Reconnecting... attempt ${attempt}`);
      },
    });

    $scope.$on("$destroy", () => this.socket.close());
  }

  send(text: string) {
    this.socket.send({ type: "chat", text, userId: this.currentUserId });
  }
}
```

***
## `ng-worker` directive

`ng-worker` runs a JavaScript module in a Web Worker and pipes results back into the template, keeping heavy computation off the main thread.
### Usage

```html
<div
  ng-worker="./workers/prime-sieve.js"
  data-params="{ limit: 100000 }"
  data-on-result="vm.primes = $result"
></div>

<!-- Trigger on a button click -->
<button
  ng-worker="./workers/compress.js"
  data-params="vm.fileBuffer"
  data-on-result="vm.compressed = $result"
  data-on-error="vm.error = $error"
  trigger="click"
>Compress</button>

<!-- Polling — run every 5 seconds -->
<span
  ng-worker="./workers/sensor-reader.js"
  interval="5000"
  data-on-result="vm.sensorData = $result"
></span>
```
### Directive attributes
#### `Parameter`

- **Type:** `string`
- **Required:** yes

Path or URL to the Worker module. Loaded with `{ type: "module" }`.
#### `Parameter`

- **Type:** `expression`

Scope expression evaluated before posting to the worker. The result is passed to `worker.postMessage(data)`.
#### `Parameter`

- **Type:** `expression`

Evaluated when the worker posts a message. The parsed result is available as `$result`.
#### `Parameter`

- **Type:** `expression`

Evaluated on worker error. The `ErrorEvent` is available as `$error`.
#### `Parameter`

- **Type:** `string`

DOM event that triggers the worker. Defaults to the natural event for the element type (e.g., `click` for buttons, `load` for most others).
#### `Parameter`

- **Type:** `number`

If set, the worker is triggered immediately and then every `interval` milliseconds. The interval is cleared when the scope is destroyed.
#### `Parameter`

- **Type:** `boolean expression`

Triggers the worker once, the first time the expression becomes truthy. Useful for deferred initialization.
#### `Parameter`

- **Type:** `number`

Wait this many milliseconds after the trigger event before posting to the worker.
#### `Parameter`

- **Type:** `number`

Ignore triggers that arrive within this many milliseconds of a previous trigger.
#### `Parameter`

- **Type:** `string`

How to insert the result HTML. One of `innerHTML` (default), `outerHTML`, `textContent`, `beforebegin`, `afterbegin`, `beforeend`, `afterend`.
### Worker script example

The worker script receives its input via `self.onmessage` and posts the result back with `self.postMessage`. The module format (`type: "module"`) lets you use `import` statements.

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
  for (let i = 2; i <= limit; i++) if (sieve[i]) primes.push(i);
  self.postMessage(primes);
};
```

***
## `ng-wasm` directive

`ng-wasm` loads a WebAssembly `.wasm` file and exposes its exports on the scope under a configurable name.

```html
<div
  ng-wasm
  src="/wasm/image-processor.wasm"
  as="imageProcessor"
></div>

<!-- Call an export in the controller -->
```

```typescript
const result = $scope.imageProcessor.grayscale(pixelBuffer, width, height);
```
#### `Parameter`

- **Type:** `string`
- **Required:** yes

URL of the `.wasm` binary to load. Fetched and instantiated via `WebAssembly.instantiateStreaming`.
#### `Parameter`

- **Type:** `string`

Name under which the WASM exports are set on the scope. Defaults to `"wasm"`.

> **Warning:** WebAssembly instantiation is asynchronous. Do not call exports synchronously in a controller constructor — wait for the directive's `link` function to complete or guard calls with a check for the exports object.

#### [$http service]({{< relref "/docs/services/http" >}})

Standard HTTP requests and interceptors.

#### [PubSub messaging]({{< relref "/docs/services/pubsub" >}})

Decouple real-time updates from your UI with `$eventBus`.
