---
title: "ng-repeat"
weight: 90
description: "Complete reference for ng-repeat: iterating arrays and objects, track by, special scope variables, filters, multi-element repeat, and performance guidance."
---
`ng-repeat` instantiates a template for each item in a collection, creating a child scope for every element. It is the primary directive for rendering lists and grids in AngularTS.
## Basic syntax

```html
<li ng-repeat="item in items">{{ item.name }}</li>

<!-- Iterate an object (key-value pairs) -->
<tr ng-repeat="(key, value) in user">
  <td>{{ key }}</td><td>{{ value }}</td>
</tr>
```
#### `ng-repeat`

- **Type:** `expression`
- **Required:** yes

One of these forms:

* `item in collection` — iterate array or array-like
* `(key, value) in object` — iterate object properties
* `item in collection track by expression` — with explicit tracking
* `item in collection | filter:fn` — with inline filter
## Special scope variables

Every `ng-repeat` child scope exposes these read-only properties:
#### `$index`

- **Type:** `number`

Zero-based position of the item in the collection.
#### `$first`

- **Type:** `boolean`

`true` for the first item (`$index === 0`).
#### `$last`

- **Type:** `boolean`

`true` for the last item.
#### `$middle`

- **Type:** `boolean`

`true` for items that are neither first nor last.
#### `$even`

- **Type:** `boolean`

`true` when `$index` is even.
#### `$odd`

- **Type:** `boolean`

`true` when `$index` is odd.

```html
    ng-class="{ first: $first, last: $last, odd: $odd }">
  {{ $index + 1 }}. {{ item.name }}
</li>
```
## track by

By default, `ng-repeat` tracks items by object identity. When the collection changes, it destroys and recreates DOM nodes for items that aren't the same object reference. `track by` lets you specify a stable key, dramatically improving performance when data is re-fetched from a server.

```html
<li ng-repeat="user in users track by user.id">{{ user.name }}</li>

<!-- Track by $index — useful for arrays of primitives -->
<li ng-repeat="tag in tags track by $index">{{ tag }}</li>
```

> **Warning:** Do not use `track by $index` when items can be reordered or deleted — it causes incorrect DOM reuse. Use a stable unique ID instead.
## Filtering and sorting

Apply filters inline in the `ng-repeat` expression:

```html
<li ng-repeat="item in items | filter:searchText">{{ item.name }}</li>

<!-- Filter by object (matches any field) -->
<li ng-repeat="item in items | filter:{ category: 'books' }">{{ item.name }}</li>

<!-- Sort ascending -->
<li ng-repeat="item in items | orderBy:'name'">{{ item.name }}</li>

<!-- Sort descending -->
<li ng-repeat="item in items | orderBy:'-price'">{{ item.name }}</li>

<!-- Limit to first 10 -->
<li ng-repeat="item in items | limitTo:10">{{ item.name }}</li>

<!-- Chain filters -->
<li ng-repeat="item in items | filter:query | orderBy:'name' | limitTo:20">
  {{ item.name }}
</li>
```
## Multi-element repeat

Use `ng-repeat-start` and `ng-repeat-end` to repeat a block of sibling elements (not just a single element):

```html
<dd ng-repeat-end>{{ def.description }}</dd>
```

This produces alternating `<dt>` / `<dd>` pairs, one for each item in `definitions`.
## Animating ng-repeat

`ng-repeat` integrates with `$animate`. Added items receive `.ng-enter`, removed items `.ng-leave`, and moved items `.ng-move` CSS classes:

```css
  transition: opacity 0.3s;
  opacity: 0;
}
.my-list li.ng-enter-active {
  opacity: 1;
}
.my-list li.ng-leave {
  transition: opacity 0.3s;
  opacity: 1;
}
.my-list li.ng-leave-active {
  opacity: 0;
}
```
## Performance guidance

* Always use `track by` with a unique ID for large lists.
* Avoid complex expressions in `ng-repeat` — compute derived values in the controller.
* Use `limitTo` to paginate rather than rendering thousands of items.
* One-time bind static content: `{{ ::item.name }}` avoids watches on items that never change.
