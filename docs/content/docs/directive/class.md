---
title: ng-class
description: >
  Dynamically bind one or more CSS classes using expressions.
---

### Description

The `ng-class` directive allows dynamically setting CSS classes on an HTML
element by binding to an expression. The directive supports the following
expression types:

- **String** — space-delimited class names.
- **Object** — keys as class names and values as booleans. Truthy values add the
  class.
- **Array** — containing strings and/or objects as described above.

For complex view state, bind a precomputed class map instead of embedding a long
object expression in the template:

```html
<button ng-class="tile.classes"></button>
```

```javascript
/**
 * @param {{ state: string, sunk: boolean }} tile
 * @returns {ng.ClassMap}
 */
function tileClasses(tile) {
  return {
    placed: tile.state === 'unit',
    hit: tile.state === 'hit',
    miss: tile.state === 'miss',
    sunk: tile.sunk,
  };
}
```

When the expression changes:

- Previously added classes are removed.
- New classes are added.
- Duplicate classes are avoided.

**Important**: Avoid using interpolation (`{{ ... }}`) in the value of the
`class` attribute together with `ng-class`. See
[interpolation known issues](../../../docs/guide/interpolation#known-issues) for
details.

### Animations

If `data-animate` attribute is present, the following animations will be applied
to the element:

| Animation                               | Occurs                                              |
| --------------------------------------- | --------------------------------------------------- |
| [`add-class`](../../service/animate)    | Before the class is applied to the element          |
| [`remove-class`](../../service/animate) | Before the class is removed from the element        |
| [`set-class`](../../service/animate)    | Before classes are simultaneously added and removed |

> `ng-class` supports standard CSS3 transitions/animations even if they don’t
> follow `$animate` service naming conventions.

### Parameters

---

#### `ng-class`

- **Type:** `string | object | array`
- **Type alias:** `ng.ClassValue`
- **Description:** An expression whose result determines the CSS classes to
  apply.
- **Example:**

  ```html
  <div ng-class="{ active: isActive, disabled: isDisabled }"></div>
  ```

### Demo

{{< showhtml src="examples/ng-class/ng-class.html" >}}

{{< showraw src="examples/ng-class/ng-class.html" >}}

---
