---
title: Handle DOM and scope events
description: Respond to browser events and communicate through the scope tree
weight: 12
---

## Problem

The page must react to user input, control browser event behavior, or notify
related scopes.

## Before you start

Start from a native user interaction and decide whether communication is local
DOM behavior, a short scope notification, or durable shared state.

## Handle a DOM event

Use the directive named after the native event:

<!-- tested-by: src/directive/events/click.spec.ts, src/directive/events/event.spec.ts, src/core/scope/scope.spec.ts -->

```html
<button ng-click="cart.add(product)">Add to cart</button>

<input
  ng-keydown="$event.key === 'Escape' && dialog.close()"
  aria-label="Search"
/>
```

`$event` is the native event. Declare event policy on the same element:

<!-- tested-by: src/directive/events/click.spec.ts, src/directive/events/event.spec.ts, src/core/scope/scope.spec.ts -->

```html
<a
  href="/checkout"
  ng-click="openCheckout()"
  data-event-prevent
  data-event-once
>
  Checkout
</a>
```

`data-event-prevent` calls `preventDefault()`. Other policies are
`data-event-stop`, `data-event-capture`, `data-event-once`, and
`data-event-passive`.

## Send an event through scopes

Register with `on` and keep the returned cleanup function:

<!-- tested-by: src/directive/events/click.spec.ts, src/directive/events/event.spec.ts, src/core/scope/scope.spec.ts -->

```js
const stop = scope.on('cart:updated', (event, count) => {
  scope.cartCount = count;
});

scope.emit('cart:updated', 3);
scope.broadcast('cart:updated', 3);
```

`emit` travels to parent scopes. `broadcast` travels to child scopes. Scope
event listeners run synchronously; reactive DOM updates still flush in the next
microtask.

Use DOM events for element interaction. Use scope events when scopes in the same
application tree need a short-lived notification. Use a service when unrelated
features share durable state.

## Failure path

Passive listeners cannot prevent defaults, and broad scope broadcasts can hide
ownership. Keep event policy on the element and use services for lasting state.

## Apply it now

Pick one manual `addEventListener` call. Move it to an `ng-*` event directive
when it belongs to a template interaction. Use a scope event only when a parent
or child scope needs a short notification. If the value must still exist after
the event, put it in a service instead.

## Verify

Use keyboard and pointer input, inspect default prevention, and destroy the
scope. Confirm one handler runs and no listener survives its UI.
