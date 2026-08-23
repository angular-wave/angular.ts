---
title: Render every request state
description:
  Show loading, success, empty, and error states without contradictory UI
weight: 108
---

## Problem

A request-driven screen shows stale content during loading, treats an empty
result as an error, or leaves the loading indicator visible after failure.

## Recipe

Model request status separately from its data.

```js
app.controller('OrdersController', function OrdersController($http) {
  this.status = 'idle';
  this.orders = [];

  this.load = async () => {
    this.status = 'loading';

    try {
      const response = await $http.get('/api/orders');
      this.orders = response.data;
      this.status = this.orders.length === 0 ? 'empty' : 'ready';
    } catch (error) {
      this.status = 'error';
    }
  };
});
```

Render each state once:

```html
<section aria-live="polite">
  <p ng-if="orders.status === 'loading'">Loading orders...</p>

  <button ng-if="orders.status === 'error'" ng-click="orders.load()">
    Try again
  </button>

  <p ng-if="orders.status === 'empty'">No orders yet.</p>

  <ul ng-if="orders.status === 'ready'">
    <li ng-repeat="order in orders.orders" ng-bind="order.number"></li>
  </ul>
</section>
```

## Why this works

One status value prevents impossible combinations such as loading and error
appearing together. Empty data is a successful response, so it gets its own
state instead of sharing the error path.

Keeping the last successful data is also valid. If you do that, show a separate
refresh indicator and make it clear that the visible data is old.

## Verify

Test all four responses:

1. A delayed success shows loading, then results.
2. An empty success shows the empty message.
3. A failure shows retry and no loading indicator.
4. Retry can move from error through loading to ready or empty.

## Avoid

Do not derive loading from `orders.length === 0`; empty results are not still
loading. Do not clear an error only after the next request succeeds; clear it
when retry starts.
