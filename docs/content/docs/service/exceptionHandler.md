---
title: $exceptionHandler
description: >
  Error handling service
---

### Description 

`$exceptionHandler` is the central hook for uncaught exceptions inside an AngularTS application.
The framework routes all errors from synchronous code, async tasks, expression evaluation, and dependency injection through this service.

By default, it rethrows exceptions that occur during AngularTS-managed execution. This fail-fast behavior ensures errors are visible immediately in development and in unit tests.
<div class="alert alert-danger" role="alert">

**IMPORTANT**: In AngularJS, `$exceptionHandler` only caught errors in expressions and 
logged them to the console, using a type signature of `$exceptionHandler(exception, [cause])`.

AngularTS treats `$exceptionHandler` as a single error sink, fails eagerly, and assumes that the [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) object or one of its subclasses provides all the context necessary for the client.

</div>

For type description, see [ng.ExceptionHandler](../../../typedoc/types/ExceptionHandler.html).

For service customisation, see [ng.ExceptionHandlerProvider](../../../docs/provider/exceptionhandlerprovider/)