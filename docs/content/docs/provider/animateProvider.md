---
title: $animateProvider
description: >
  Configure the animation system.
---

Use `$animateProvider` during module configuration to limit which elements
animate and to register JavaScript animation factories.

## Filtering Animations

Class-name filtering is useful when you want animation support only for specific
parts of the DOM.

```js
angular.module('app', []).config(($animateProvider) => {
  $animateProvider.classNameFilter(/ng-animate/);
});
```

## JavaScript Animation Factories

Register a factory for a CSS selector when CSS transitions are not enough.

```js
angular.module('app', []).config(($animateProvider) => {
  $animateProvider.register('.fade-card', () => ({
    enter(element, done) {
      element.animate([{ opacity: 0 }, { opacity: 1 }], 150).finished.then(done);
    },
  }));
});
```

See also [Animation Directives](../../../docs/directives/animations).
