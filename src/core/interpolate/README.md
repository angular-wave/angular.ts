# Interpolation Service

This module compiles interpolation text such as `Hello {{ name }}` into
functions that evaluate against a scope or another expression context.

## Responsibilities

- Parse one or more interpolation expressions through `$parse`.
- Stringify expression results and preserve all-or-nothing behavior.
- Apply compiler-owned binding policies and strict-context concatenation rules.
- Support escaped interpolation markers.
- Apply runtime-owned start and end delimiter configuration.
- Expose the configured delimiters through `$interpolate.startSymbol()` and
  `$interpolate.endSymbol()`.

## Public Surface

- `$interpolate(text, mustHaveExpression?, bindingContext?, allOrNothing?)`
  compiles interpolation text.
- `NgModule.config({ $interpolate: { startSymbol, endSymbol } })` configures
  application-wide delimiters before service construction.
- `InterpolateService`, `InterpolationFunction`, and `InterpolateConfig`
  describe the public service and configuration contracts.

`bindingContext` identifies the DOM destination whose compiler policy checks
the interpolated value: `html`, `url`, `mediaUrl`, `resourceUrl`, `script`, or
`scriptUrl`. Configure those policies through `$compile` configuration.

The runtime state and service-registration helpers are internal composition
details. Applications configure interpolation through their AngularTS module
and never inject an interpolation provider.

## Runtime Model

Each AngularTS runtime owns one interpolation configuration state. Module
configuration updates that state during injector setup, and the lazy
`$interpolate` factory snapshots the resulting delimiters when the service is
first resolved. The compiler and application code receive the same singleton
service from the injector.

## Example

```ts
const app = angular.createModule("app", []);

app.config({
  $interpolate: {
    startSymbol: "[[",
    endSymbol: "]]",
  },
});
```

```html
<p>Hello [[ user.name ]]</p>
```
