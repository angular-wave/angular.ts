# ARIA Service And Directives

`$aria` coordinates the accessibility defaults AngularTS authors on behalf of
framework directives and router links. It preserves explicit application ARIA,
role, and tabindex attributes.

## Public Surface

- `AriaConfig`: typed application-wide accessibility behavior configuration.
- `AriaService`: injectable configuration reader used by framework integration
  and advanced directives.
- `ng-aria-disable`: local opt-out for framework-authored ARIA behavior.

```ts
const app = angular.module("app", ["ng"]);

app.config({
  $aria: {
    ariaCurrent: true,
    ariaCurrentToken: "page",
    bindKeydown: true,
    diagnostics: false,
  },
});
```

## Core Model

One runtime-owned configuration object supplies every `$aria` service in an
application. Each injector receives its own service instance and diagnostics
collection, preventing separate roots from mixing diagnostic history.

ARIA directives consult the service before adding attributes, roles, keyboard
activation, or tabindex. Authored values always take precedence.

## Lifecycle Contract

- Runtime composition owns ARIA configuration and invalidates construction on
  teardown.
- Injector-local services own their diagnostic history.
- Scope-owned watchers and mutation observers disconnect when their scope is
  destroyed.
- `ng-aria-disable` prevents local framework ARIA watchers and mutations.

## Reactivity Contract

ARIA mirror directives react to the same scope expressions as `ng-show`,
`ng-hide`, validation, disabled, readonly, checked, and model state. Router
links read the same configuration for role, keyboard, tabindex, and
`aria-current` behavior.

## Policy Contract

Use `app.config({ $aria: ... })` to configure framework-authored accessibility
behavior. There is no injectable ARIA provider. Diagnostics are opt-in and warn
about positive tabindex, missing names or references, and interactive elements
hidden from the accessibility tree.

This support does not itself guarantee WCAG conformance; applications remain
responsible for semantics, content, focus order, contrast, and testing.

## Standards Contract

The attribute vocabulary follows current WAI-ARIA states and properties. The
public configuration is limited to behavior AngularTS actively manages;
arbitrary ARIA attributes remain native HTML.

## Test Harness

- `aria.spec.ts` covers runtime composition, configuration, directives,
  diagnostics, router-facing behavior, watchers, and observer cleanup.
- `aria.test.ts` runs the browser suite through Playwright.
