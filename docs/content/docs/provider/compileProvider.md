---
title: $compileProvider
description: >
  Configure compiler behavior.
---

Use `$compileProvider` during module configuration for compiler-level behavior:
registering directives and controlling debug metadata.

## Registering Directives

```js
angular.module('app', []).config(($compileProvider) => {
  $compileProvider.directive('focusOn', () => ({
    restrict: 'A',
    link(scope, element) {
      element.focus();
    },
  }));
});
```

## Debug Metadata

Disable debug metadata in production when you do not need scope lookup from DOM
nodes.

```js
angular.module('app', []).config(($compileProvider) => {
  $compileProvider.debugInfoEnabled(false);
});
```
