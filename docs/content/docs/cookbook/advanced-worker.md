---
title: Move CPU-heavy work off the main thread
description: Run JavaScript in a Web Worker with ng-worker
weight: 20
---

## Problem

Sorting, compression, or data processing blocks input and rendering on the main
browser thread.

## Before you start

Profile a realistic input and define a serializable message contract. Browser
APIs and DOM nodes cannot be passed to the worker as ordinary values.

## Recipe

Point `ng-worker` at a worker file and bind its result:

<!-- tested-by: src/directive/worker/worker.spec.ts -->

```html
<button
  ng-worker="/workers/sort.js"
  data-params="{ items: products }"
  on-result="sortedProducts = $result"
  on-error="sortError = error"
  trigger="click"
>
  Sort products
</button>

<ul>
  <li ng-repeat="product in sortedProducts">{{ product.name }}</li>
</ul>
```

The worker receives `data-params` through `postMessage`:

<!-- tested-by: src/directive/worker/worker.spec.ts -->

```js
self.onmessage = (event) => {
  const sorted = event.data.items
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name));

  self.postMessage(sorted);
};
```

AngularTS assigns the reply to `$result` and updates the scope expression in
`on-result`. The directive terminates its worker when its scope is destroyed.

Use `data-request` with a registered shared worker when several callers need
correlated request and response messages.

## Failure path

Worker startup and cloning can cost more than the task. Ignore stale replies,
terminate owned workers, and keep errors visible in the owning UI.

## Apply it now

Profile the interaction before adding a worker. Move work only when a measured
CPU task blocks the main thread long enough to affect input or rendering. Define
a small serializable request and response, test the largest realistic input, and
decide how a newer request cancels or ignores an older result.

## Verify

Compare the main-thread trace before and after moving the task. Confirm input
stays responsive, stale replies are ignored, and the worker terminates with its
scope.
