---
title: Let the user retry a failed read
description: Keep the last useful state and retry only when the user asks
weight: 43
---

## Problem

A temporary network or server failure leaves a section empty or forces a full
page reload.

## Before you start

Keep reads safe and idempotent. Decide whether old data is more useful than an
empty screen while a refresh fails.

## Keep recovery next to the result

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/get.spec.ts -->

```html
<section ng-init="orders = []; loadError = undefined">
  <button
    type="button"
    ng-get="/api/orders"
    on-success="orders = $res; loadError = undefined"
    on-error="loadError = $res"
  >
    Refresh orders
  </button>
  <p ng-if="loadError" role="alert">
    Orders could not be refreshed. Try again.
  </p>
  <p ng-if="!loadError && orders.length === 0">No orders yet.</p>
  <ul>
    <li ng-repeat="order in orders">{{ order.number }}</li>
  </ul>
</section>
```

The existing list remains visible if refresh fails. The user controls when
another request is sent.

## Server contract

Return a JSON array with `2xx`. Use `401` for an expired session and `5xx` for a
temporary server failure. Include a safe request ID in unexpected errors.

## Failure path

Do not retry writes automatically. Avoid unlimited automatic read retries; they
can amplify an outage and consume mobile data while the user cannot intervene.

## Apply it now

Choose one useful read that currently disappears on failure. Preserve its last
successful value and put a retry control beside the error.

## Verify

Load successfully, then force offline mode and retry. Confirm the old result
stays visible, the error is announced, and each click sends exactly one request.
