---
title: $interpolateProvider
description: >
  Configure interpolation delimiters.
---

Use `$interpolateProvider` when AngularTS interpolation conflicts with a
server-side template language that also uses `{{ }}`.

```js
angular.module('app', []).config(($interpolateProvider) => {
  $interpolateProvider.startSymbol = '[[';
  $interpolateProvider.endSymbol = ']]';
});
```

See also [Templates and interpolation](../../../docs/concepts/templates-interpolation).
