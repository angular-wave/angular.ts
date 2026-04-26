---
title: "ng-show"
description: "Show an element when an expression is truthy."
---
Toggles the CSS `display` property of an element without removing it from the DOM. The element's scope is always alive, regardless of visibility.

```html
<div ng-hide="isLoading">Content here</div>
```
#### `ng-show`

- **Type:** `expression`
- **Required:** yes

When truthy, the element is visible (removes the `ng-hide` CSS class). When falsy, the element is hidden.
#### `ng-hide`

- **Type:** `expression`
- **Required:** yes

Inverse of `ng-show`. When truthy, the element is hidden.

**Animation hooks:** `.ng-hide-add` / `.ng-hide-add-active` when hiding, `.ng-hide-remove` / `.ng-hide-remove-active` when showing.
### ng-if vs ng-show/hide

| Aspect              | `ng-if`                 | `ng-show` / `ng-hide`            |
| ------------------- | ----------------------- | -------------------------------- |
| DOM presence        | Removed when false      | Always in DOM                    |
| Scope lifetime      | Destroyed when false    | Always alive                     |
| Child watchers      | Removed when false      | Always active                    |
| Initial render cost | Only when true          | Always rendered                  |
| Animation events    | `ng-enter` / `ng-leave` | `ng-hide-add` / `ng-hide-remove` |

**Use `ng-if`** when the content is expensive to render or when you want to prevent hidden content from making network requests.\
**Use `ng-show/hide`** when toggling frequently and you need instant re-display without re-initiali
