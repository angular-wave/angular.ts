---
title: $exceptionHandlerProvider
description: >
  Configuration provider for `$exceptionHandler` service.
---

### Description

Instance of [ng.ExceptionHandlerProvider](../../../typedoc/classes/ExceptionHandlerProvider.html) for
configuring the `$exceptionHandler` service. 

The default implementation returns 
[ng.ExceptionHandler](../../../typedoc/types/ExceptionHandler.html) function, which simply rethrows the exception.

**NOTE**: custom implementations should always rethrow the error as the framework assumes that `$exceptionHandler` always does the throwing.


### Properties

---

#### $exceptionHandler.handler

Customize the `exceptionHandler` function.

- **Type:** [ng.ExceptionHandler](../../../typedoc/classes/PubSub.html)
- **Default:** Function that rethrows the exception.
- **Example:**
  ```js
  angular.module('demo', [])
    .config([
      "$exceptionHandlerProvider",
      /** @param {ng.ExceptionHandlerProvider} $exceptionHandlerProvider */
      ($exceptionHandlerProvider) => {
        exceptionHandlerProvider.handler = (error) => {
          myLogger.capture(error);
          // Rethrow to preserve fail-fast behavior:
          throw error;
        };
      }
    ]);
  ```

---

For service description, see [$exceptionHandler](../../../docs/service/exceptionhandler/).