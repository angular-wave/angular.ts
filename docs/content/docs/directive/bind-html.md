---
title: "ng-bind-html"
description: "Bind trusted HTML content to an element."
---
Sets the `innerHTML` of an element to a trusted HTML string. The value must be explicitly trusted through the `$sce` service to prevent XSS.

```html
```

```javascript
  $scope.trustedHtml = $sce.trustAsHtml('<strong>Hello</strong> <em>world</em>');
});
```
#### `ng-bind-html`

- **Type:** `expression`
- **Required:** yes

Expression that evaluates to a value marked as trusted HTML via `$sce.trustAsHtml()`. Untrusted strings will throw an SCE error.

> **Warning:** Never pass user-supplied content directly to `$sce.trustAsHtml()`. Only trust HTML you control or have saniti
