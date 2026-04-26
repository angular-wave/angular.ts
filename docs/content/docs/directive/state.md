---
title: "ng-state"
description: "Bind state declaration data in templates."
---
A dynamic alternative to `ng-sref` where both the state name and params come from scope expressions rather than being hardcoded in the attribute.

```html
```
#### `ng-state`

- **Type:** `expression`
- **Required:** yes

Expression that evaluates to a state name string.
#### `ng-state-params`

- **Type:** `expression`

Expression that evaluates to the params object for the state.

```javascript
$scope.currentParams = { userId: 42 };
```
