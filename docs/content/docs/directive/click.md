---
title: ng-click
description: >
  Handler for click event
---

### Description

The `ng-click` directive allows you to specify custom behavior when an element
is clicked.

### Parameters

---

#### `ng-click`

- **Type:** [Expression](../../../typedoc/types/Expression.html)
- **Restrict:** `A`
- **Element:** ANY
- **Priority:** `0`
- **Description:** Expression to evaluate upon
  [click](https://developer.mozilla.org/en-US/docs/Web/API/Element/click_event)
  event.
  [PointerEvent](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent)
  object is available as `$event`.
- **Example:**

  ```html
  <div ng-click="$ctrl.greet($event)"></div>
  ```

  Event policy attributes can be added to the same element:

  ```html
  <button ng-click="$ctrl.submit($event)" data-event-prevent data-event-once>
    Submit
  </button>
  ```

  `data-event-prevent`, `data-event-stop`, `data-event-capture`,
  `data-event-once`, and `data-event-passive` apply to every event directive on
  the same element.

---

#### Demo

{{< showhtml src="examples/ng-click/ng-click.html" >}}

{{< showraw src="examples/ng-click/ng-click.html" >}}

---
