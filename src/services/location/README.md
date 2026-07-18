# Location Internals

This directory owns browser URL normalization, history synchronization, and
application link rewriting. `location.ts` separates the public `Location`
service from runtime-owned browser state and typed `LocationConfig` policy.

## Responsibilities

- Parse and compose path, query, hash, and History API state.
- Synchronize `$location` changes with `window.location` and `window.history`.
- Rewrite eligible application links according to location policy.
- Remove root click and browser navigation listeners during teardown.

## Public Surface

- `Location`: the injectable `$location` service contract.
- `LocationConfig`: typed configuration accepted by
  `module.config({ $location: ... })`.
- `Html5Mode`: HTML5 mode, base-tag, and link-rewriting policy.
- `UrlChangeListener`: callback shape for browser URL changes.

Applications configure URL behavior without injecting a provider:

```ts
app.config({
  $location: {
    html5Mode: {
      enabled: true,
      requireBase: false,
      rewriteLinks: true,
    },
    hashPrefix: "!",
  },
});
```

## Core Model

`LocationRuntimeState` is internal composition state. It owns normalized
configuration, cached browser history state, native listeners, and lazy service
construction. The same stable configuration object is passed to router
composition, so `$location` parsing and router href generation cannot diverge.

The main flow is:

1. Browser composition creates location runtime state and registers typed
   configuration.
2. Module configuration mutates the normalized policy before service creation.
3. Injecting `$location` creates the service and connects root/browser events.
4. Runtime or root destruction removes every owned listener.

## Lifecycle Contract

- Creating runtime state reads the current browser URL and history state.
- Injecting `$location` installs root click, `popstate`, and `hashchange`
  integration lazily.
- Root destruction disconnects service listeners for that application root.
- Runtime destruction disposes remaining listeners and rejects later setup or
  configuration.

## Reactivity Contract

- Browser navigation broadcasts `$locationChangeStart` and
  `$locationChangeSuccess` through the root scope.
- Application URL writes are scheduled and then reflected into browser history.
- Router synchronization consumes the same `$location` service state.

## Policy Contract

- HTML5 mode defaults to enabled without requiring a `<base>` element.
- Link rewriting defaults to enabled and may be disabled or restricted to a
  named attribute.
- Hashbang URLs default to the `!` prefix.
- Policy is applied during module configuration and is fixed before lazy
  `$location` construction.

## Composition Contract

- Browser runtime composition owns native history and listener state.
- Router composition receives only `LocationConfig`; it does not know how the
  service or browser listeners are constructed.
- `$location` remains independently usable in applications without a router.

## Failure Contract

- Requiring a missing `<base>` element throws during service construction.
- Failed History API writes restore the previous service state and report the
  failure through `$exceptionHandler`.
- Configuration or service creation after runtime disposal throws a stable
  lifecycle error.

## Scheduling And Ordering

- Browser `popstate` and `hashchange` processing enters through a microtask.
- Application-driven browser updates are deferred until the current state
  mutation completes.
- `$locationChangeStart` may cancel a change before it is committed.

## Native Interop

The native boundary is `window.location`, `window.history`, root `click`,
`popstate`, and `hashchange`. Applications needing direct browser operations may
still use those APIs, but must coordinate resulting navigation with `$location`.

## Test Harness

- `location.spec.ts` covers URL parsing, configuration, browser history,
  listener lifecycle, and service behavior.
- Router specs cover hash/HTML5 href generation from shared location policy.
- `location.test.ts` runs the browser suite through Playwright.
