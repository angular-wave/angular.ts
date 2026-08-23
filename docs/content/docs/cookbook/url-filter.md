---
title: Keep search and filters in the URL
description: Make filtered results reloadable, shareable, and usable without JavaScript
weight: 56
---

## Problem

Filters exist only in browser state, so refresh, sharing, Back, and opening a new
tab lose the current result.

## Before you start

Define stable query parameter names and defaults on the server. Return the same
result for the same authorized URL.

## Start with a real GET form

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<form
  action="/orders"
  method="get"
  ng-get="/orders"
  data-target="#orders"
  swap="innerHTML"
>
  <label>Status <select name="status"><option>Open</option></select></label>
  <label>Search <input name="q" type="search" /></label>
  <button type="submit">Apply filters</button>
</form>
<section id="orders" aria-live="polite">
  <p>Choose filters to update the result.</p>
</section>
```

The native GET form defines the canonical URL. Enhancement may replace the result
region, but it must preserve a URL that reproduces the same filters.

## Server contract

Parse, validate, normalize, and cap query values. Include normalized filters in
pagination links and render them back into the controls on complete pages.

## Failure path

Leave the current result visible when an enhanced request fails. Do not write an
unconfirmed filter state into browser history.

## Apply it now

Refresh the most-used filtered list. Move every lost filter into a named GET
control and make the resulting URL reproduce the page.

## Verify

Submit normally, copy the URL, open it in another tab, use Back and Forward, and
repeat with JavaScript disabled and AngularTS running.
