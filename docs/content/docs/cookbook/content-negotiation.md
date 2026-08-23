---
title: Make full-page and fragment responses explicit
description: Let one server route return the representation the request actually needs
weight: 67
---

## Problem

The same URL serves normal navigation and an enhanced region update, but the
server sometimes returns a full page where a fragment is expected.

## Before you start

Define an explicit request policy using `Accept`, a documented request header, or
separate routes. Do not infer intent from fragile user-agent checks.

## Keep normal navigation available

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<a
  href="/account/orders"
  ng-get="/account/orders"
  data-target="#orders"
  swap="innerHTML"
>
  Refresh orders
</a>
<section id="orders" aria-live="polite">
  <p>Current orders appear here.</p>
</section>
```

## Server contract

Return a complete document for normal navigation and a valid application-owned
fragment for the enhanced request. Set `Content-Type`, cache variation, and error
responses consistently for both representations.

## Failure path

Never swap a complete login, maintenance, or proxy page into the region. Detect
authentication and server failures by status before rendering the body.

## Apply it now

Capture the normal and enhanced requests for one route. Write down exactly which
request signal chooses each representation.

## Verify

Open the link normally, in a new tab, and through the enhanced interaction. Test
signed-out and maintenance responses in all three cases.
