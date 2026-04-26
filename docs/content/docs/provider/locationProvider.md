---
title: $locationProvider
description: >
  Configure URL mode and hash-prefix behavior for $location.
---

Use `$locationProvider` during module configuration to choose how AngularTS reads
and writes browser URLs.

Exact provider members are documented in TypeDoc:

- [LocationProvider](../../../typedoc/classes/LocationProvider.html)

## HTML5 Mode

HTML5 mode uses the History API for clean URLs. Server routing must return the
application shell for deep links.

```js
angular.module('app', []).config(($locationProvider) => {
  $locationProvider.html5ModeConf = {
    enabled: true,
    requireBase: false,
    rewriteLinks: true,
  };
});
```

## Hash Prefix

Hash mode keeps application state after the `#` fragment. Configure the prefix
when you need hashbang-style URLs or compatibility with existing links.

```js
angular.module('app', []).config(($locationProvider) => {
  $locationProvider.hashPrefixConf = '!';
});
```

See also [$location](../../../docs/service/location).
