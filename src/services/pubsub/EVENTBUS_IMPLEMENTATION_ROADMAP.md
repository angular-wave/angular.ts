# EventBus Implementation Roadmap

This roadmap brings `$eventBus` and its directives into the AngularTS level-9
reactivity and lifecycle policy without turning the service into a state
manager.

`$eventBus` should remain a small application-wide pub/sub primitive. The
hardening point is context: when the subscription context is an AngularTS scope
proxy, the context owns the listener lifecycle.

## Goal

Make `$eventBus.subscribe(topic, listener, context?)` lifecycle-aware while
preserving the existing public method.

Target behavior:

```ts
const off = $eventBus.subscribe(
  "cart:item-added",
  function (item) {
    this.cartCount += 1;
  },
  $scope,
);
```

When `context` is a scope proxy:

- listener `this` is the scope
- the listener is automatically removed on `$destroy`
- the returned `off` function still unsubscribes manually
- double cleanup is safe
- destroyed scopes do not receive queued async delivery

When `context` is not a scope proxy:

- existing callback binding behavior remains unchanged
- caller remains responsible for cleanup

## Non-Goals

- Do not add a separate `subscribeScoped()` public API.
- Do not make `$eventBus` a general state store.
- Do not add global reactive state to `$eventBus`.
- Do not make scope events obsolete.
- Do not remove `subscribe()` or `subscribeOnce()` compatibility.
- Do not make `$eventBusProvider` the normal user path.

## Public Contract

`context` has two meanings:

- callback binding for all values
- lifecycle owner when the value is an AngularTS scope proxy

This lets AngularTS infer lifecycle responsibility from a primitive users
already pass.

## Slice 1: Current Behavior Inventory

Document and test the current public behavior before changing internals.

Scope:

- `src/services/pubsub/pubsub.ts`
- `src/services/pubsub/pubsub.spec.ts`
- `src/directive/channel/channel.ts`
- `src/directive/channel/channel.spec.ts`
- `docs/content/docs/services/pubsub.md`
- `docs/content/docs/directive/channel.md`

Acceptance:

- inventory notes current `subscribe`, `subscribeOnce`, `unsubscribe`,
  `publish`, `reset`, `dispose`, and `getCount` behavior
- docs identify `$eventBus` as a cross-boundary utility, not scope-tree
  communication
- `ng-channel` current manual cleanup is documented as implementation detail
- no runtime behavior changes

Verification:

```bash
npx playwright test src/services/pubsub/pubsub.test.ts
npx playwright test src/directive/channel/channel.spec.ts
make docs-examples-check
```

## Slice 2: Harden Listener Types

Make context typing express callback binding without changing runtime behavior.

Target type shape:

```ts
type PubSubListener<TContext = unknown> = (
  this: TContext,
  ...args: unknown[]
) => unknown;

subscribe(topic: string, fn: PubSubListener): () => boolean;

subscribe<TContext>(
  topic: string,
  fn: PubSubListener<TContext>,
  context: TContext,
): () => boolean;
```

Apply the same context typing to `subscribeOnce`.

Acceptance:

- existing unbound listener calls still typecheck
- context-bound listeners infer `this`
- scope context listeners typecheck without casting
- invalid listener/context assumptions fail type checks where TypeScript can
  express them
- no runtime behavior changes

Verification:

```bash
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 3: Scope Context Auto-Unsubscribe

Teach `subscribe()` that a scope proxy context is a lifecycle owner.

Implementation rules:

- use `isProxy(context)` to detect AngularTS scope proxies
- subscribe normally with the same context
- register cleanup through `context.$on("$destroy", unsubscribe)`
- return one cleanup function that removes both the event listener and the
  `$destroy` listener
- cleanup must be idempotent
- `getCount(topic)` must not count destroyed scope listeners after cleanup

Acceptance:

- `subscribe(topic, fn, $scope)` auto-unsubscribes on `$destroy`
- calling the returned cleanup before `$destroy` unregisters the `$destroy`
  hook
- calling cleanup after `$destroy` is safe
- non-scope context behavior is unchanged
- unbound listener behavior is unchanged

Verification:

```bash
npx playwright test src/services/pubsub/pubsub.test.ts
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 4: Queued Delivery Safety

Ensure destroyed scope contexts do not receive queued async delivery.

Problem:

- `publish()` snapshots listeners and delivers them in a microtask.
- A scope can be destroyed after `publish()` snapshots listeners but before the
  microtask runs.
- Scope-owned listeners should not run after their lifecycle owner is
  destroyed.

Design options:

- mark listener entries inactive on unsubscribe and skip inactive snapshot
  entries
- or check current registration before invoking a snapshot entry

Decision:

- preserve existing async publish ordering for active listeners
- skip inactive/destroyed scope-owned listeners before invocation
- keep generic unsubscribe-after-publish semantics explicit in tests

Acceptance:

- a scope destroyed before the publish microtask does not receive the event
- active listeners still receive events in subscription order
- one listener throwing still routes to `$exceptionHandler` and does not block
  later active listeners

Verification:

```bash
npx playwright test src/services/pubsub/pubsub.test.ts
```

## Slice 5: `subscribeOnce()` Scope Context

Apply the same scope lifecycle semantics to `subscribeOnce()`.

Rules:

- `subscribeOnce(topic, fn, context)` must pass context through the internal
  subscription path
- scope destruction before first delivery removes the one-time listener
- first delivery removes both listener and `$destroy` hook
- callback `this` remains the provided context

Acceptance:

- `subscribeOnce(topic, fn, $scope)` auto-cleans on `$destroy`
- `subscribeOnce(topic, fn, $scope)` runs at most once
- no lingering `$destroy` listener after first delivery
- existing non-scope `subscribeOnce` behavior is preserved

Verification:

```bash
npx playwright test src/services/pubsub/pubsub.test.ts
./node_modules/.bin/tsc --project tsconfig.test.json
```

## Slice 6: Migrate `ng-channel`

Make `ng-channel` use the hardened context behavior instead of manually owning
cleanup.

Current pattern:

```ts
const unsubscribe = $eventBus.subscribe(channel, listener);
scope.$on("$destroy", () => unsubscribe());
```

Target pattern:

```ts
$eventBus.subscribe(channel, listener, scope);
```

Rules:

- directive behavior remains unchanged
- template payloads still merge object payloads into scope
- string payloads still replace `innerHTML` when there is no template content
- normalized `data-ng-channel` aliases still work
- destroyed directive scopes stop receiving queued events

Acceptance:

- `ng-channel` calls `$eventBus.subscribe(channel, listener, scope)`
- directive no longer manually registers `$destroy` cleanup
- existing directive tests pass after expectation update
- add test for publish followed by scope destroy before microtask delivery

Verification:

```bash
npx playwright test src/directive/channel/channel.spec.ts
```

## Slice 7: Diagnostics Without State Inflation

Keep diagnostics small and implementation-oriented.

Allowed:

- retain `getCount(topic)` as active listener count
- add internal test helpers only if needed
- document cleanup behavior

Defer unless proven necessary:

- public scoped listener count
- public topic listing
- leak reports
- reactive diagnostics

Acceptance:

- no new public diagnostic API unless tests show a real user need
- leak prevention is proven through behavior tests
- `$eventBus` stays classified as a utility service

Verification:

```bash
npx playwright test src/services/pubsub/pubsub.test.ts
```

## Slice 8: Docs And Samples

Update docs to teach context hardening as the normal scope-owned path.

Docs to update:

- `docs/content/docs/services/pubsub.md`
- `docs/content/docs/service/eventBus.md`
- `docs/content/docs/directive/channel.md`
- `docs/content/docs/provider/eventBusProvider.md`

Rules:

- teach `$eventBus.subscribe(topic, listener, $scope)` for controllers,
  directives, and components
- teach `$eventBus.subscribe(topic, listener)` for long-lived services and
  external integrations
- keep scope events recommended for parent/child scope-tree communication
- mark `$eventBusProvider` as advanced/internal replacement only, not normal app
  authoring
- include one docs sample where scope destruction auto-cleans the subscription

Acceptance:

- docs no longer require manual `$scope.$on("$destroy", unsubscribe)` for
  scope-owned `$eventBus` subscriptions
- docs explain that scope context means callback binding plus lifecycle
  ownership
- docs examples pass API reference checks

Verification:

```bash
make docs-examples-check
make doc
```

## Slice 9: Public Surface And Generated Docs

Apply the level-9 documentation requirement for any type changes.

Rules:

- update TypeDoc comments on `PubSub` and `PubSubProvider`
- update public inventory when it exists
- classify `PubSubProvider` as config-free or advanced/legacy unless provider
  inventory proves real user-facing configuration
- do not expose new implementation-only listener entry types

Acceptance:

- generated declarations include the hardened listener/context types
- TypeDoc explains context lifecycle behavior
- provider docs do not promote `$eventBusProvider` as the normal user path
- `src/DOCUMENTATION_REQUIREMENT.md` is satisfied

Verification:

```bash
make generated-check
make docs-examples-check
make doc
```

## Final Readiness Gate

`$eventBus` and `ng-channel` satisfy the level-9 utility-service contract when:

- context typing is strict enough to model callback `this`
- scope proxy context auto-owns subscription cleanup
- destroyed scopes do not receive queued events
- `subscribeOnce` follows the same lifecycle rule
- `ng-channel` delegates cleanup to `$eventBus`
- docs teach context hardening instead of manual teardown for scope-owned
  subscribers
- `$eventBusProvider` is documented as advanced/provider machinery
- tests cover manual cleanup, scope cleanup, one-time cleanup, queued delivery,
  errors, and directive behavior
