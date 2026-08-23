---
title: Swap server-rendered HTML into the page
description: Select a target and insert, replace, append, or remove server HTML
weight: 10
---

## Problem

An action needs fresh HTML from the server, but it does not justify a client
route or a JSON API followed by client-side rendering.

## Before you start

The endpoint must return a fragment rather than a complete document. Choose a
stable target that belongs to the same application and define what remains when
the request fails.

## Recipe

Let the server return the final HTML. Select the target with `data-target` and
choose how to place the response with `swap`:

<!-- tested-by: src/directive/http/get.spec.ts, src/directive/realtime/swap.spec.ts -->

```html
<button
  ng-get="/account/summary"
  data-target="#account-summary"
  swap="innerHTML"
>
  Refresh summary
</button>

<section id="account-summary">
  <p>Current server-rendered summary</p>
</section>
```

`innerHTML` keeps the target and replaces its children. Use `outerHTML` when the
response replaces the target itself:

<!-- tested-by: src/directive/http/get.spec.ts, src/directive/realtime/swap.spec.ts -->

```html
<button ng-get="/account/card" data-target="#account-card" swap="outerHTML">
  Refresh card
</button>
```

Append server-rendered rows without rebuilding the list:

<!-- tested-by: src/directive/http/get.spec.ts, src/directive/realtime/swap.spec.ts -->

```html
<button ng-get="/orders?page=2" data-target="#orders" swap="beforeend">
  Load more
</button>

<ul id="orders"></ul>
```

Useful swap values are `textContent` for plain text, `beforeend` for append,
`afterbegin` for prepend, `delete` for removal, and `none` when only
`on-success` should update scope state.

The response HTML is compiled after insertion, so directives in the new fragment
join the same application.

## Failure path

A failed response must not erase useful content. Return JSON to `on-error` or a
deliberate error fragment, and never insert untrusted HTML.

## Apply it now

Find one action that fetches JSON only so the browser can rebuild HTML the
server already knows how to render. Return that fragment from the endpoint,
choose the smallest stable target, and select `innerHTML`, `outerHTML`, or an
append swap. Test the endpoint with JavaScript disabled before adding the swap.

## Verify

Inspect the response content type and target. Confirm inserted directives
compile, failed responses preserve useful UI, and unrelated DOM nodes retain
identity.
