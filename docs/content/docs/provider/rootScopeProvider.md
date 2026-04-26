---
title: $rootScopeProvider
description: >
  Configure root scope behavior.
---

Use `$rootScopeProvider` for application-wide scope configuration before the root
scope service is created.

Exact provider members are documented in TypeDoc:

- [RootScopeProvider](../../../typedoc/classes/RootScopeProvider.html)

## Digest Iteration Limit

The digest TTL prevents infinite watch loops. Increase it only when you have a
known, intentional chain of watchers that requires more iterations.

```js
angular.module('app', []).config(($rootScopeProvider) => {
  $rootScopeProvider.digestTtl(15);
});
```

See also [$rootScope](../../../docs/service/rootScope).
