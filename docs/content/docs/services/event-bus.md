---
title: 'Decoupled Messaging'
weight: 390
description:
  'Use $eventBus for application-wide publish/subscribe messaging and scope
  events for scope-tree communication.'
---

AngularTS has two messaging models:

- `$eventBus` is an application-wide
  [`EventBus`](../../../typedoc/classes/EventBus.html) instance for decoupled
  communication, including messages from non-Angular code.
- Scope events (`$scope.on`, `$scope.emit`, `$scope.broadcast`) travel through
  the scope tree and are best for parent/child communication.

Exact `$eventBus` method signatures live in TypeDoc:

- [`EventBus`](../../../typedoc/classes/EventBus.html)

## Publish and subscribe

Inject `$eventBus` when a publisher and subscriber should not know about each
other.

```ts
class CartService {
  static $inject = ['$eventBus'];

  constructor(private $eventBus: ng.EventBusService) {}

  addItem(product: Product, quantity: number) {
    this.eventBus.publish('cart:item-added', { product, quantity });
  }
}

class HeaderController {
  static $inject = ['$eventBus', '$scope'];

  cartCount = 0;

  constructor($eventBus: ng.EventBusService, $scope: ng.Scope) {
    const unsubscribe = $eventBus.subscribe('cart:item-added', () => {
      const view = $scope['$ctrl'] as HeaderController;

      view.cartCount += 1;
    });

    $scope.on('$destroy', unsubscribe);
  }
}
```

`subscribe()` returns an unsubscribe function. Keep that function and call it
during teardown, especially from long-lived services, directive controllers, or
manually bootstrapped integrations.

## One-time listeners

Use `subscribeOnce()` for initialization handshakes where only the first event
matters.

```ts
class AnalyticsBootstrap {
  static $inject = ['$eventBus'];

  constructor($eventBus: ng.EventBusService) {
    $eventBus.subscribeOnce('analytics:ready', (sdk) => {
      sdk.track('session_start');
    });
  }
}

window.onAnalyticsReady = (sdk) => {
  angular.eventBus.publish('analytics:ready', sdk);
};
```

## Async delivery

`$eventBus` schedules delivery with `queueMicrotask`. `publish()` returns after
scheduling the event, and subscribers run after the current call stack.

```ts
$eventBus.subscribe('order:created', (order) => {
  console.log('subscriber', order.id);
});

$eventBus.publish('order:created', { id: 42 });
console.log('publisher finished');
```

This makes `$eventBus` useful for browser callbacks, WebSocket messages, Web
Worker results, and other boundaries where you want the publisher to stay
independent of Angular controller timing. When a subscriber changes view state,
write through proxied scope or controller state so AngularTS can observe the
assignment.

## Error handling

If a subscriber throws, `$eventBus` forwards the value unchanged to
`$exceptionHandler`. The default handler rethrows, so the current publication
stops at that listener. Do not rely on later listeners running after an
exception.

```ts
$eventBus.subscribe('order:created', () => {
  throw new Error('failed listener');
});

$eventBus.subscribe('order:created', logCreatedOrder);
```

Subscribers that need independent failure ownership should start an operation
with its own result or rejection boundary instead of using listener order as a
recovery mechanism.

## Control delivery with a policy

Configure one callable policy when event delivery must follow an
application-wide rule. The callback is contextually typed as
[`EventDeliveryPolicy`](../../../typedoc/types/EventDeliveryPolicy.html), so
ordinary configuration does not require a separate decision type.

```ts
angular.module('admin', []).config({
  $eventBus: {
    deliveryPolicy(context) {
      return context.topic.startsWith('internal:') ? 'drop' : 'deliver';
    },
  },
});
```

Return `"deliver"` or `"drop"` for the common case. Return a structured policy
decision when shared policy infrastructure needs metadata such as a reason or
status.

## Scope events

Use scope events when the relationship is already expressed by the scope tree.

| Method                          | Direction              | Use for                          |
| ------------------------------- | ---------------------- | -------------------------------- |
| `$scope.broadcast(event, args)` | Down to descendants    | Parent notifying child scopes    |
| `$scope.emit(event, args)`      | Up toward `$rootScope` | Child notifying parents          |
| `$scope.on(event, handler)`     | Current scope listener | Local event handling and cleanup |

```ts
$scope.broadcast('filter:changed', { status: 'active' });

$scope.on('filter:changed', (_event, filter) => {
  this.applyFilter(filter);
});

$scope.emit('child:ready');
```

Scope listeners are synchronous and return a deregistration function. Pair them
with `$destroy` when the listener can outlive the current view.

```ts
const off = $scope.on('filter:changed', handler);
$scope.on('$destroy', off);
```

## Choosing a messaging model

| Concern                                                | Prefer `$eventBus`    | Prefer scope events |
| ------------------------------------------------------ | --------------------- | ------------------- |
| Publisher and subscriber do not share a scope ancestry | Yes                   | No                  |
| Event comes from non-Angular code                      | Yes                   | No                  |
| Communication is strictly parent/child                 | Usually no            | Yes                 |
| Delivery should be async                               | Yes                   | No                  |
| Listener cleanup should be tied to a scope             | Works with `$destroy` | Built for it        |

Use `$eventBus` for cross-boundary messages such as WebSocket events, global
notifications, analytics readiness, and application-level domain events. Use
scope events for local component coordination.

## Related

- [Real-time services]({{< relref "/docs/services/realtime" >}})
- [$http service]({{< relref "/docs/services/http" >}})
