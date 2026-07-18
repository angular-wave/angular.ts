# Exception Handler Service

This module owns AngularTS fail-fast exception handling and the typed runtime
configuration used to replace the default handler.

## Responsibilities

- Provide the injectable `$exceptionHandler` service.
- Rethrow exceptions unchanged by default.
- Apply `NgModule.config({ $exceptionHandler: ... })` configuration.
- Keep one stable service function while allowing configuration to replace its
  delegated handler.
- Supply early-composed framework systems, including the router, with the same
  live handler contract.
- Release configured handler references during runtime teardown.

## Public Surface

- `ExceptionHandler` describes the fail-fast callback contract.
- `ExceptionHandlerConfig` configures the handler through `NgModule.config`.
- `ng.ExceptionHandlerService` is the injectable `$exceptionHandler` contract.

The runtime state and its construction helpers are internal composition
details. Applications do not inject an exception-handler provider.

## Configuration

```ts
angular.module("app", []).config({
  $exceptionHandler: {
    handler(error): never {
      reportError(error);
      throw error;
    },
  },
});
```

Applications may decorate `$exceptionHandler` when they need injector-backed
dependencies. The typed config path is preferred for application-wide handler
policy that does not require injected services.

## Runtime Model

The runtime owns one mutable handler reference and one stable service wrapper.
Framework systems can retain the wrapper before module config blocks run; each
call delegates to the latest configured handler. Destruction clears the custom
handler and rejects subsequent calls.
