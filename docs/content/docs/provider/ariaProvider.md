---
title: $ariaProvider
description: >
  Configure automatic ARIA attributes.
---

Use `$ariaProvider` to choose which accessibility attributes AngularTS manages
for common directives such as `ng-show`, `ng-hide`, `ng-model`, and disabled
controls.

```js
angular.module('app', []).config(($ariaProvider) => {
  $ariaProvider.config({
    ariaHidden: true,
    ariaChecked: true,
    ariaDisabled: true,
    ariaRequired: true,
    ariaReadonly: true,
    ariaValue: true,
    tabindex: true,
  });
});
```

See also [ng-aria](../../../docs/directive/aria).
