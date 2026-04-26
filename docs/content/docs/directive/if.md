---
title: "ng-if"
description: "Conditionally add or remove an element from the DOM."
---
Adds or removes an element from the DOM based on the truthiness of an expression. When the element is removed, its scope and all child scopes are destroyed. When re-added, a fresh scope is created.

```html
  Welcome back, {{ user.name }}!
</div>
```
#### `ng-if`

- **Type:** `expression`
- **Required:** yes

When truthy, the element is rendered. When falsy, the element and its scope are destroyed and removed from the DOM.

**Animation hooks:** `.ng-enter` / `.ng-enter-active` when added, `.ng-leave` / `.ng-leave-active` when removed.

> **Note:** `ng-if` creates a child scope. If you bind `ng-model` inside an `ng-if`, write to an object property (`obj.field`) rather than a primitive to avoid scope shadowing issues.
