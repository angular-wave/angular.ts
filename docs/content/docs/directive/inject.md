---
title: ng-inject
description: >
  Inject dependencies into scope.
---

### Description

The `ng-inject` directive injects registered injectables (services, factories,
etc.) into the current scope for direct access within templates or expressions.
This allows access to application state without having to create intermediary
controllers.

When applied to an element, the directive reads a semicolon-separated list of
injectables' names from the `ng-inject` attribute and attempts to retrieve them
from the `$injector`. Each resolved injectable is attached to the current scope
under its corresponding name.

### Parameters

---

#### `ng-inject`

- **Type:** `string`
- **Restrict:** `A`
- **Description:**  
   A semicolon-separated list of injectable' names to attach to current scope.
- **Example:**

  ```html
  <div ng-inject="userService;accountService"></div>
  ```

---

### Demo

{{< showhtml src="examples/ng-inject/ng-inject.html" >}}

{{< showraw src="examples/ng-inject/ng-inject.html" >}}

---
