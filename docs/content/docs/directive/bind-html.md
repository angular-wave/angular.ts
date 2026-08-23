---
title: 'ng-bind-html'
description:
  'Bind an HTML string to an element after the application has sanitized it.'
---

Sets an element's `innerHTML` to the evaluated string.

```html
<div ng-bind-html="articleHtml"></div>
```

```js
$scope.articleHtml = '<strong>Hello</strong> <em>world</em>';
```

#### `ng-bind-html`

- **Type:** `expression`
- **Required:** yes

Expression that evaluates to an HTML string. `null` and `undefined` clear the
element.

> **Warning:** This directive does not sanitize the string. Never bind raw user
> input or untrusted server content. Sanitize it before assigning it to scope.
