---
title: Make a server-driven interaction accessible
description: Preserve keyboard behavior, announce loading, and move focus deliberately
weight: 34
---

## Problem

A request updates the page visually, but keyboard and screen-reader users also
need an operable trigger, announced status, and predictable focus.

## Before you start

Use a native button or link for the trigger. Choose a stable result container and
decide whether focus should remain on the trigger or move to the new result.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/get.spec.ts, src/directive/el/el.spec.ts, src/directive/aria/aria.spec.ts -->

```html
<section ng-init="requestStatus = 'Results not loaded'">
  <button
    ng-get="/account/orders"
    data-target="#order-results"
    swap="innerHTML"
    loading
    on-success="requestStatus = 'Orders loaded'; orderResults.focus()"
    on-error="requestStatus = $res.message"
    aria-describedby="order-status"
  >
    Load orders
  </button>

  <p id="order-status" role="status" aria-live="polite">
    {{ requestStatus }}
  </p>
  <div id="order-results" ng-el="orderResults" tabindex="-1"></div>
</section>
```

## Server contract

Return a heading and order rows as one HTML fragment. Return JSON with a short,
actionable `message` for errors so the live region can announce it.

## What AngularTS wires

The native button keeps keyboard activation. `loading` exposes request state,
`role="status"` announces text changes, and `ng-el` provides the stable result
element without a selector search.

## Failure path

Do not move focus on failure or for background refreshes. Never replace the
focused trigger with a swap unless the response provides the next focus target.

## Apply it now

Run one server-driven interaction using only a keyboard and a screen reader.
Name the trigger, loading announcement, error announcement, and final focus
location before changing markup.

## Verify

Activate with Enter and Space, delay the response, reject it, and return an empty
result. Confirm status is announced once, focus is visible, and tab order remains
logical.
