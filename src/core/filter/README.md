# Filter Service

This module owns expression filter declarations and the `$filter` service that
resolves instantiated filters through AngularTS dependency injection.

## Responsibilities

- Store filter factories registered through `NgModule.filter(...)`.
- Bind each declaration as an injectable `<name>Filter` service.
- Resolve filters by their declaration name through `$filter(name)`.
- Replay declarations when another injector is created for the same runtime.
- Release runtime-owned declarations during runtime teardown.

## Public Surface

- `NgModule.filter(name, factory)` registers a filter factory.
- `$filter(name)` resolves the instantiated filter.
- `FilterFactory`, `FilterFn`, and `FilterService` describe the public
  declaration and injectable service contracts.

`FilterRegistry` and `createFilterService(...)` are internal runtime
composition details. Applications and extension modules register filters
through their AngularTS module and never inject a filter provider.

## Runtime Model

Each AngularTS runtime owns one filter registry. Module declarations target
that registry directly. When an injector is created, the registry binds its
declarations into the injector as `<name>Filter` factories, preserving normal
dependency injection for filter factories and consumers.

The `$filter` service resolves those injector-owned instances by declaration
name. Runtime destruction clears the declaration registry and rejects further
use.

## Example

```ts
const app = angular.module("app", []);

app.filter("uppercaseFirst", () => (value: string) => {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
});
```

```html
<p>{{ user.name | uppercaseFirst }}</p>
```
