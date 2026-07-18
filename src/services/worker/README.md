# Worker Service

`$worker` creates page-owned Web Workers with typed messages, managed lifetime,
reactive status, and optional restart policy. Service workers remain separate
under `src/services/service-worker`.

## Public Surface

```ts
const worker = $worker<Request, Result>("/workers/calculate.js", {
  type: "module",
  name: "calculator",
  restart: true,
  restartDelay: 1000,
  maxRestarts: 3,
  decode: (data, event) => data as Result,
});

worker.onMessage((result) => {
  model.result = result;
});
worker.onError((error) => {
  model.error = error.message;
});
worker.post(request, [request.buffer]);

const result = await worker.request(request, {
  timeout: 5000,
  transfer: [request.buffer],
});
```

`WorkerConfig` includes the browser's `WorkerOptions`; `type`, `name`, and
`credentials` pass directly to the native constructor. The default type is
`module`. Native messages already use structured cloning, so inbound data is
delivered unchanged unless `decode` is provided.

## Lifecycle And Reactivity

`WorkerHandle` exposes reactive `status`, `error`, and `restartCount`
properties. Assigning a connection to a scope or context model binds those
properties to AngularTS scheduling without making the worker DOM-owned.

- `restart()` replaces the native worker and increments `restartCount`.
- `restart` replaces a failed worker using bounded exponential backoff.
- `restartDelay` sets the base delay and `maxRestarts` limits replacements. Both
  require `restart: true`; AngularTS rejects restart settings that would be
  silently ignored.
- `restartDelay` must be finite and non-negative. `maxRestarts` accepts a
  non-negative integer or `Infinity` for an explicit unlimited policy.
- `terminate()` is idempotent and permanently sets `status` to `terminated`.
- Handles created by `$worker` are terminated with their `AppContext`.
- Posting after termination throws.

`onMessage` and `onError` return disposal functions. Callers with a lifetime
shorter than the application should dispose subscriptions and terminate the
connection explicitly.

Native runtime errors, `messageerror` events, decoder failures, request
failures, and request timeouts are reported as `WorkerError`. Its `code`,
`cause`, and optional native `event` make every failure observable without
turning a malformed message into a worker crash.

## Correlated Requests

`request()` wraps its payload in a standard `WorkerRequest` envelope. The
worker returns a `WorkerResponse` with the same ID:

```ts
self.onmessage = async ({ data }: MessageEvent<WorkerRequest<Request>>) => {
  if (data.type !== "angular-ts:worker:request") return;

  try {
    const result = await calculate(data.payload);

    self.postMessage({
      type: "angular-ts:worker:response",
      id: data.id,
      ok: true,
      result,
    } satisfies WorkerResponse<Result>);
  } catch (error) {
    self.postMessage({
      type: "angular-ts:worker:response",
      id: data.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies WorkerResponse);
  }
};
```

Raw `post()` and `onMessage()` remain available for streams and unsolicited
events. Correlated response envelopes are consumed by `request()` and are not
also delivered to raw message subscribers.

## Model Synchronization

`model(channel)` returns a normal `ModelSyncTarget`:

```ts
const stop = playerModel.$sync(playerWorker.model("player"));
```

The worker receives `angular-ts:worker:model:subscribe` when synchronization
starts and `angular-ts:worker:model:update` after model changes. It publishes
state with `angular-ts:worker:model:snapshot`. Channels let one worker host more
than one model. Model-origin tracking prevents incoming snapshots from being
echoed immediately back to the same worker target.

```ts
self.onmessage = ({ data }: MessageEvent<WorkerModelMessage<Player>>) => {
  if (data.type === "angular-ts:worker:model:subscribe") {
    self.postMessage({
      type: "angular-ts:worker:model:snapshot",
      channel: data.channel,
      snapshot: player,
    } satisfies WorkerModelMessage<Player>);
  } else if (data.type === "angular-ts:worker:model:update") {
    player = data.snapshot;
  }
};
```

## Security

Worker script creation passes through `$security` before the native constructor
runs. Cookie credentials follow native `WorkerOptions.credentials`; bearer and
basic policies deny worker creation because the Worker constructor cannot attach
an `Authorization` header.

## Recovery Boundary

Restart replaces the process but does not replay messages, restore worker-local
state, or persist progress. Workflows and supervisors own durable recovery when
a background job must survive worker replacement.

## Tests

`worker.spec.ts` covers native options, transferables, decoding, subscriptions,
requests, model synchronization, typed failures, reactive state, restart,
termination, security, and application teardown.
`worker.test.ts` runs the suite in Playwright.
