# Anchor Scroll Service

`$anchorScroll` is the browser-root scrolling primitive. It resolves hashes to
elements, applies an optional vertical offset, and can react automatically to
successful location changes.

## Public Surface

- `AnchorScrollService`: callable injected service for explicit scrolling.
- `AnchorScrollConfig`: typed `NgModule.config({ $anchorScroll: ... })` policy.

```ts
const app = angular.module("app", ["ng"]);

app.config({
  $anchorScroll: {
    autoScrolling: false,
  },
});

app.controller("PageController", [
  "$anchorScroll",
  ($anchorScroll) => {
    $anchorScroll("details");
  },
]);
```

## Core Model

Calling `$anchorScroll()` uses the current location hash. A string or number
selects an element by ID and then the first named anchor. Passing an element
scrolls to it directly. An empty hash or `"top"` scrolls to the document top.

`$anchorScroll.yOffset` accepts a number, a function returning a number, or a
fixed element whose bottom edge defines the offset.

## Lifecycle Contract

- Each root scope owns its location-change subscription.
- Destroying that root removes the subscription and pending window-load work.
- Destroying runtime composition releases every remaining anchor-scroll
  instance.
- Explicit calls remain available when automatic scrolling is disabled.

## Reactivity Contract

Automatic scrolling listens for `$locationChangeSuccess` on the root scope.
The service schedules scrolling after the current stack when the document is
ready, or after the window load event otherwise. It does not create watchers or
own application model state.

## Policy Contract

`autoScrolling` defaults to `true`. Configure it through typed module config;
there is no public anchor-scroll provider. Disabling the policy prevents
location changes from initiating scrolling without disabling explicit service
calls.

## Composition Contract

The full browser runtime constructs `$anchorScroll` lazily from `$location`,
`$rootScope`, `$document`, and `$window`. Runtime composition owns its policy
state and teardown. Custom runtimes omit it unless they include an equivalent
browser service registration.

## Test Harness

- `anchor-scroll.spec.ts` covers configuration, construction, scrolling,
  offsets, root ownership, and teardown.
- `anchor-scroll.test.ts` runs the browser behavior and documentation example
  through Playwright.
