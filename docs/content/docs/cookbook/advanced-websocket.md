---
title: Exchange live messages with WebSocket
description: Build a bidirectional chat channel with reconnect and cleanup
weight: 93
---

## Problem

The browser must send messages while the server pushes new messages over the
same long-running connection. Repeated HTTP requests or SSE only solve half of
that conversation.

## Before you start

Use WebSocket only when both sides need to send independently. Prefer SSE when
the browser only receives updates, and ordinary HTTP when messages are
infrequent.

AngularTS exposes
[`WebSocketService`](../../../typedoc/types/WebSocketService.html),
[`WebSocketConfig`](../../../typedoc/interfaces/WebSocketConfig.html), and the
managed
[`WebSocketConnection`](../../../typedoc/interfaces/WebSocketConnection.html).
The managed connection handles message decoding, retry policy, heartbeats, and
explicit cleanup.

For a custom production runtime, include `websocketModule` from
`@angular-wave/angular.ts/runtime/realtime`. Do not include the aggregate
`realtimeModule` unless the same runtime also uses SSE and WebTransport.

## Open a chat connection

Keep the connection in one controller or service. Update the scope-owned view
model from callbacks and close the connection with the scope.

<!-- tested-by: src/docs-examples/realtime-cookbook.test.ts, src/services/websocket/websocket.spec.ts -->

```js
class ChatController {
  static $inject = ['$websocket', '$scope'];

  messages = [];
  draft = '';
  status = 'connecting';

  constructor($websocket, $scope) {
    this.socket = $websocket('wss://example.com/chat', {
      protocols: ['chat.v1'],
      retryDelay: 1_000,
      maxRetries: 10,
      onOpen: () => ($scope.chat.status = 'connected'),
      onMessage: (message) => $scope.chat.messages.push(message),
      onClose: () => ($scope.chat.status = 'reconnecting'),
    });
    $scope.on('$destroy', () => this.socket.close());
  }

  send() {
    const text = this.draft.trim();
    if (!text || this.status !== 'connected') return;
    this.socket.send({ type: 'chat.message', id: crypto.randomUUID(), text });
    this.draft = '';
  }
}

angular.createModule('chat', []).controller('ChatController', ChatController);
```

`send()` serializes the object as JSON. Give every client message an ID so the
server can ignore a duplicate after a reconnect. Validate the message type,
size, authorization, and payload on the server before broadcasting it.

<!-- tested-by: src/docs-examples/realtime-cookbook.test.ts, src/core/compile/compile.spec.ts, src/services/websocket/websocket.spec.ts -->

```html
<section ng-controller="ChatController as chat">
  <p>Connection: {{ chat.status }}</p>
  <ol aria-live="polite">
    <li ng-repeat="message in chat.messages">{{ message.text }}</li>
  </ol>
  <form ng-submit="chat.send()">
    <label>Message <input ng-model="chat.draft" /></label>
    <button type="submit" ng-disabled="chat.status !== 'connected'">
      Send
    </button>
  </form>
</section>
```

Use `wss://` from an HTTPS page. At the server or reverse proxy, enable the HTTP
upgrade, authenticate the handshake, check the request origin, cap frame and
queue sizes, and enforce idle timeouts. Cookies can authenticate the handshake;
a short-lived connection ticket is safer than a reusable token in the URL.

## Failure path

A reconnect creates a new transport, not a continuation of the old one. The
server may have accepted a message before the connection disappeared, so retry
only messages with stable IDs and deduplicate them server-side. Resume incoming
messages from a server cursor when gaps matter.

Do not queue without a limit while offline. Disable writes or keep a small,
visible outbox. When the queue reaches its limit, reject new entries and tell
the user instead of allowing memory use to grow.

## Apply it now

Choose one interaction where either side must speak without waiting for the
other, such as chat, collaborative presence, or live control. Define the message
types and IDs first, then add reconnect and resume behavior before building the
interface.

## Verify

Send a valid message, malformed JSON, an oversized frame, and an unauthorized
message. Interrupt the connection before and after server acceptance. Confirm
duplicates are ignored, missing messages resume, the offline queue stays
bounded, reconnect attempts stop after scope destruction, and the production
proxy keeps the upgrade open.
