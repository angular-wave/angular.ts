---
title: $sceDelegateProvider
description: >
  Configure trusted and banned resource URL policies for SCE.
---

Use `$sceDelegateProvider` to control which resource URLs AngularTS may load for
contexts such as templates, includes, iframes, and other resource fetches.

Exact provider members are documented in TypeDoc:

- [SceDelegateProvider](../../../typedoc/classes/SceDelegateProvider.html)

## Trusted Resource URLs

Allow same-origin resources with `self`, exact strings, wildcard strings, or
regular expressions.

```js
angular.module('app', []).config(($sceDelegateProvider) => {
  $sceDelegateProvider.trustedResourceUrlList([
    'self',
    'https://cdn.example.com/**',
  ]);
});
```

## Banned Resource URLs

Banned patterns override trusted patterns. Use them to block a narrower path
inside a broader trusted origin.

```js
angular.module('app', []).config(($sceDelegateProvider) => {
  $sceDelegateProvider.bannedResourceUrlList([
    'https://cdn.example.com/private/**',
  ]);
});
```

See also [$sce](../../../docs/service/sce).
