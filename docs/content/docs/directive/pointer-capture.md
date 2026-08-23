---
title: ng-pointer-capture
description: >
  Capture active pointer streams on an element
---

### Description

The `ng-pointer-capture` directive captures a pointer stream that starts on the
element and releases it when the pointer ends or is cancelled. This is useful
for board, canvas, and game-style interfaces where `pointermove` and `pointerup`
should continue reaching the same element even when the pointer leaves its
bounds.

`ng-pointer-capture` does not implement dragging behavior. It only manages the
browser pointer capture lifecycle. Register native pointer listeners from an
application directive for drag behavior.

### Parameters

---

#### `ng-pointer-capture`

- **Type:** boolean attribute
- **Restrict:** `A`
- **Element:** ANY
- **Priority:** `1`
- **Description:** Calls `setPointerCapture($event.pointerId)` on `pointerdown`,
  releases capture on `pointerup` and `pointercancel`, forgets browser-released
  pointers on `lostpointercapture`, and releases active captures when the scope
  is destroyed.
- **Example:**

  ```html
  <div
    ng-pointer-capture
    pointer-drag
  ></div>
  ```

---

### Demo

{{< showhtml src="examples/ng-pointer-capture/ng-pointer-capture.html" >}}

{{< showraw src="examples/ng-pointer-capture/ng-pointer-capture.html" >}}

---
