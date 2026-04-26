---
title: "$exceptionHandlerProvider"
description: "Configure the $exceptionHandler service used for framework and application errors."
---

`$exceptionHandlerProvider` configures the function used by `$exceptionHandler`.
The default handler rethrows the exception, and custom handlers should preserve
that behavior after reporting the error.

Exact signatures live in TypeDoc:

- [`ExceptionHandlerProvider`](../../../typedoc/classes/ExceptionHandlerProvider.html)
- [`ExceptionHandler`](../../../typedoc/types/ExceptionHandler.html)

## Configure Error Reporting

```js
angular.module("demo", []).config(($exceptionHandlerProvider) => {
  $exceptionHandlerProvider.handler = (error) => {
    myLogger.capture(error);
    throw error;
  };
});
```

Rethrowing matters because the framework assumes `$exceptionHandler` does not
silently swallow fatal errors.

For service usage, see [$exceptionHandler]({{< relref "/docs/service/exceptionHandler" >}}).
