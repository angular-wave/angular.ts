---
title: "Reactive change detection with ES6 Proxy scopes"
weight: 190
description: "See how AngularTS replaces the AngularJS digest loop with ES6 Proxy interception, scheduling microtask DOM updates that only re-evaluate affected bindings."
---
Change detection is how a framework decides when to update the DOM to reflect new data. AngularJS used a polling mechanism called the **digest cycle** — every time something might have changed, AngularJS ran all registered watchers, compared old and new values, and repeated until nothing changed. AngularTS replaces this entirely with **ES6 Proxy-based reactive observation**: the framework knows exactly which property changed, which bindings depend on it, and schedules only those bindings to re-evaluate.
## The digest cycle problem

In AngularJS, every `$watch` registered anywhere in the application was checked on every digest. A large application could have thousands of watchers running on every user interaction, mouse move, or HTTP response. This was O(n) in the number of watchers per cycle, and cycles could chain into one another.

AngularTS eliminates this entirely. There are no cycles. There is no polling.
## How Proxy-based reactivity works

When AngularTS creates a scope via `createScope()`, it wraps the plain object in a `Proxy` whose handler is a `Scope` instance. The `Scope` class implements the `set` trap:

```typescript
set(target, property, value, proxy): boolean {
  target[property] = createScope(value, this); // recursively proxy nested objects

  if (oldValue !== value) {
    const listeners = this._watchers.get(property); // O(1) Map lookup
    if (listeners) {
      this._scheduleListener(listeners); // queue a microtask
    }
  }

  return true;
}
```

The key points:

1. **O(1) lookup**: Listeners are stored in a `Map<string, Listener[]>` keyed by property name. When `count` changes, only listeners registered under `'count'` are scheduled — not every watcher in the application.
2. **Microtask scheduling**: `_scheduleListener` calls `queueMicrotask()`, which defers the flush until after the current synchronous call stack completes. Multiple changes to the same property in the same tick are coalesced.
3. **Recursive proxying**: When you assign an object — `$scope.user = { name: 'Alice' }` — the new value is itself wrapped in a `Proxy`. Nested property changes (`$scope.user.name = 'Bob'`) are tracked just as well as top-level ones.
## A concrete example

```typescript
  $scope.count = 0;

  $scope.increment = function () {
    $scope.count += 1;
    // At this point the Proxy set trap fires:
    // 1. Stores the new value
    // 2. Looks up listeners for 'count' in the watchers Map
    // 3. Schedules them via queueMicrotask
    // 4. Returns — no $apply() needed
  };
}]);
```

```html
  <button ng-click="increment()">+</button>
  <span>{{ count }}</span>  <!-- binding re-evaluates only when 'count' changes -->
</div>
```

When `increment()` fires, the Proxy intercepts the assignment to `count`, finds the binding registered for `'count'`, and schedules it. The DOM update happens on the next microtask — after `increment()` returns but before the browser renders the next frame.
## Comparison with AngularJS

|                     | AngularJS (1.x)                                        | AngularTS                                                    |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| Detection mechanism | Dirty-checking digest loop                             | ES6 Proxy `set` trap                                         |
| Watcher lookup cost | O(n) — all watchers checked                            | O(1) — direct Map lookup by property name                    |
| Trigger             | Manual digest entry required for async code            | Automatic — Proxy intercepts every assignment                |
| Update granularity  | All watchers, all the time                             | Only bindings for the changed property                       |
| Nested objects      | Shallow by default; `$watchCollection` needed for deep | Deep — nested objects are automatically proxied              |
| Async code          | Must manually enter change detection                   | No wrapping needed for standard async (Promise, fetch, etc.) |
## When no `$apply` is needed

Because the Proxy fires synchronously on every assignment, any code that assigns to a scope property — whether inside a controller, a service callback, or a Promise handler — automatically triggers the right DOM update:

```typescript
  $scope.users = [];
  $scope.loading = true;

  // No $apply() needed — the Proxy intercepts the assignment
  $http.get('/api/users').then(({ data }) => {
    $scope.users = data;    // triggers DOM update for {{ users }}
    $scope.loading = false; // triggers DOM update for ng-if="loading"
  });
}]);
```

> **Tip:** If you are integrating a third-party library that updates data outside of AngularTS (such as a raw WebSocket callback or a non-Promise-based timer), and the library stores results in scope properties, those assignments still flow through the Proxy and trigger updates automatically. No `$apply` wrapper is needed.
## Microtask batching

Multiple property changes within the same synchronous block are batched. The listener scheduler enqueues a `queueMicrotask` flush only once per tick:

```typescript
_enqueueScheduledTask(task: ScheduledTask): void {
  const scheduler = this._listenerScheduler;

  scheduler._queue.push(task);

  if (!scheduler._queued && !scheduler._flushing) {
    scheduler._queued = true;
    queueMicrotask(() => {
      this._flushScheduledTasks(); // runs all queued listener notifications at once
    });
  }
}
```

If you set ten properties in one synchronous function, all ten listener notifications are flushed together in a single microtask. The DOM is updated once, not ten times.
## What objects are tracked

Not all objects are proxied. The `isNonScope` function explicitly excludes:

* Browser built-ins: `Window`, `Document`, `Element`, `Node`, `Event`, `Promise`, `Map`, `Set`, `WeakMap`, `Date`, `RegExp`, typed arrays, `Blob`, `File`, `URL`, and others.
* Objects that carry `$nonscope: true` on the instance or constructor.

This prevents the framework from wrapping DOM nodes or native collections in Proxies, which would be incorrect and slow.

```typescript
  // Prevents this class from being wrapped in a Proxy
  static $nonscope = true;

  readonly apiBase = 'https://api.example.com';
}

// Or per-instance:
$scope.rawData = Object.assign(new SomeClass(), { $nonscope: true });
```
## When to use `$watch`

In the reactive proxy model, `$watch` is rarely necessary for keeping the DOM in sync — that happens automatically. Use `$watch` when you need to run **side-effect code** in response to a scope property changing:

```typescript
$scope.$watch('selectedTab', function (newTab) {
  externalTabWidget.activate(newTab);
});

// Trigger a service call when a search term changes
$scope.$watch('searchQuery', function (query) {
  if (query && query.length > 2) {
    searchService.find(query).then(results => {
      $scope.results = results;
    });
  }
});

// React to a computed condition
$scope.$watch('items.length > 100', function (tooMany) {
  $scope.showPagination = tooMany;
});
```

> **Note:** `$watch` on a constant expression — a bare string literal, number, or boolean — is evaluated exactly once and the returned deregistration function is a no-op. The runtime detects the `_constant` flag on the compiled expression and avoids registering a watcher at all.
## Watcher count and `$$watchersCount`

You can inspect how many active watchers are registered in a scope subtree:

```typescript
console.log($scope.$$watchersCount);
```

This is computed by walking the `_watchers` Map and counting entries whose `_scopeId` matches any scope in the subtree. It is useful for identifying scopes with unexpectedly high watcher counts during performance profiling.
## Post-update callbacks

Sometimes you need to run code after all bindings have flushed — for example, to measure DOM dimensions after a render. Use `$scope.$postUpdate`:

```typescript

$scope.$postUpdate(() => {
  // Runs after the current listener batch completes
  const height = listElement.scrollHeight;
  $scope.listHeight = height;
});
```

`$postUpdate` callbacks are drained after each listener notification batch, in FIFO order. They are skipped if the owning scope has been destroyed.
## Performance characteristics

#### Only affected bindings update

A change to `user.name` schedules only the bindings that depend on `name`. Thousands of unrelated bindings are never touched.

#### No re-entrancy problems

The scheduler tracks a `_flushing` flag. If a listener notification causes another property change, that change is enqueued and flushed in a follow-up microtask rather than re-entrantly.

#### Deep tracking at zero cost

Nested objects are proxied at assignment time, not at watch time. There is no `` or explicit deep-watch flag — all depths are tracked uniformly.

#### Scope destruction cleans up

When `$destroy()` is called, all watcher entries for that scope's `$id` are removed from the shared `_watchers` Map in a single O(n) pass, with O(1) swap-pop removal for each matched entry.
