---
title: Share current state through an application model
description: Give AngularTS and another framework one reactive domain object
weight: 97
---

## Problem

Two framework roots need the current shopping-cart state. Sending only
`item:added` events makes late consumers reconstruct state and handle missed
messages.

## Before you start

Choose one owner for the model and its mutations. Retrieve the same registered
model from the AngularTS application injector instead of copying it into each
framework store.

## Register one shopping-cart model

<!-- tested-by: src/core/di/ng-module/ng-module.spec.ts -->

```js
const shop = angular.createModule('shop', []);

shop.model('cart', () => ({
  items: [],
  currency: 'EUR',
}));

shop.controller('CartSummary', [
  'cart',
  function CartSummary(cart) {
    this.cart = cart;
  },
]);
```

Inject `cart` into AngularTS controllers, services, or component views. A
non-Angular root can retrieve the same instance from the injector associated
with the shared application root.

<!-- tested-by: src/angular.spec.ts, src/core/di/ng-module/ng-module.spec.ts -->

```js
const host = document.querySelector('[ng-app="shop"]');
const cart = angular.getInjector(host).get('cart');

externalProductGrid.onAdd((product) => {
  cart.items.push(product);
});
```

Nested object and array mutations are reactive. AngularTS interpolation,
watchers, repeats, and component views consuming the model receive the updated
cart. Framework roots managed by the same application context receive the same
named model instance.

## Render the shared value

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/core/di/ng-module/ng-module.spec.ts -->

```html
<aside ng-controller="CartSummary as summary">
  <p>Cart items: {{ summary.cart.items.length }}</p>
  <ul>
    <li ng-repeat="item in summary.cart.items">{{ item.name }}</li>
  </ul>
</aside>
```

## Failure path

Do not maintain a second cart and synchronize it with event messages. Do not put
view-only details such as open menus or focused controls into the domain model.
Use the event bus for transient notifications and the model for current state.

## Apply it now

Choose one concept shared across roots, such as cart, session, playback, or
workspace selection. Register it once and replace copied stores with that model.

## Verify

Add an item from each framework, mount a consumer after items already exist,
mutate a nested array, and destroy one root. Confirm every live consumer sees
the same cart and destroyed views stop observing it.
