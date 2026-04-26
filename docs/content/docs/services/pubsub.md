---
title: "Decoupled Messaging"
weight: 390
description: "Use $eventBus for application-wide publish/subscribe messaging and scope events for scope-tree communication."
---

AngularTS has two messaging models:

- `$eventBus` is an application-wide `PubSub` instance for decoupled communication, including messages from non-Angular code.
- Scope events (`$scope.$on`, `$scope.$emit`, `$scope.$broadcast`) travel through the scope tree and are best for parent/child communication.

Exact `$eventBus` method signatures live in TypeDoc:

- [`PubSub`](../../../typedoc/classes/PubSub.html)
- [`PubSubProvider`](../../../typedoc/classes/PubSubProvider.html)

## Publish and subscribe

Inject `$eventBus` when a publisher and subscriber should not know about each other.

```typescript
class CartService {
  static $inject = ["$eventBus"];

  constructor(private $eventBus: ng.PubSub) {}

  addItem(product: Product, quantity: number) {
    this.$eventBus.publish("cart:item-added", { product, quantity });
  }
}

class HeaderController {
  static $inject = ["$eventBus", "$scope"];

  cartCount = 0;

  constructor($eventBus: ng.PubSub, $scope: ng.Scope) {
    const unsubscribe = $eventBus.subscribe("cart:item-added", () => {
      this.cartCount += 1;
      $scope.$applyAsync();
    });

    $scope.$on("$destroy", unsubscribe);
  }
}
```

`subscribe()` returns an unsubscribe function. Keep that function and call it during teardown, especially from long-lived services, directive controllers, or manually bootstrapped integrations.

## One-time listeners

Use `subscribeOnce()` for initialization handshakes where only the first event matters.

```typescript
class AnalyticsBootstrap {
  static $inject = ["$eventBus"];

  constructor($eventBus: ng.PubSub) {
    $eventBus.subscribeOnce("analytics:ready", (sdk) => {
      sdk.track("session_start");
    });
  }
}

window.onAnalyticsReady = (sdk) => {
  angular.$eventBus.publish("analytics:ready", sdk);
};
```

## Async delivery

`$eventBus` schedules delivery with `queueMicrotask`. `publish()` returns after scheduling the event, and subscribers run after the current call stack.

```typescript
$eventBus.subscribe("order:created", (order) => {
  console.log("subscriber", order.id);
});

$eventBus.publish("order:created", { id: 42 });
console.log("publisher finished");
```

This makes `$eventBus` useful for browser callbacks, WebSocket messages, Web Worker results, and other boundaries where you want the publisher to stay independent of Angular controller timing. When a subscriber changes view state, call `$scope.$applyAsync()` or update through a service that already enters Angular's lifecycle.

## Error handling

If a subscriber throws, `$eventBus` forwards the error to `$exceptionHandler` and continues delivering the event to the remaining subscribers.

```typescript
$eventBus.subscribe("order:created", () => {
  throw new Error("failed listener");
});

$eventBus.subscribe("order:created", (order) => {
  console.log("still delivered", order.id);
});
```

This keeps one failing listener from blocking unrelated subscribers.

## Scope events

Use scope events when the relationship is already expressed by the scope tree.

| Method | Direction | Use for |
| --- | --- | --- |
| `$scope.$broadcast(event, args)` | Down to descendants | Parent notifying child scopes |
| `$scope.$emit(event, args)` | Up toward `$rootScope` | Child notifying parents |
| `$scope.$on(event, handler)` | Current scope listener | Local event handling and cleanup |

```typescript
$scope.$broadcast("filter:changed", { status: "active" });

$scope.$on("filter:changed", (_event, filter) => {
  this.applyFilter(filter);
});

$scope.$emit("child:ready");
```

Scope listeners are synchronous and return a deregistration function. Pair them with `$destroy` when the listener can outlive the current view.

```typescript
const off = $scope.$on("filter:changed", handler);
$scope.$on("$destroy", off);
```

## Choosing a messaging model

| Concern | Prefer `$eventBus` | Prefer scope events |
| --- | --- | --- |
| Publisher and subscriber do not share a scope ancestry | Yes | No |
| Event comes from non-Angular code | Yes | No |
| Communication is strictly parent/child | Usually no | Yes |
| Delivery should be async | Yes | No |
| Listener cleanup should be tied to a scope | Works with `$destroy` | Built for it |

Use `$eventBus` for cross-boundary messages such as WebSocket events, global notifications, analytics readiness, and application-level domain events. Use scope events for local component coordination.

## Related

- [Real-time services]({{< relref "/docs/services/realtime" >}})
- [$http service]({{< relref "/docs/services/http" >}})
