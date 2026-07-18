# Utility Services

This README covers the Tier 4 utility-service contract for:

- `$log`
- `$exceptionHandler`
- `$eventBus` / `EventBus`
- `$sce`

These services should stay intentionally small. Most lifecycle, reactivity,
recovery, scheduling, and native-resource contracts are not applicable unless a
specific service already owns that behavior.

## `$log`

Responsibility:

- Provide injectable logging methods: `log`, `info`, `warn`, `error`, and
  `debug`.
- Normalize `Error` objects into readable console output when using the default
  console-backed logger.

Policy:

- `debug` controls whether `$log.debug(...)` writes.
- `logger` can replace the console-backed implementation.
- No reactive state, diagnostics model, or log buffering is introduced.

Failure:

- `$log` does not catch logger failures. A custom logger owns its own error
  behavior.

Dependency replacement and composition:

- `$log` replaces direct `console` coupling in framework and app code.
- Reporting pipelines should compose by supplying a custom logger or decorating
  `$log`; `$log` itself remains a thin facade.

## `$exceptionHandler`

Responsibility:

- Provide the central AngularTS error sink for framework-managed failures.
- Default behavior is fail-fast: rethrow the received value unchanged.

Policy:

- `exceptionHandler.handler` can replace the default function.
- Custom handlers should report and rethrow because AngularTS assumes
  `$exceptionHandler` does not hide broken app state.
- No retry, recovery, or diagnostics model is introduced here.

Failure:

- The default handler rethrows `Error` instances, primitive values, objects,
  `null`, and `undefined` unchanged.
- The returned service wrapper always delegates to the latest runtime-owned
  handler.

Dependency replacement and composition:

- `$exceptionHandler` replaces scattered framework try/catch reporting hooks.
- Application reporting, telemetry, and redaction compose inside the configured
  handler.

## `$eventBus` / `EventBus`

Responsibility:

- Provide application-wide asynchronous publish/subscribe messaging for
  decoupled producers and consumers.
- Expose the singleton `$eventBus` through dependency injection and on the
  Angular service for non-DI integrations.

Policy:

- Delivery is asynchronous through `queueMicrotask`.
- Listener invocation order follows subscription order from a publish-time
  snapshot.
- `subscribeOnce` removes its listener before first invocation.
- Passing an AngularTS scope as the listener context makes that scope the
  lifecycle owner: `$destroy` auto-unsubscribes the listener.
- Queued deliveries skip scope-owned listeners when the owning scope is
  destroyed before the microtask runs.

Failure:

- Subscriber exceptions are forwarded to `$exceptionHandler`.
- One failing subscriber does not stop delivery to remaining subscribers.
- Disposed buses ignore subscription and publish attempts.

Dependency replacement and composition:

- `$eventBus` replaces ad hoc global callback registries for cross-boundary app
  events.
- Scope events remain the better primitive for parent/child scope-tree
  communication.
- Realtime services, worker services, workflows, and app integrations can
  publish onto `$eventBus`; `$eventBus` does not own their lifecycle or state.

## `$sce`

Responsibility:

- Provide Strict Contextual Escaping helpers and trusted-value wrappers.
- Enforce trusted resource URL policy for template/resource loading and
  sensitive bindings.

Policy:

- SCE is enabled by default.
- `sce.enabled` can disable SCE, but user docs classify this as risky.
- `sceDelegate.trustedResourceUrlList` and
  `sceDelegate.bannedResourceUrlList` define resource URL policy; banned
  patterns override trusted patterns.
- URL and media contexts are sanitized when possible; resource URLs must match
  policy or be explicitly trusted.

Failure:

- Invalid trust contexts and trust values route through `$exceptionHandler` or
  throw according to the SCE delegate path.
- Untrusted resource URLs are blocked.
- HTML sanitization requires a sanitizer; without one, unsafe HTML trust checks
  fail rather than silently rendering unsafe content.

Dependency replacement and composition:

- `$sce` replaces scattered manual escaping and URL allowlist checks at
  sensitive binding boundaries.
- It composes with `$templateRequest`, directives that bind privileged
  contexts, security policy docs, and optional sanitizer modules.

## Test Harness

- `src/services/log/log.spec.ts` verifies injection, default console behavior,
  debug policy, error formatting, partial config merging, and custom logger
  replacement.
- `src/services/exception/exception.spec.ts` verifies default rethrow behavior,
  configured handler delegation, primitive/object rethrows, and late handler
  replacement.
- `src/services/event-bus/event-bus.spec.ts` verifies subscription, unsubscription,
  contexts, one-time listeners, asynchronous publish behavior, disposal, and
  exception-handler delegation.
- `src/services/sce/sce.spec.ts` verifies trusted contexts, delegate override,
  resource URL policy, banned-list precedence, URL sanitization, and unsafe HTML
  failure behavior.
