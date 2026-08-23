---
title: Select an element with ng-el
description: Let AngularTS place a native DOM element on a scope or controller
weight: 6
---

## Problem

Your controller needs a native element so it can focus an input, draw on a
canvas, measure layout, or call another browser API.

Do not search the document with `querySelector`. Declare the element you need
and let AngularTS wire it to your state.

## Before you start

Use this inside a compiled scope or controller that owns the element. Keep
document-wide elements in a service rather than attaching unrelated DOM to a
local scope.

## Recipe

Add `ng-el` with the scope property that should receive the element:

<!-- tested-by: src/directive/el/el.spec.ts -->

```html
<section ng-controller="StatusController">
  <p ng-el="statusEl">Waiting</p>
</section>
```

AngularTS assigns the native paragraph element to `scope.statusEl`. Code using
that scope can now change the element directly:

<!-- tested-by: src/directive/el/el.spec.ts -->

```js
scope.statusEl.textContent = 'Saved';
scope.statusEl.className = 'status status-success';
```

To try this in DevTools, select the `section` and run:

<!-- tested-by: src/directive/el/el.spec.ts -->

```js
const scope = angular.getScope($0);

scope.statusEl.textContent = 'Saved';
scope.statusEl.className = 'status status-success';
```

There is no selector, element ID, or setup callback to maintain. AngularTS also
removes the reference when the element leaves the DOM.

## Store the element on a controller

With controller-as syntax, give `ng-el` the controller property:

<!-- tested-by: src/directive/el/el.spec.ts -->

```html
<section ng-controller="StatusController as status">
  <p ng-el="status.element">Waiting</p>
</section>
```

The controller can use `this.element`:

<!-- tested-by: src/directive/el/el.spec.ts -->

```js
function StatusController() {
  this.markSaved = () => {
    this.element.textContent = 'Saved';
    this.element.className = 'status status-success';
  };
}
```

## Use the element ID as the property name

If `ng-el` has no value, AngularTS uses the element's `id`:

<!-- tested-by: src/directive/el/el.spec.ts -->

```html
<input id="searchInput" ng-el />
```

The element is then available as `scope.searchInput`.

## Failure path

The reference is unavailable before the directive links and is removed with the
element. Guard optional elements and do not retain the node in a longer-lived
service.

## Apply it now

Search your controller code for one `querySelector` or `getElementById` call. If
the element belongs to that controller's template, replace the search with
`ng-el`. Verify that the controller no longer knows the page-wide selector and
that the reference disappears when the element is removed.

## Verify

Remove and recreate the element. Confirm the reference points to the new node
and no page-wide selector remains.
