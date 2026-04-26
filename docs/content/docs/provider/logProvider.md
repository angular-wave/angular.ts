---
title: $logProvider
description: >
  Configure logging behavior for $log.
---

Use `$logProvider` during module configuration to enable debug logging or
replace the logger implementation.

Exact provider members are documented in TypeDoc:

- [LogProvider](../../../typedoc/classes/LogProvider.html)
- [LogService](../../../typedoc/interfaces/LogService.html)

## Debug Logging

```js
angular.module('app', []).config(($logProvider) => {
  $logProvider.debug = true;
});
```

## Custom Logger

```js
angular.module('app', []).config(($logProvider) => {
  $logProvider.setLogger(() => ({
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  }));
});
```

See also [$log](../../../docs/service/log).
