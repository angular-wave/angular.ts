---
title: Build a multi-step form on the server
description: Save each step independently instead of keeping a fragile browser-only draft
weight: 52
---

## Problem

A long form needs several steps, but refreshing, navigating back, or changing
devices must not discard completed work.

## Before you start

Create a server-side draft with an owner and current step. Validate and save each
step independently. Make every step addressable with a normal URL.

## Enhance a normal step form

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form
  action="/checkout/address"
  method="post"
  ng-post="/checkout/address"
  data-state-success="checkout-payment"
  on-error="errors = $res"
>
  <label>
    Delivery address
    <textarea name="address" required></textarea>
  </label>
  <p ng-if="errors.address">{{ errors.address }}</p>
  <button type="submit">Continue to payment</button>
</form>
```

The server saves the address before advancing. AngularTS can enter the next
router state after success, while the native action remains a working fallback.

## Server contract

Return `422` for step errors, redirect a normal successful submission to the next
URL, and return `2xx` for the enhanced request. Reject steps the user is not yet
allowed to complete.

## Failure path

Keep the saved draft when a later step fails. Never trust a hidden step number as
proof that earlier requirements or payment checks succeeded.

## Apply it now

Choose the longest form and split it at points where the server can save a useful
draft. Keep related fields together rather than creating arbitrary page counts.

## Verify

Refresh every step, use the Back button, open the draft on another device, submit
steps out of order, and resume after a failed request.
