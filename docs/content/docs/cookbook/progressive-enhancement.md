---
title: Keep a form useful before AngularTS starts
description: Build a normal server form first, then add faster in-page behavior
weight: 36
---

## Problem

A request should still work when JavaScript is slow, unavailable, or fails to
start.

## Before you start

Make the endpoint accept a normal form submission and return a complete page.
Only then add AngularTS behavior to improve the interaction.

## Start with the browser's form behavior

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/http/post.spec.ts, src/router/view/view.spec.ts -->

```html
<form
  action="/orders"
  method="post"
  ng-post="/orders"
  data-state-success="orders"
  on-error="errors = $res"
>
  <label>
    Quantity
    <input name="quantity" type="number" min="1" required />
  </label>
  <button type="submit">Place order</button>
  <p ng-if="errors.quantity">{{ errors.quantity }}</p>
</form>
```

Without AngularTS, the browser posts the form to `/orders`. With AngularTS, the
HTTP directive submits it without a page reload and the router enters `orders`
after success. The endpoint must accept both the browser's form encoding and the
enhanced request body.

## Server contract

For a normal browser submission, return a complete success or validation page.
For the enhanced request, return `2xx` on success or a JSON error object such as
`{"quantity":"Choose at least one item"}` with `422`. Decide how the server
distinguishes these requests; do not depend on an undocumented client header.

## Failure path

Keep native labels, required fields, methods, actions, and submit buttons. A
network failure may prevent either form of submission, but it must not leave a
control that only works after JavaScript wiring.

## Apply it now

Choose one important form. Remove JavaScript mentally and check whether its
`action`, `method`, controls, and server response still complete the task.

## Verify

Submit once with JavaScript disabled and once with AngularTS running. Test valid
input, invalid input, a signed-out session, and a server error in both paths.
