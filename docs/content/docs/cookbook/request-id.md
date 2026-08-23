---
title: Show a request ID when an operation fails
description: Give users and operators one safe identifier for tracing a failure
weight: 47
---

## Problem

A user reports “Save failed,” but operators cannot connect that report to one
server request among thousands.

## Before you start

Generate or accept a request ID at the trusted server edge, carry it through
logs and downstream calls, and return it in safe unexpected-error responses.

## Render the identifier with the error

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/post.spec.ts -->

```html
<form ng-post="/api/invoices" on-error="saveError = $res">
  <label>
    Customer
    <input name="customer" required />
  </label>
  <button type="submit">Create invoice</button>
  <div ng-if="saveError" role="alert">
    <p>The invoice could not be created.</p>
    <p ng-if="saveError.requestId">
      Support code: {{ saveError.requestId }}
    </p>
  </div>
</form>
```

The user sees a stable support code, not internal diagnostics.

## Server contract

Return a body such as `{"message":"Request failed","requestId":"req_..."}` for
unexpected errors. Log the same ID with route, status, duration, and safe context.
Never put credentials, personal data, stack traces, or SQL in the response.

## Failure path

If the client supplies an ID, validate its format before logging it. Keep an
independently generated internal trace identifier when crossing trust boundaries.

## Apply it now

Take one high-value write and follow its request ID from the response to every
relevant server log. Remove any step that requires searching by timestamp alone.

## Verify

Force a controlled `5xx`, copy the displayed code, and find exactly one request
path in logs. Confirm the response exposes no implementation details.
