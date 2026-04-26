---
title: $compileProvider
description: >
  Configure compiler behavior and URL sanitization.
---

Use `$compileProvider` during module configuration for compiler-level behavior:
registering directives, configuring URL sanitization, and controlling debug
metadata.

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

## URL Sanitization

Configure trusted URL patterns for links and media sources before templates are
compiled.

```js
angular.module('app', []).config(($compileProvider) => {
  $compileProvider.aHrefSanitizationTrustedUrlList(/^https?:/);
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
