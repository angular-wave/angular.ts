---
title: $templateCache
description: >
  Map object for storing templates
---

`$templateCache` is a
[Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
object used by template loading and component rendering.

Configure the cache before bootstrap with
`module.config({ $templateCache: ... })`.

```js
angular.module("demo", []).config({
  $templateCache: {
    cache: new Map([["templateId.html", "This is the content of the template"]]),
  },
});
```

Executable sample:
[`template-cache.html`](/examples/config/template-cache.html)

The first time a template is used, it is loaded in the template cache for quick
retrieval. You can load templates directly into the cache in a script tag by
using $templateRequest or by consuming the $templateCache service directly.

Adding via the script tag:

#### Example

```html
<script type="text/ng-template" id="templateId.html">
  <p>This is the content of the template</p>
</script>
```

Note: the script tag containing the template does not need to be included in the
head of the document, but it must be a descendent of the $rootElement (e.g.
element with `ng-app` attribute), otherwise the template will be ignored.

Adding via the `$templateCache` service:

#### Example

```js
const myApp = angular.module('myApp', []).run(($templateCache) => {
  $templateCache.set('templateId.html', 'This is the content of the template');
});
```

To retrieve the template, simply use it in your component:

```js
myApp.component('myComponent', {
  templateUrl: 'templateId.html',
});
```

or include it with `ng-include`:

```html
<div ng-include="'templateId.html`"></div>
```

or get it via the `$templateCache` service:

```js
myApp.controller(
  'Test',
  class {
    constructor($templateCache) {
      const tmp = $templateCache.get('templateId.html');
    }
  },
);
```
