---
title: "Scopes, data binding, and the scope hierarchy"
weight: 220
description: "Explore how AngularTS scopes work as reactive ES6 Proxies, how the hierarchy flows from $rootScope, and how to use events and watchers effectively."
---
A **scope** in AngularTS is the glue between the model and the view. It is a plain JavaScript object wrapped in an ES6 `Proxy` so that property assignments automatically trigger DOM updates without any manual notification. Every controller, directive, and component operates against a scope, and those scopes are organized into a tree rooted at `$rootScope`.
## What a scope actually is

When you write `$scope.count = 0` in a controller, AngularTS is not storing `count` on a special object — it is storing it on an ordinary JavaScript object. The Proxy layer intercepts the `set` trap and, whenever a watched property changes, schedules the affected binding listeners to re-evaluate on the next microtask.

```typescript
set(target, property, value, proxy): boolean {
  // ... after storing the value ...
  const listeners = this._watchers.get(property);
  if (listeners) {
    this._scheduleListener(listeners); // queues a microtask flush
  }
  return true;
}
```

The result is that you write natural JavaScript assignments and the DOM stays in sync — no `$apply()` call required for synchronous code paths.
## Creating scopes

Scopes are created by the framework, not by application code. The injector creates `$rootScope` when the `ng` module loads. Each `ng-controller` directive, isolate directive, and `ng-repeat` iteration creates a child scope derived from its parent.

You can create child scopes manually when building custom directives:

```typescript
const child = $scope.$new();

// Isolate child — does not inherit watchable properties
const isolate = $scope.$newIsolate();

// Transcluded child — linked to an outer parent scope
const transcluded = $scope.$transcluded(outerScope);
```

> **Info:** `$scope.$new()` sets the new scope's prototype to the parent's underlying target object. Reading a property that does not exist locally will walk the prototype chain, just like plain JavaScript objects.
## The scope hierarchy

Every scope holds a reference to `$root` (the root scope) and `$parent` (the scope that created it). Child scopes are tracked in the `_children` array.

```
$rootScope
├── MainCtrl scope
│   ├── SidebarCtrl scope
│   └── ContentCtrl scope
│       ├── ng-repeat item scope (item 0)
│       ├── ng-repeat item scope (item 1)
│       └── ng-repeat item scope (item 2)
└── NavCtrl scope
```

You can search for a named scope from anywhere in the tree:

```typescript
$scope.$scopename = 'userPanel';

// Find it from $rootScope
const panel = $rootScope.$searchByName('userPanel');

// Or via the angular instance
const panel2 = angular.getScopeByName('userPanel');
```
## Scope events

Scopes communicate across the hierarchy through a lightweight event system. Events travel either upward or downward — never both directions at once.

### $emit — upward

```typescript
// Fire an event from a child scope upward toward $rootScope
$scope.$emit('user:selected', { id: 42 });

// A parent scope listens
$scope.$on('user:selected', function (event, user) {
  console.log('Selected user ID:', user.id);
});
```

### $broadcast — downward

```typescript
// Broadcast from $rootScope down to all descendants
$rootScope.$broadcast('config:updated', newConfig);

// Any child scope can listen
$scope.$on('config:updated', function (event, config) {
  $scope.theme = config.theme;
});
```

The `$on` method returns a deregistration function. Call it when the listener is no longer needed:

```typescript

// Later, when the listener should stop
deregister();
```
### Stopping propagation

`$emit` propagation can be stopped before it reaches `$rootScope`:

```typescript
  event.stopPropagation(); // stops upward travel
  event.preventDefault();  // signals that the default was prevented
});
```
## Watching scope properties

In the reactive proxy model, you rarely need `$watch` — template bindings update automatically. Use `$watch` when you need to run side-effect code in response to a data change, such as syncing to an external library or triggering a service call.

```typescript
const deregister = $scope.$watch('searchQuery', function (newValue, target) {
  if (newValue) {
    searchService.query(newValue).then(results => {
      $scope.results = results;
    });
  }
});

// Lazy watch — skips the initial call, only fires on changes
$scope.$watch('count', function (newValue) {
  console.log('count changed to', newValue);
}, /* lazy */ true);

// Stop watching when done
deregister();
```

> **Note:** `$watch` on a constant expression (a literal string or number) is evaluated once and the deregistration function is a no-op. The runtime detects this via the `_constant` flag on the compiled expression.
### Watchable expression types

`$watch` accepts any expression that `$parse` can compile — identifiers, member expressions, binary comparisons, function calls, array and object literals, and conditional expressions.

```typescript
$scope.$watch('count > 10', handler);              // binary expression
$scope.$watch('items.length', handler);            // member on array
$scope.$watch('getTotal()', handler);              // function call
$scope.$watch('a || b', handler);                  // logical expression
$scope.$watch('[firstName, lastName]', handler);   // array expression
```
## Merging scope state

```typescript
// $merge copies properties from a plain object into the scope
$scope.$merge({ name: 'Alice', age: 30 });
```
## Destroying a scope

When a controller's element is removed from the DOM, AngularTS calls `$destroy()` on the associated scope. You can also call it manually. Destroying a scope:

1. Broadcasts `$destroy` downward to all children.
2. Removes all watcher registrations for this scope's ID from the shared `_watchers` map.
3. Clears all `$on` listeners.
4. Removes itself from the parent's `_children` array.
5. Sets `_destroyed = true` and nulls internal references on the next microtask.

```typescript
const tempScope = $rootScope.$new();
tempScope.data = loadSomething();

// When done:
tempScope.$destroy();
```

> **Warning:** Do not read from or write to a scope after calling `$destroy()`. The scope's property map is reduced to a minimal tombstone on the next microtask.
## Relationship to controllers and directives

Each `ng-controller` directive asks `$scope.$new()` to create a child scope and passes it to the controller constructor as `$scope`. The controller writes model properties directly onto that scope:

```html
  <button ng-click="increment()">+</button>
  <span>{{ count }}</span>
</div>
```

```typescript
  $scope.count = 0;

  $scope.increment = function () {
    $scope.count += 1; // Proxy intercepts; DOM updates automatically
  };
}]);
```

Directives with `scope: true` get an inherited child scope; directives with `scope: {}` get an isolate scope. The isolate scope does not walk the parent prototype chain for watchable properties, but it can still receive values through explicit bindings.
## Scope API quick reference

| Method                             | Description                                                     |
| ---------------------------------- | --------------------------------------------------------------- |
| `$scope.$new(child?)`              | Creates an inherited child scope.                               |
| `$scope.$newIsolate(instance?)`    | Creates an isolate child scope.                                 |
| `$scope.$watch(expr, fn, lazy?)`   | Registers a watcher; returns a deregistration function.         |
| `$scope.$on(name, fn)`             | Registers an event listener; returns a deregistration function. |
| `$scope.$emit(name, ...args)`      | Fires an event upward through the hierarchy.                    |
| `$scope.$broadcast(name, ...args)` | Fires an event downward to all descendants.                     |
| `$scope.$merge(obj)`               | Copies enumerable properties from `obj` into the scope.         |
| `$scope.$destroy()`                | Tears down the scope and all its watchers.                      |
| `$scope.$postUpdate(fn)`           | Queues a callback to run after the current listener flush.      |
| `$rootScope.$searchByName(name)`   | Finds a scope by its `$scopename` anywhere in the tree.         |
| `$scope.$getById(id)`              | Finds a scope by numeric ID within the subtree.                 |
