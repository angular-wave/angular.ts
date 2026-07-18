# HTTP Directive Internals

This directory owns AngularTS declarative HTTP directives for request-triggered
DOM updates, form submission, response swapping, streamed responses, and SSE
connections. The implementation in `http.ts` is centered on one directive
factory builder, `createHttpDirective()`, which is specialized for `ng-get`,
`ng-delete`, `ng-post`, `ng-put`, and `ng-sse`.

## Responsibilities

- Register HTTP method directives for GET, DELETE, POST, PUT, and SSE.
- Choose the triggering DOM event from `trigger` or the host element default.
- Collect form data for POST and PUT requests.
- Build request config for encoding, streaming, and request cancellation.
- Route successful and failed responses to expressions, states, or DOM swaps.
- Consume streamed HTTP responses and compile/swap each text chunk.
- Open SSE connections, dispatch lifecycle DOM events, and process realtime
  protocol messages.
- Clear intervals, abort streams, and close SSE connections when the directive
  scope is destroyed.

## Public Surface

- `ngGetDirective`: declarative GET request directive.
- `ngDeleteDirective`: declarative DELETE request directive.
- `ngPostDirective`: declarative POST request directive.
- `ngPutDirective`: declarative PUT request directive.
- `ngSseDirective`: SSE directive built from the GET request path with the
  `ngSse` attribute.
- `createHttpDirective(method, attrName)`: creates a directive factory for one
  method/attribute pair.
- Re-exported realtime protocol types and `SwapMode` values from
  `../realtime/protocol.ts`.

Public attributes consumed by the directives include `trigger`, `latch`,
`interval`, `delay`, `throttle`, `loading`, `loadingClass`, `swap`, `data-target`,
`onSuccess`, `onError`, `stateSuccess`, `stateError`, `enctype`, `responseType`,
`stream`, `responseStream`, `withCredentials`, `sseEvents`, and
`onReconnect`.

## Core Model

All method directives share the same link-time model. `defineDirective()` maps a
method to its normalized directive attribute name and injects the services
needed by `createHttpDirective()`. The linked element then owns one event
listener, optional polling interval, a destroy promise for `$http` timeouts, and
an `AbortController` for stream consumption.

The main flow is:

1. Read normalized attributes directly from the element, using internal
   observation helpers where interpolation needs live updates.
2. Determine the event that should trigger a request.
3. Optionally trigger from `latch` changes or `interval` polling.
4. On trigger, skip disabled controls and prevent native form submission.
5. Apply `delay`, `throttle`, `loading`, and `loadingClass` behavior.
6. Send the request through `$http` or open an SSE connection through `$sse`.
7. Route the response to expressions, router states, scope data, stream
   consumption, or the realtime swap handler.

Important invariants:

- Destroyed scopes must not start delayed requests.
- Stream consumption must receive the destroy `AbortSignal`.
- Polling intervals must be cleared on scope destruction.
- SSE connections must close on scope destruction or cancelled lifecycle
  events.
- Loading state must be removed when a response or SSE open event completes
  the request setup.

## Lifecycle

During link, the directive reads the event name, sets up optional `latch` and
`interval` triggers, creates destroy/cancellation state, and installs the main
event listener. The listener builds request config and handles request dispatch
each time it runs.

For normal HTTP responses, the handler evaluates success/error expressions,
navigates success/error states, consumes stream responses, or swaps string/HTML
responses into the DOM. Object responses are exposed to `on-success` as `$res`
and never mutate scope implicitly.

For `ng-sse`, the directive opens an `$sse` connection and wires open, message,
custom event, error, reconnect, swapped, close, and cancellation behavior. The
same response handler is reused for raw SSE message payloads, while structured
realtime protocol messages can target specific DOM nodes and override swap
mode.

## Scheduling And Ordering

- Request triggers run from DOM events, `latch` observers, `interval` timers,
  or an initial `load` dispatch.
- `delay` waits before throttle/loading/request work begins.
- `throttle` suppresses additional requests until its timeout releases.
- HTTP response handlers run from promise resolution or rejection.
- Streamed responses are consumed chunk-by-chunk through `$stream.consumeText`.
- SSE lifecycle and message events are dispatched synchronously from the SSE
  callbacks; cancelling a dispatched event closes the source.

## Data Structures

- `HttpDirectiveMethod`: method union for `get`, `delete`, `post`, and `put`.
- `HttpDirectiveElement`: host element shape used for form-associated controls.
- `HttpRequestOptionsWithHeaders`: `$http` options plus optional headers.
- `destroyPromise`: request timeout promise resolved on scope destruction.
- `destroyController`: abort controller passed to stream consumers.
- `sourceRef`: mutable reference to the active SSE connection.
- Realtime protocol messages: structured payloads with optional `html`,
  `data`, `target`, and `swap` fields.

## Integration Points

- `$http`: sends GET, DELETE, POST, and PUT requests.
- `$compile`: compiles swapped HTML and streamed fragments.
- `$parse`: evaluates on-success/on-error and reconnect expressions.
- `$state`: performs `stateSuccess` and `stateError` navigation.
- `$sse`: opens and manages SSE connections.
- `$stream`: consumes readable stream response bodies as text chunks.
- DOM attribute helpers: read normalized attributes and mutate
  loading/throttled state and loading classes directly on the element.
- Realtime swap handler: applies `innerHTML`, `outerHTML`, `textContent`,
  insertion, deletion, and targeted swap modes.
- Browser `FormData`: collects values from forms and form-associated controls.

## Edge Cases

- Disabled host elements do not trigger requests.
- Forms prevent their native submit action while the directive handles the
  request.
- A missing URL logs a warning and skips request dispatch.
- POST and PUT use JSON object data by default, but `enctype` switches to
  encoded key/value form data and sets `Content-Type`.
- Object responses require an explicit `on-success` expression to update scope.
- `data-target` is always a CSS selector for DOM swaps.
- Missing DOM targets leave the original DOM unchanged and are reported by the
  swap handler.
- `response-type="stream"`, `stream`, and `response-stream` all request stream
  handling.
- Empty or cancelled SSE lifecycle events can close the active connection.

## Destruction And Cleanup

The directive resolves the destroy timeout promise, aborts stream consumption,
and clears polling intervals when the scope is destroyed. SSE directives also
dispatch `ng:sse:close` and close the active source. Delayed requests check
`scope._destroyed` before dispatching so a destroyed scope cannot start a
request after its delay finishes.

## Types And Interfaces

`HttpDirectiveMethod`
: Internal method union used by `defineDirective()` and
`createHttpDirective()`.

`HttpDirectiveElement`
: Host element type with optional form-associated properties.

`HttpResponsePayload`
: Response payload shape accepted by the shared handler: readable stream,
string, or object.

`HttpRequestOptionsWithHeaders`
: `$http` request config extended with optional HTTP headers.

`RealtimeProtocolMessage`
: Structured realtime message consumed by `ng-sse` and the swap handler.

`SwapMode`
: Swap mode accepted by the realtime swap pipeline.

## Testing Notes

- `get.spec.ts` covers GET requests, swaps, targets, animation, streams, SSE,
  delay, throttle, interval, loading state, success/error expressions, and
  router state transitions.
- `post.spec.ts` covers POST requests, form data collection, encoding,
  streams, swaps, targets, delay, throttle, interval, loading state, and
  success/error routing.
- `delete.spec.ts` and `put.spec.ts` cover streamed response swapping for those
  methods.
- `http-attributes.spec.ts` covers normalized `data-*` attribute reads and
  internal attribute mutation behavior.
