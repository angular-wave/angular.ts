---
title: ng-el
description: >
  Reference to an element
---

### Description

The `ng-el` directive allows you to store a reference to a DOM element in the
current `scope`, making it accessible elsewhere in your template or from your
controller. The reference is automatically removed if the element is removed
from the DOM.

Use `ng-el` for the common case where you want the native element itself:

```html
<section ng-controller="BoardController as $ctrl">
  <canvas ng-el="$ctrl.boardEl"></canvas>
</section>
```

```javascript
function BoardController() {
  this.boardEl = null;
}
```

Use a bare name for simple scope shorthand:

```html
<canvas ng-el="boardEl"></canvas>
```

Use a full assignable expression for controller-as or object-path refs:

```html
<canvas ng-el="$ctrl.boardEl"></canvas>
<section ng-el="refs.panel"></section>
```

For component or directive controller references, use `ng-ref` instead:

```html
<search-box ng-ref="$ctrl.search"></search-box>
```

`ng-ref-read` is only a modifier for `ng-ref`. It is useful when you need an
assignable expression and want to force a specific read target:

```html
<canvas ng-ref="$ctrl.boardEl" ng-ref-read="$element"></canvas>
```

For simple DOM element references, `ng-el` is the clearer API.

### Parameters

---

#### `ng-el`

- **Type:** `string` (optional)
- **Description:** Name of the key under which the element will be stored in
  `scope`, or an assignable expression such as `$ctrl.boardEl`. Bare names are
  treated as shorthand keys. If omitted, the element’s `id` attribute will be
  used.
- **Example:**

  ```html
  <div ng-el="box"></div>
  <div ng-el="$ctrl.box"></div>
  <div id="box" ng-el></div>
  ```

---

### Demo

{{< showhtml src="examples/ng-el/ng-el.html" >}}
{{< showraw src="examples/ng-el/ng-el.html" >}}

---
