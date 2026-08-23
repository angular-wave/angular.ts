---
title: Load the next page near the viewport
description: Append server-rendered rows and replace the paging marker
weight: 26
---

## Problem

A long feed should load another server-rendered page shortly before the user
reaches the end without rebuilding existing rows.

## Before you start

The server must expose normal paginated URLs and return HTML fragments with
stable row identity. Keep explicit pagination as the non-JavaScript and keyboard
fallback.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<ul id="orders">
  <li>Order 1001</li>
  <li>Order 1002</li>
</ul>
<div
  id="next-orders"
  ng-viewport
  data-viewport-once
  data-viewport-margin="300px 0px"
  on-enter="nextPage = 2"
  ng-get="/orders?page={{ nextPage }}"
  data-latch="{{ nextPage }}"
  data-target="#next-orders"
  swap="outerHTML"
>
  Loading more orders...
</div>
```

## Server contract

Return new `<li>` rows followed by the same marker configured for page 3. Omit
the marker on the last page. Keep a normal paginated URL so refresh and sharing
work.

## What AngularTS wires

The viewport changes `nextPage`; the latch sends the request; `outerHTML`
replaces the old marker with rows and the next marker. Existing rows stay alive.

## Failure path

Return a retry button when loading fails. Do not trap keyboard users in an
endless feed; provide a normal pagination link and a reachable page footer.

## Apply it now

Choose one feed where users commonly request page 2. Measure its rendered row
count, DOM size, and requests before replacing the current pagination behavior.

## Verify

Scroll with the Network panel open. Confirm each page loads once, rows are not
recreated, the final response removes the marker, and the fallback URL still
works.
