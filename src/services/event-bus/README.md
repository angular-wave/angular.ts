# EventBus Service

`$eventBus` is the application-wide asynchronous publish/subscribe primitive.
It connects scopes, browser callbacks, workers, realtime services, and
non-Angular runtimes without making the DOM or a scope tree the event owner.

## Public Surface

- `EventBus`: subscribes, publishes, unsubscribes, resets, and disposes topics.
- `EventBusConfig`: typed `NgModule.config({ $eventBus: ... })` configuration.
- `EventDeliveryPolicy`: gates each listener delivery with normalized context.
- `eventBusModule`: installs `$eventBus` in a custom runtime.

```ts
import { createAngular } from "@angular-wave/angular.ts/runtime";
import { eventBusModule } from "@angular-wave/angular.ts/runtime/event-bus";

const angular = createAngular({
  modules: [eventBusModule],
});
```

## Core Model

An `EventBus` stores ordered listener entries by topic. Publishing snapshots the
current entries and schedules delivery in a microtask. Passing a scope proxy as
the listener context makes that scope own subscription cleanup and retained-view
pause/resume behavior.

The injected service is lazy and shared across injectors belonging to one
Angular runtime. Runtime composition exposes the same instance as
`angular.$eventBus`.

## Lifecycle Contract

- Injecting `$eventBus` constructs it on first use.
- Scope-owned subscriptions are removed when their scope is destroyed.
- Runtime destruction disposes a framework-created bus exactly once.
- A bus supplied on `angular.$eventBus` is reused but remains externally owned.
- `dispose()` clears listeners and prevents work until `reset()` is called.

## Reactivity Contract

EventBus delivers events; it does not own application state. Listeners project
payloads into models or scopes when reactive state should change. Scope-owned
listeners respect retained-view scheduler pauses without turning topics into
scope events.

## Policy Contract

The default delivery policy returns `"deliver"`. Applications can configure a
typed policy through `app.config({ $eventBus: { deliveryPolicy } })`. The policy
runs once per active listener and can return `"deliver"` or `"drop"`. Policy
errors and unsupported decisions are forwarded to `$exceptionHandler`.

## Dependency Replacement Contract

`$eventBus` replaces ad hoc global emitters and manual scope cleanup wiring. It
adds application ownership, delivery policy, retained-view awareness, ordered
microtask delivery, and centralized exception handling. It does not replace
models, stores, scope-tree events, or durable message queues.

## Composition Contract

- Full runtimes compose `$eventBus` through `eventBusRuntimeRegistration`.
- Custom runtimes opt in through `eventBusModule`.
- The service depends only on `$exceptionHandler` and runtime identity.
- Machine, workflow, realtime, and external runtime adapters may publish or
  subscribe without becoming EventBus dependencies.

## Failure Contract

Subscriber and policy exceptions are reported through `$exceptionHandler`.
Publishing to an empty topic or disposed bus returns `false`. Invalid policy
decisions are treated as errors and are not delivered.

## Scheduling And Ordering

Subscription changes are synchronous. Publication delivery is asynchronous and
preserves listener registration order from the publication snapshot. Listener
changes after `publish()` do not alter that snapshot.

## Test Harness

- `event-bus.spec.ts` covers composition, configuration, ownership, policy,
  scope cleanup, retained views, ordering, errors, and disposal.
- `event-bus-types.spec.ts` covers context-bound listener typing.
- `event-bus.test.ts` runs the browser suite through Playwright.
