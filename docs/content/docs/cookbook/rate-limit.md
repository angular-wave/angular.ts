---
title: Recover from a rate-limited request
description: Respect 429 responses without hiding retries or multiplying traffic
weight: 49
---

## Problem

An endpoint limits repeated requests, but the page reports a generic failure or
immediately retries and makes the limit worse.

## Before you start

Make the server return `429` and a `Retry-After` header. Use rate limits to
protect a resource, not as the only defense against abusive or unauthorized use.

## Keep retry under the user's control

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<section ng-init="limitError = undefined">
  <button
    type="button"
    ng-get="/api/reports/preview"
    on-success="preview = $res; limitError = undefined"
    on-error="limitError = $res"
  >
    Refresh preview
  </button>
  <p ng-if="limitError" role="alert">
    {{ limitError.message }} Try again after {{ limitError.retryAfter }}.
  </p>
  <div ng-if="preview">{{ preview.summary }}</div>
</section>
```

Do not run a tight automatic retry loop. Keep the last useful result visible and
tell the user when another attempt can succeed.

## Server contract

Return `429`, `Retry-After`, and a safe body such as
`{"message":"Preview limit reached","retryAfter":"14:30"}`. Apply the limit to
the correct user, tenant, token, or resource rather than only an IP address.

## Failure path

Treat `429` differently from authentication, permission, validation, and server
failures. Do not cache the response longer than the stated limit window.

## Apply it now

Find the endpoint most likely to receive bursts. Confirm the page exposes the
limit instead of silently creating more traffic.

## Verify

Exceed the limit, inspect the header and body, wait for the window, and retry.
Confirm no background loop continues while the request is limited.
