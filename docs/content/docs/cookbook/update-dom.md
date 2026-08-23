---
title: Update text, classes, styles, and visibility
description: Let bindings update existing DOM when scope state changes
weight: 8
---

## Problem

State changes, and the page must update without finding elements or assigning
DOM properties by hand.

## Before you start

Identify the scope or controller property that owns the visible result.
User-provided text must remain text unless it has passed an explicit
trusted-HTML policy.

## Recipe

Bind each part of the element to scope state:

<!-- tested-by: src/binding.spec.ts -->

```html
<article ng-controller="ProductController as product">
  <h2 ng-bind="product.name"></h2>

  <p
    ng-class="{ featured: product.featured, soldOut: !product.inStock }"
    ng-style="{ opacity: product.inStock ? 1 : 0.5 }"
  >
    {{ product.price | currency }}
  </p>

  <p ng-show="product.inStock">Available now</p>
  <p ng-hide="product.inStock">Out of stock</p>

  <button ng-click="product.featured = !product.featured">
    Toggle featured
  </button>
</article>
```

Change the model, not the element:

<!-- tested-by: src/binding.spec.ts -->

```js
product.name = 'Mechanical keyboard';
product.inStock = false;
```

AngularTS updates only the bindings that read those properties.

## Choose the binding

| Task                             | Binding                         |
| -------------------------------- | ------------------------------- |
| Replace text                     | `ng-bind` or `{{ expression }}` |
| Add and remove classes           | `ng-class`                      |
| Change inline styles             | `ng-style`                      |
| Hide while keeping the DOM alive | `ng-show` or `ng-hide`          |

Use `ng-bind-html` only for trusted HTML. Normal interpolation and `ng-bind`
write text, so user content cannot become markup.

## Failure path

Do not switch to `ng-bind-html` to fix formatting. Treat unexpected markup as a
data or formatting problem unless the content has an explicit trust boundary.

## Apply it now

Find one place where application code assigns `textContent`, `className`,
`style`, or `hidden`. Name the state that actually controls that result and bind
the DOM to it. Change the state from DevTools and confirm that no DOM-writing
code remains.

## Verify

Change each source property independently. Confirm only its bindings update and
user text is rendered as text rather than HTML.
