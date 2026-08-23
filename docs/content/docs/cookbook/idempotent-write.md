---
title: Make a critical write safe to repeat
description: Prevent double charges, sends, and submissions with an idempotency key
weight: 51
---

## Problem

A double click, reconnect, proxy retry, or impatient refresh can submit the same
critical operation more than once.

## Before you start

Generate a unique operation key on the server-rendered page. Scope it to the
authenticated user and operation, and store the first result atomically.

## Submit the operation key with the form

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form ng-post="/api/payments" on-error="paymentError = $res">
  <input
    type="hidden"
    name="idempotency_key"
    value="SERVER_RENDERED_OPERATION_KEY"
  />
  <label>
    Amount
    <input name="amount" inputmode="decimal" required />
  </label>
  <button type="submit">Pay once</button>
  <p ng-if="paymentError" role="alert">{{ paymentError.message }}</p>
</form>
```

Disabling the button improves feedback but cannot provide this guarantee. The
server key protects retries from every source.

## Server contract

For the same user, operation, key, and payload, return the stored first result.
Reject reuse of the key with a different payload. Expire records only after the
operation can no longer be retried safely.

## Failure path

Do not mint a new key merely because the response was lost. Reuse the operation
key until the server confirms whether the first request completed.

## Apply it now

Add idempotency to the operation with the highest cost of duplication: payment,
invitation, email, provisioning, or irreversible workflow transition.

## Verify

Send identical requests concurrently, disconnect after sending, and retry with
the same key. Confirm one effect and one stable result are recorded.
