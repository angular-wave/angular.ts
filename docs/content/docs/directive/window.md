---
title: ng-window-* and ng-document-*
description: >
  Handler for window and document events
---

### Description

The `ng-window-*` and `ng-document-*` directives allow you to specify custom
behavior for events dispatched from the `Window` or `Document` object. The event
name is defined by including it in the placeholder of the directive name.
Example: `ng-window-online` binds to the window `online` event, and
`ng-document-pointerup` binds to the document `pointerup` event.

Listeners are removed automatically when the owning scope is destroyed.

For standard event names, see
[Window events](https://developer.mozilla.org/en-US/docs/Web/API/Window#events)
and
[Document events](https://developer.mozilla.org/en-US/docs/Web/API/Document#events).

### Parameters

---

#### `ng-window-*`

- **Type:** [Expression](../../../typedoc/types/Expression.html)
- **Description:** Expression to evaluate upon event dispatch.
  [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event) object is
  available as `$event`.
- **Example:**

  ```html
  <div ng-window-message="data = $event.message.date">{{ data }}</div>
  ```

#### `ng-document-*`

- **Type:** [Expression](../../../typedoc/types/Expression.html)
- **Description:** Expression to evaluate upon document event dispatch.
  [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event) object is
  available as `$event`.
- **Example:**

  ```html
  <div ng-document-pointerup="$ctrl.endDrag($event)"></div>
  ```

---

#### Demo

{{< showdemo src="examples/ng-window/ng-window.html" >}}

---
