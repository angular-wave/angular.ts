---
title: Keep secrets out of errors and logs
description: Return safe diagnostics while preserving enough context to trace failures
weight: 72
---

## Problem

Request bodies, headers, URLs, or exceptions can copy credentials and personal
data into browser errors and long-lived logs.

## Before you start

Classify credentials and sensitive fields. Define allowlisted log fields instead
of trying to redact an unlimited set after serialization.

## Show only a safe support reference

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form ng-post="/api/connections" on-error="connectionError = $res">
  <label>API key <input name="apiKey" type="password" required /></label>
  <button type="submit">Connect</button>
  <p ng-if="connectionError" role="alert">
    Connection failed. Support code: {{ connectionError.requestId }}
  </p>
</form>
```

## Server contract

Never return or log the submitted key. Log an allowlisted operation name, safe
resource ID, status, duration, and request ID. Redact downstream exception data
before it crosses service boundaries.

## Failure path

Do not place secrets in query strings, analytics events, breadcrumbs, DOM data
attributes, or client-side persistent state. Treat screenshots as exportable data.

## Apply it now

Trigger one failed credential submission in a safe environment and follow it
through browser tools, proxy logs, application logs, and error reporting.

## Verify

Search every captured artifact for the exact submitted secret and related personal
values. The search must return nothing.
