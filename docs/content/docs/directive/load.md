---
title: ng-load
description: >
  Handler for load event
---

### Description

The `ng-load` directive allows you to specify custom behavior for elements that
trigger
[load](https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event)
event.

**Note**: there is no guarantee that the browser will bind `ng-load` directive
before loading its resource. Demo below is using a large image to showcase
itself.

### Parameters

---

#### `ng-load`

- **Type:** [Expression](../../../typedoc/types/Expression.html)
- **Description:** Expression to evaluate upon
  [load](https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event)
  event. [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event) object
  is available as `$event`.
- **Example:**

```html
<div>
  <img src="url" ng-load="$ctrl.load($event)" />
</div>
```

---

#### Demo

{{< showhtml src="examples/ng-load/ng-load.html" >}}

{{< showraw src="examples/ng-load/ng-load.html" >}}

---
