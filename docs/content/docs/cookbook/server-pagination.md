---
title: Paginate a large result on the server
description: Keep URLs shareable while replacing only the result region
weight: 44
---

## Problem

A large collection is slow to query, transfer, render, and navigate.

## Before you start

Make the server return a bounded page and stable next and previous URLs. Prefer a
cursor when records change frequently; use page numbers when random access is
important and the data is stable enough.

## Keep real navigation URLs

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/get.spec.ts -->

```html
<section>
  <div id="orders">
    <p>Orders 21–40</p>
  </div>
  <nav aria-label="Order pages">
    <a
      href="/orders?page=1"
      ng-get="/orders?page=1"
      data-target="#orders"
      swap="innerHTML"
    >
      Previous
    </a>
    <a
      href="/orders?page=3"
      ng-get="/orders?page=3"
      data-target="#orders"
      swap="innerHTML"
    >
      Next
    </a>
  </nav>
</section>
```

The `href` remains useful for opening a page in another tab and for normal
navigation before AngularTS starts. The HTTP directive can replace only the list
when the enhanced interaction runs.

## Server contract

Return a complete page for normal navigation and a trusted list fragment for the
enhanced request according to the application's explicit response policy. Keep
sort and filter values in every pagination URL.

## Failure path

Leave the current page visible if the next page fails. Do not advance the visible
page label or browser URL until the requested result succeeds.

## Apply it now

Measure the largest rendered list. Move its limit, ordering, and cursor to the
server before adding virtual scrolling or client-side collection machinery.

## Verify

Open next and previous links normally, in a new tab, with JavaScript disabled,
and with AngularTS running. Confirm the same records and ordering appear.
