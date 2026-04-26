---
title: "ng-bind-template"
description: "Bind interpolated template text to an element."
---
Binds a template string that may contain multiple `{{ }}` interpolation expressions. Useful on attributes or when you need mixed text and expressions in the element's text content.

```html
```
#### `ng-bind-template`

- **Type:** `string`
- **Required:** yes

A string literal containing one or more `{{ expression }}` interpolations. The entire string is interpolated and set as `textContent`.
