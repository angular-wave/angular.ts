---
title: $exceptionHandler
description: >
  Error handling service
---

### Description

`$exceptionHandler` is the central hook for exceptions that escape detached
AngularTS-managed work. This includes DOM and transport events, scheduled tasks,
subscriptions, expression evaluation, and lifecycle callbacks whose original
caller can no longer receive a thrown value or rejected promise.

The decision is: can the initiating caller still receive the failure? If yes,
throw synchronously or reject the returned promise. Use `$exceptionHandler` only
after that caller boundary no longer exists.

Synchronous API validation throws directly. Promise-returning operations reject
their returned promise. Expected transport, workflow, routing, and domain
failures remain in their typed operation channels.

By default, it rethrows exceptions that occur during AngularTS-managed
execution. This fail-fast behavior ensures errors are visible immediately in
development and in unit tests.

<div class="alert alert-danger" role="alert">

**IMPORTANT**: In AngularJS, `$exceptionHandler` only caught errors in
expressions and logged them to the console, using a type signature of
`$exceptionHandler(exception, [cause])`.

AngularTS treats `$exceptionHandler` as a single error sink and fails eagerly.
It preserves the thrown value unchanged. Applications should throw
[Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
objects with a `cause` when reporting requires structured context.

</div>

For type description, see
[ng.ExceptionHandler](../../../typedoc/types/ExceptionHandler.html).

## Configure

Use `module.config({ $exceptionHandler: ... })` for application-wide error
reporting policy.

```js
angular.module('app', []).config({
  $exceptionHandler: {
    handler(error) {
      myReporter.capture(error);
      throw error;
    },
  },
});
```

Custom handlers should rethrow after reporting. AngularTS treats
`$exceptionHandler` as fail-fast, and swallowing errors can hide broken
application state.

Executable sample:
[`exception-handler.html`](/examples/config/exception-handler.html)
