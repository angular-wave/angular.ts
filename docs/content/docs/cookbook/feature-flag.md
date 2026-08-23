---
title: Deliver a feature flag with the server page
description: Avoid a second request and keep authorization separate from rollout
weight: 76
---

## Problem

The page waits for a second request before deciding which small interface variation
to show, causing flicker and inconsistent first rendering.

## Before you start

Evaluate the flag on the server using the authenticated request and rollout policy.
Treat the result as presentation, never as permission.

## Initialize the evaluated result

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/init/init.spec.ts -->

```html
<section ng-init="flags = { compactCheckout: false }">
  <a ng-if="flags.compactCheckout" href="/checkout/compact">
    Use compact checkout
  </a>
  <a ng-if="!flags.compactCheckout" href="/checkout">
    Continue to checkout
  </a>
</section>
```

Render the evaluated boolean into the server template. Do not expose targeting
rules, experiment secrets, or unrelated flags.

## Server contract

Keep both paths authorized and compatible with current data. Record the evaluated
variant with operational events needed to compare rollout health.

## Failure path

Choose a safe default when flag evaluation fails. Removing a UI path does not make
its endpoint unavailable to direct requests.

## Apply it now

Find one startup request used only for feature configuration. Move the required
evaluated values into the initial server response.

## Verify

Test both variants, evaluation failure, direct endpoint access, rollback, cached
pages, and users moving between rollout groups.
