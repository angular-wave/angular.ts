---
title: Download a generated file with the browser
description: Use normal navigation for files instead of loading bytes into application state
weight: 45
---

## Problem

A report or export needs to download without turning a large binary response into
scope state or manually constructing a browser blob.

## Before you start

Make the server stream the file with the correct `Content-Type` and a safe
`Content-Disposition` filename. Authorize the download on every request.

## Let the browser own the response

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/core/compile/compile.spec.ts -->

```html
<form action="/reports/orders.csv" method="get">
  <label>
    From
    <input name="from" type="date" required />
  </label>
  <label>
    To
    <input name="to" type="date" required />
  </label>
  <button type="submit">Download CSV</button>
</form>
```

A native form lets the browser stream, name, save, and expose download progress
without retaining the file in AngularTS memory.

## Server contract

Validate dates, cap the export size, escape spreadsheet-formula prefixes when
creating CSV, and stream rows instead of building the entire file in memory.

## Failure path

For long exports, create a background job and return a status page rather than
holding an HTTP request indefinitely. Show authorization or validation errors as
a normal server page.

## Apply it now

Find one download implemented with `$http`, base64, or a manually created blob.
Replace it with a normal authorized download when no client transformation is
required.

## Verify

Test small, empty, large, unauthorized, and maliciously named exports. Confirm
memory stays stable and the downloaded filename and content type are correct.
