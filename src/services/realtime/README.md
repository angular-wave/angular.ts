# Realtime Services Internals

The realtime services own long-lived browser push transports for AngularTS apps.
The implementations in `src/services/websocket/websocket.ts`,
`src/services/sse/sse.ts`, and `src/services/webtransport/webtransport.ts`
turn native Web Platform connections into managed app primitives with default
reconnect, heartbeat, parsing, and cleanup behavior.

This document is the shared contract for realtime browser lifecycle services.
It describes current behavior so tests and docs can gate later hardening steps.

## Responsibilities

- Own browser connection lifecycle for WebSocket, Server-Sent Events, and
  WebTransport.
- Provide sensible reconnect and heartbeat defaults so application code does not
  need hand-written reconnect loops.
- Preserve native transport capabilities where the browser API exposes unique
  behavior.
- Make cleanup explicit through managed `close()` methods.
- Keep deterministic fake-backend tests for reconnect, callbacks, message
  parsing, and teardown behavior.

## Public Surface

- `$websocket(url, config?)`: creates a managed WebSocket; configure
  subprotocols through `config.protocols`
  connection.
- `$sse(url, config?)`: creates a managed EventSource/SSE connection.
- `$webTransport(url, config?)`: creates a managed WebTransport connection.
- `WebSocketConfig`, `SseConfig`, and `WebTransportConfig`: per-transport
  runtime configuration shapes.
- `ConnectionConfig`: shared internal configuration used by WebSocket and SSE.

The provider types remain legacy/internal construction details. User-facing
examples should use the runtime services, directives, or later
`app.config(...)` realtime config once that shape is accepted.

Browser-facing examples must demonstrate configured reconnect policy through
service config or directive attributes. They should not teach application-owned
`setTimeout(connect)` loops, duplicate native connection creation, or other
manual retry code around the managed services.

## Core Model

WebSocket and SSE share `ConnectionManager`.

The shared flow is:

1. A service call merges provider defaults with call-site config.
2. The service creates a native `WebSocket` or `EventSource`.
3. `ConnectionManager` binds open, message, error, close, and heartbeat
   callbacks.
4. Message payloads pass through `transformMessage` before user callbacks.
5. Errors, close events, and heartbeat inactivity schedule reconnect attempts
   while the connection is not explicitly closed.

WebTransport uses `ManagedWebTransportConnection` because native WebTransport is
promise and stream based rather than event-handler based. It preserves the
native `transport`, `ready`, and `closed` promises while adding datagram,
stream, reconnect, and protocol-message helpers.

Important invariants:

- Explicit `close()` stops future reconnect attempts.
- Runtime services own browser connections; providers own only construction
  defaults.
- Native WebSocket, EventSource, and WebTransport behavior remains reachable
  where the service exposes the native object or callback event.

## Lifecycle

Realtime connections are created immediately when the service function is called.
They remain live until closed by application code, directive cleanup, native
failure exhaustion, or browser page teardown.

WebSocket and SSE call `connect()` during `ConnectionManager` construction.
Calling `connect()` again closes the current native connection and opens a new
one unless the managed connection has already been closed.

WebTransport opens during `ManagedWebTransportConnection` construction. Its
`ready` promise resolves after the current native session is ready, and its
`closed` promise settles when the managed connection closes permanently.

## Lifecycle Contract

- Construction touches browser APIs immediately.
- `connect()` restarts WebSocket and SSE managed connections.
- `close()` stops reconnect attempts and closes the current native connection.
- WebTransport exposes `close(closeInfo?)` and keeps `transport` pointing at the
  current native session.
- Directive integrations must close connections during element/scope cleanup.
- Service-created connections are application-owned and must be closed by the
  caller when no longer needed.

## Reactivity Contract

- Current realtime services are callback-driven, not scope-reactive service
  state containers.
- Directives may bind a connection instance onto scope when they expose `as`
  aliases.
- Connection status is not yet a shared reactive model.
- Do not add reactive status until Pilot C accepts AppContext ownership,
  scheduler boundaries, and template use cases.

## Policy Contract

Current defaults:

- WebSocket: `retryDelay: 1000`, `maxRetries: Infinity`,
  `heartbeatTimeout: 0`, JSON transform fallback to raw text.
- SSE: `retryDelay: 1000`, `maxRetries: Infinity`,
  `heartbeatTimeout: 15000`, JSON transform fallback to raw text.
- WebTransport: reconnect is opt-in with `reconnect: true`; retry delay defaults
  to `1000`, and max retries default to no limit in the managed connection.

Call-site config can override retry delay, max retries, heartbeat timeout,
message transforms, lifecycle callbacks, and transport-specific options.

Future service-owned config should use `app.config(...)` only after the typed
realtime config shape is designed and tested. The accepted initial shape is a
declarative default policy per transport:

```ts
app.config({
  sse: { defaults: { retryDelay: 3000, maxRetries: 10 } },
  websocket: { defaults: { protocols: ["json"], heartbeatTimeout: 30000 } },
  webTransport: { defaults: { reconnect: true, retryDelay: 500 } },
});
```

These keys merge into provider defaults during the config phase. Per-connection
call-site config still overrides app defaults. This is intentionally not a
global `ServiceStatus` or public connection manager.

## Dependency Replacement Contract

These services replace common app-level boilerplate around:

- WebSocket reconnect loops.
- SSE reconnect and URL parameter assembly.
- WebTransport ready/closed promise handling.
- JSON message decoding with safe fallback.
- Explicit cleanup of long-lived browser transport objects.

They do not replace protocol design, authentication, authorization, durable
offline queues, or server-side session recovery. Those concerns compose through
security policy, workflow/supervisor policy, or application protocols.

## Composition Contract

- Lower-level: native WebSocket, EventSource, WebTransport, streams, timers, and
  `$log`.
- Same layer: `ConnectionManager` remains internal unless a later slice proves a
  public need.
- Higher-level: directives, realtime DOM protocol handling, workflow
  orchestration, and security policy may build on these services.
- Realtime services must not depend on DOM scopes for their base runtime
  lifecycle.

## Failure Contract

- Invalid WebTransport URLs throw synchronously before opening a browser
  connection.
- WebTransport constructor failures normalize `ready` rejection and `closed`
  settlement behavior.
- WebSocket and SSE browser `error` events call `onError` and schedule reconnect
  if retries remain.
- Reconnect exhaustion logs through `$log.warn`.
- Callback exceptions are not yet normalized into diagnostics; diagnostics are a
  future Pilot C decision.

## Recovery Contract

- Reconnect is in-memory and connection-local.
- No realtime service currently persists session state or unsent messages.
- WebTransport provides `onReconnect` so applications can renegotiate session
  state after a replacement native session is ready.
- Workflow supervisor or app protocols should own durable recovery if a
  connection needs replay, resume tokens, or idempotent command handling.

## Scheduling And Ordering

- Browser open/message/error/close events drive WebSocket and SSE callback order.
- Heartbeat timers reset on open and message.
- Heartbeat timeout closes the current native WebSocket/EventSource and opens a
  replacement connection through the same bounded reconnect policy used by
  native error and close events.
- Reconnect attempts are delayed by `retryDelay`.
- WebTransport datagram and stream reads are asynchronous and follow native
  stream ordering.

## Native Interop

- WebSocket and SSE callbacks receive the native event.
- WebSocket `send(data)` JSON-serializes application values.
- SSE uses native `EventSource` and supports `withCredentials`; custom headers
  are documented as config-only because EventSource does not natively support
  them.
- WebTransport exposes the current native `transport` and native stream methods
  where callers need browser-specific behavior.

## Test Harness

- `src/services/websocket/websocket.spec.ts` uses a mocked `window.WebSocket`.
- `src/services/sse/sse.spec.ts` uses browser/EventSource fixtures and local
  mocks for error, custom event, URL, and heartbeat behavior.
- `src/services/webtransport/webtransport.spec.ts` uses browser WebTransport
  integration and constructor failure fakes.
- `src/services/webtransport/webtransport.test.ts` skips the demo path when the
  WebTransport backend metadata endpoint is unavailable.

## Integration Points

- `src/services/connection/connection-manager.ts`: internal shared lifecycle
  manager for WebSocket and SSE.
- `src/directive/realtime/protocol.ts`: realtime DOM protocol message shape.
- `src/directive/websocket`, `src/directive/sse`, and
  `src/directive/webtransport`: template-level connection ownership.
- `src/services/security`: future source of auth/header/cookie policy used by
  realtime service config or app protocols.

## Edge Cases

- `heartbeatTimeout: 0` disables heartbeat checks.
- `maxRetries: Infinity` keeps retrying until explicit close.
- Calling `connect()` after `close()` on WebSocket/SSE is a no-op.
- SSE query parameter objects are JSON-serialized, while null and undefined
  become empty query values.
- WebTransport explicit close must not trigger reconnect.

## Destruction And Cleanup

- Service callers own cleanup for service-created connections.
- Directives own cleanup for directive-created connections.
- `close()` clears heartbeat/reconnect timers where available and closes the
  current native transport.
- Future reactive status must be owned by AppContext or root-specific directive
  scope, never by leaked DOM state.

## Types And Interfaces

`ConnectionConfig`
: Internal shared WebSocket/SSE lifecycle config.

`WebSocketConfig`
: WebSocket config, including protocols and realtime protocol callbacks.

`SseConfig`
: SSE config, including credentials, params, event types, and callbacks.

`WebTransportConfig`
: WebTransport config, including native options, datagram transforms,
reconnect policy, and renegotiation hooks.

`WebSocketConnection`
: Managed WebSocket connection with `connect`, `send`, and `close`.

`SseConnection`
: Managed SSE connection with `connect` and `close`.

`WebTransportConnection`
: Managed WebTransport connection with native `transport`, `ready`, `closed`,
datagram methods, stream methods, and `close`.

## Testing Notes

- Run `make check` and `make lint` before focused realtime tests.
- Focused tests:
  - `npx playwright test src/services/websocket/websocket.test.ts`
  - `npx playwright test src/services/sse/sse.test.ts`
  - `npx playwright test src/services/webtransport/webtransport.test.ts`
- Add deterministic fake-backend tests before changing reconnect or heartbeat
  behavior.
- Add type tests before accepting any `app.config({ $sse, $websocket,
$webTransport })` config shape.
