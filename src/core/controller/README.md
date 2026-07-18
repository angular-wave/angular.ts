# Controller Service

This module owns named controller declarations and the `$controller` service
that instantiates controller constructors through AngularTS dependency
injection.

## Responsibilities

- Store controller declarations registered through `NgModule.controller(...)`.
- Resolve named controller expressions, including `Controller as alias` syntax.
- Instantiate class, function, and array-annotated controllers with injector
  locals.
- Support deferred controller construction used by the compile/link pipeline.
- Publish controller aliases to the linked scope.
- Release runtime-owned declarations during runtime teardown.

## Public Surface

- `NgModule.controller(name, constructor)` registers a named controller.
- `$controller(expression, locals?, later?, ident?)` creates a controller
  instance or a deferred initializer.
- `ControllerService`, `ControllerExpression`, and `ControllerLocals` describe
  the injectable service contract.

`ControllerRegistry` and `createControllerService(...)` are internal runtime
composition details. Applications and extension modules register controllers
through their AngularTS module and never inject a controller provider.

## Runtime Model

Each AngularTS runtime owns one controller registry. Every module created by
that runtime records controller declarations against the same registry, so
declarations are available when the injector later creates `$controller`.

The service resolves the registry at invocation time. Direct constructor
expressions do not require registration; string expressions must match a
registered name. Runtime destruction clears the registry and rejects further
access.

## Example

```ts
const app = angular.module("app", []);

app.controller("GreetingController", [
  "$scope",
  function GreetingController($scope) {
    $scope.message = "Hello";
  },
]);
```
