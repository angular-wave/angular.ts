---
title: Read Fluent UI custom-element state with ng-observe
description: Mirror reflected web-component attributes into AngularTS scope
weight: 96
---

## Problem

A custom element owns its internal behavior and reports current state by
changing an attribute. AngularTS needs that value without taking over the
element's DOM.

## Before you start

Confirm the component reflects the required state to an attribute. `ng-observe`
watches attributes with `MutationObserver`; it does not poll JavaScript-only
properties.

## Observe the Fluent UI attribute

This example is taken from the repository's Fluent UI observe demo.

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/observe/observe.spec.ts -->

```html
<section>
  <fluent-select
    ng-observe-current-value="selectedSection"
    title="Select a section"
  >
    <fluent-option value="Beginning">Beginning</fluent-option>
    <fluent-option value="Middle">Middle</fluent-option>
    <fluent-option value="End">End</fluent-option>
  </fluent-select>
  <p>Selected section: {{ selectedSection }}</p>
</section>
```

`ng-observe-current-value="selectedSection"` watches the `current-value`
attribute and writes its value to `selectedSection` on the current scope. If the
directive value is omitted, the camel-cased attribute name becomes the scope
name: `ng-observe-aria-checked` writes to `ariaChecked`.

The same shipped demo observes `activeid` on `fluent-tabs`, `value` on
`fluent-radio-group`, and `aria-checked` on `fluent-switch`.

## Failure path

Use the exact reflected attribute name documented by the web component. If the
component changes only a JavaScript property, use its custom event or an adapter
instead. The observer disconnects automatically when the scope is destroyed.

## Apply it now

Open the custom element in the Elements panel and interact with it. Identify the
attribute that actually changes, then bind only that attribute with
`ng-observe`.

## Verify

Check the initial reflected value, change the selection, set the same value
again, and destroy the AngularTS root. Confirm scope follows real attribute
changes and the observer is disconnected on teardown.
