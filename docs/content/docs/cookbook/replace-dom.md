---
title: Replace part of the page from state
description: Add, remove, or switch DOM subtrees with structural directives
weight: 9
---

## Problem

A page has mutually exclusive steps or an expensive section that should not
exist while it is inactive.

## Before you start

Decide whether hidden DOM state must survive. Structural directives destroy
branches; visibility directives keep their controls, media, and browser state
alive.

## Recipe

Use `ng-switch` when one state selects one subtree:

<!-- tested-by: src/directive/if/if.spec.ts, src/directive/include/include.spec.ts, src/directive/switch/switch.spec.ts -->

```html
<section ng-switch="checkout.step">
  <cart-review ng-switch-when="review"></cart-review>
  <payment-form ng-switch-when="payment"></payment-form>
  <order-confirmation ng-switch-when="complete"></order-confirmation>
  <p ng-switch-default>Loading checkout...</p>
</section>
```

Change the state normally:

<!-- tested-by: src/directive/if/if.spec.ts, src/directive/include/include.spec.ts, src/directive/switch/switch.spec.ts -->

```js
checkout.step = 'payment';
```

AngularTS removes the old branch, destroys its child scope, creates the new
branch, and compiles its directives.

Use `ng-if` for one optional subtree:

<!-- tested-by: src/directive/if/if.spec.ts, src/directive/include/include.spec.ts, src/directive/switch/switch.spec.ts -->

```html
<address-editor ng-if="editingAddress"></address-editor>
```

Use `ng-include` when the replacement comes from a template URL:

<!-- tested-by: src/directive/if/if.spec.ts, src/directive/include/include.spec.ts, src/directive/switch/switch.spec.ts -->

```html
<section ng-include="panelTemplate"></section>
```

Use `ng-show` instead when the same DOM and local form or media state must
remain alive while hidden.

## Failure path

Using `ng-if` for a frequently toggled form recreates controls and loses local
state. Using `ng-show` for expensive hidden work keeps that work alive.

## Apply it now

Choose one conditional panel in your application. Use `ng-show` if its form,
media, or local DOM state must survive hiding. Use `ng-if` if its work should
stop while absent. Use `ng-switch` if one state chooses among several panels.
Write down which lifecycle behavior you need before changing the directive.

## Verify

Toggle the state repeatedly. Confirm hidden state is preserved only with
`ng-show` and removed branches release their scopes and browser resources.
