# Log Internals

This directory owns the injectable `$log` facade. `log.ts` keeps logging policy
in a plain runtime configuration record and constructs either a console-backed
service or an application-supplied `LogService` lazily.

## Responsibilities

- Expose `log`, `info`, `warn`, `error`, and `debug` methods through DI.
- Normalize `Error` objects before writing them to the browser console.
- Suppress default debug output unless typed configuration enables it.
- Allow applications to replace the complete logging implementation.
- Optionally mirror selected levels to `navigator.sendBeacon()`.

## Public Surface

- `LogService`: named contract for the `$log` injectable.
- `LogConfig`: configuration accepted by `module.config({ $log: ... })`.
- `LogBeaconConfig`: opt-in Beacon endpoint, level, serializer, and failure
  policy.
- `LogEntry`: structured record passed to remote serializers.
- `LogBeaconSerializer`: application-owned conversion to `BodyInit`.
- `LogLevel`: supported logging severity names.
- `LogServiceFactory`: factory for an application-owned logger.
- `LogCall`: common logging method signature.

```ts
app.config({
  $log: {
    debug: true,
    beacon: {
      url: "/api/client-logs",
      levels: ["warn", "error"],
      serializer: "clientLogSerializer",
    },
  },
});
```

## Core Model

Runtime composition owns one mutable configuration record. Module config
blocks merge into that record before the injector constructs `$log`. The lazy
factory either invokes the configured logger factory or binds methods from the
runtime window's console.

Important invariants:

- Configuration does not require a provider token.
- Partial config calls preserve fields set by earlier calls.
- A custom logger owns all of its local method behavior, including debug
  filtering; configured Beacon delivery composes around it.
- The default implementation preserves the console receiver when invoking
  native methods.
- Beacon configuration is opt-in and defaults to sending only `error` entries.
- A named serializer is resolved through the application injector when `$log`
  is first constructed.

## Lifecycle Contract

- Configuration is created when browser providers are composed.
- The logger service is created on first injection.
- `$log` owns no subscriptions or persistent native resources, so it requires
  no service-specific disposer. The browser owns each successfully queued
  Beacon request.

## Reactivity Contract

Logging has no reactive state. Calls are synchronous and do not schedule scope
updates. Applications that need observable diagnostics should publish explicit
models or events from their custom logger.

## Policy Contract

- `debug` defaults to `false` for the console-backed service.
- `logger` replaces the local implementation while preserving configured
  Beacon delivery.
- `beacon: false` disables Beacon configuration inherited from an earlier
  module configuration call.
- Beacon serialization and queueing failures warn locally by default;
  `failure: "ignore"` suppresses that warning.
- Policy is merged during module configuration before lazy construction.

## Dependency Replacement Contract

`$log` removes direct console coupling from framework and application code and
provides one replacement point for telemetry integrations. Beacon delivery is
one request per selected call. It intentionally does not provide buffering,
persistence, transport retries, redaction, acknowledgement, or log storage.
Applications must use a named serializer when remote payloads require secret
removal or application metadata.

## Composition Contract

- Browser runtime composition supplies the native console.
- `$exceptionHandler`, directives, and services consume the public `$log`
  contract through DI.
- Logging does not depend on scopes, the DOM compiler, router, machine, or
  workflow modules.

## Failure Contract

- Logger exceptions propagate synchronously to the caller.
- A custom factory must return a complete `LogService` implementation.
- The default logger falls back to `console.log` when a requested console
  method is unavailable.
- Beacon failures never interrupt the logging caller. They follow the
  configured `warn` or `ignore` failure policy.

## Scheduling And Ordering

Local logging calls execute synchronously in call order. `$log` invokes
`sendBeacon()` after local output and does not batch, retry, or reorder entries.

## Native Interop

The default implementation wraps the runtime window's `Console`. Optional
remote delivery binds the runtime window's `Navigator.sendBeacon`. Applications
requiring another sink configure a `LogServiceFactory` or decorate `$log`.

## Test Harness

- `log.spec.ts` verifies injection, console delegation, debug gating, error
  formatting, config merging, custom logger replacement, Beacon level
  filtering, injectable serialization, and failure containment.
- `log.test.ts` executes the suite in a browser through Playwright.
