---
title: Return one safe error shape
description: Make expected failures predictable without hiding their HTTP meaning
weight: 66
---

## Problem

Every endpoint returns errors differently, so forms contain endpoint-specific
parsing and unexpected failures leak internal details.

## Before you start

Define a small envelope with a safe message, optional field errors, a stable code,
and a request ID. Keep HTTP status as the primary category.

## Bind predictable members

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form ng-post="/api/profile" on-error="error = $res">
  <label>
    Display name
    <input name="name" required />
  </label>
  <p ng-if="error.fields.name">{{ error.fields.name }}</p>
  <p ng-if="error.message" role="alert">{{ error.message }}</p>
  <p ng-if="error.requestId">Support code: {{ error.requestId }}</p>
  <button type="submit">Save</button>
</form>
```

## Server contract

Keep the envelope stable across `401`, `403`, `409`, `422`, `429`, and `5xx`, but
preserve those statuses. Use machine codes only for behavior the client actually
needs; do not mirror exception class names.

## Failure path

If an intermediary returns HTML or an empty body, show a generic safe fallback.
Error rendering must not throw another exception while parsing an unknown body.

## Apply it now

Compare three endpoints' failure bodies. Replace accidental differences with the
smallest common envelope rather than a large universal error object.

## Verify

Exercise every documented status plus a proxy HTML error and malformed body.
Confirm the page remains usable and exposes no internal data.
