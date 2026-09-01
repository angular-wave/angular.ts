---
title: $window
description: >
  Injectable `window` object
---

### Description

An injectable wrapper for `window`
[object ](https://developer.mozilla.org/en-US/docs/Web/API/Window). Useful for
mocking a browser dependency in non-browser environment tests:

**Example:**

```js
// value injectables are overriden
angular.createModule('demo', []).value('$window', {});
```

When combined with `ng-inject` directive, the wrapper also makes `window` object
directly accessible in the template scope.

#### Demo

{{< showhtml src="examples/window/window.html" >}}

{{< showraw src="examples/window/window.html" >}}

---
