---
title: "Models"
weight: 55
description: "Use app.model() to declare shared reactive application state as an injectable service."
---

`app.model(name, initial)` declares a shared reactive model service. The
injected value is the proxied model object itself. Use models for shared,
declarative application state that should outlive one DOM scope tree.

Prefer the factory form:

```typescript
const app = angular.module("demo", []);

app.model("user", () => ({
  name: "John",
  authenticated: false,
}));
```

Then inject the model by name. Assigning the injected model to a controller
property or `$scope` property makes the model readable from templates:

```typescript
class HeaderController {
  static $inject = ["user"];

  constructor(public user: { name: string; authenticated: boolean }) {}
}
```

```html
<section ng-controller="HeaderController as header">
  <strong>{{ header.user.name }}</strong>
  <span>{{ header.user.authenticated ? "signed in" : "guest" }}</span>
</section>
```

When the model changes, DOM interpolation, `ng-bind`, and directive
expressions that read that model update automatically. Mutating the model proxy
is sufficient to schedule every affected observer.

Model data belongs to the app context, not to `$rootScope`. Every root scope
managed by the same app context resolves the same model instance. Destroying a
root scope removes that root's observations, but the model data survives while
the app context remains alive.

## Models Versus Local Scope

Use models for shared domain state such as `user`, `cart`, `session`, and
`settings`.

Use `$scope` for view-local state that only exists to support one template,
such as an open menu flag, a focused row id, or transient form display state.

Use `$eventBus` for cross-boundary messages, `$machine` for finite-state
transitions, and `$workflow` for command orchestration.

## Template Reactivity

App models can be bound directly:

```html
<p>{{ user.name }}</p>
<p ng-bind="user.profile.name"></p>
<p>{{ cart.items.length }}</p>
```

Controller-as bindings are first-class:

```html
<section ng-controller="ProfileCtrl as profile">
  <input ng-model="profile.user.name" />
  <button ng-click="profile.signIn()">Sign in</button>
</section>

<section ng-controller="HeaderCtrl as header">
  <strong>{{ header.user.name }}</strong>
  <span>{{ header.user.authenticated ? "signed in" : "guest" }}</span>
</section>
```

Nested object reads, parent replacement, array length reads, array mutation,
and property deletion follow the same scope proxy semantics as local scope
state.

## Model Shape

Root models must start as plain objects. Primitives, `null`, arrays, and class
instances are rejected as root model values. Nested values follow AngularTS
scope proxy behavior. Duplicate model names in one module are rejected.

Model factories should initialize state only. Put sockets, workers, timers,
DOM listeners, and other side effects in services, workflows, machines, or
policy-backed browser abstractions.

## Model Methods

Injected models are proxy-backed objects. They expose their own data properties,
the scope-proxy methods used by AngularTS reactivity, and model lifecycle
methods for whole-model coordination.

Those methods exist because models are implemented with the same proxy engine as
scopes. Application code should still treat a model as app-owned state, not as a
DOM scope.

Model-specific methods use a `$` prefix:

- `$snapshot()` creates a plain snapshot of model state.
- `$restore(snapshot, options?)` restores model state and notifies observers.
- `$sync(target)` synchronizes model updates with a direct target or injectable
  target factory.

`$persist(target)` and `$subscribe(listener)` are deferred convenience methods.
Persistence should first be proven as a durability-focused `$sync()` target, and
whole-model subscription should first be proven as `$sync()` implementation
machinery.

`$sync()` is intended for integrations such as Unity, WebSocket sessions,
workers, CRDT documents, and custom stores. The external runtime may update the
model imperatively, but AngularTS keeps the rest of the app declarative:

```text
runtime event
  -> model assignment
  -> model.$sync(...)
  -> websocket/store/worker/crdt target
```

Target factories should use normal AngularTS injectable form. Bare string
service-name shortcuts are intentionally avoided for consistency:

```js
playerModel.$sync([
  "playerSocketSync",
  (playerSocketSync) => playerSocketSync,
]);
```

```js
settingsModel.$sync([
  "$cookie",
  ($cookie) => ({
    restore: () => $cookie.getObject("settings"),
    write: (snapshot) => $cookie.putObject("settings", snapshot),
  }),
]);
```

A managed worker already exposes a model sync target, so no callback bridge is
required:

```js
app.worker("physicsWorker", "/workers/physics.js", { restart: true });

app.run([
  "playerModel",
  "physicsWorker",
  (playerModel, physicsWorker) =>
    playerModel.$sync(physicsWorker.model("player")),
]);
```

The worker exchanges standard `ng.WorkerModelMessage` envelopes. Incoming
snapshots update every DOM scope that consumes the model, while model mutations
are sent back with change metadata and loop-prevention origin tracking.

`$sync()` batches synchronous model mutations, sends a plain snapshot plus
modest change metadata, and uses origin metadata to prevent bidirectional sync
loops. Failures should report through AngularTS exception handling by default.

Durable storage should start as an explicit `$sync()` target. A settings model
can restore from `$cookie` and write future snapshots back to the same storage
boundary without adding persistence behavior to the model declaration itself.

A sync target can implement any combination of `restore`, `write`, `receive`,
and `dispose`:

```js
playerModel.$sync([
  "playerSocketSync",
  (socketSync) => ({
    restore: () => socketSync.latest(),
    write: (snapshot, change) => socketSync.send({ snapshot, change }),
    receive: (apply) => socketSync.onMessage((snapshot) => apply(snapshot)),
    dispose: () => socketSync.close(),
  }),
]);
```

`$sync()` validates this runtime boundary. A target must implement at least one
recognized operation, and every supplied operation must be a function.
`restore()` results and snapshots passed to `receive()` must be plain objects;
invalid external values are reported through the configured sync failure
policy without partially updating the model. `receive()` must return either a
disposer function or `undefined`.

Runtime validation establishes the model container contract, but it cannot
recover erased TypeScript property types. Sync targets remain responsible for
decoding and validating domain fields received from untrusted external data.

`$restore(snapshot, { mode: "merge" })` keeps existing model keys and writes the
incoming keys. The default mode replaces the model root's keys with the
snapshot's keys.

## Executable Sample

{{< showdemo src="examples/model/user-model.html" >}}

HTML:

{{< showhtml src="examples/model/user-model.html" >}}

JavaScript:

{{< showjs src="examples/model/user-model.js" >}}

## Sync Sample

{{< showdemo src="examples/model/settings-sync.html" >}}

HTML:

{{< showhtml src="examples/model/settings-sync.html" >}}

JavaScript:

{{< showjs src="examples/model/settings-sync.js" >}}
