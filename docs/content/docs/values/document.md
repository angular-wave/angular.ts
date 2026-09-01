---
title: $document
description: >
  Injectable `window.document` object
---

### Description

An injectable wrapper for `window.document`
[object ](https://developer.mozilla.org/en-US/docs/Web/API/Document). Useful for
mocking a browser dependency in non-browser environment tests:

**Example:**

```js
// value injectables are overriden
angular.createModule('demo', []).value('$document', {});
```

When combined with `ng-inject` directive, the wrapper also makes `document`
object directly accessible in the template scope.

#### Demo

{{< showhtml src="examples/document/document.html" >}}

{{< showraw src="examples/document/document.html" >}}

---
