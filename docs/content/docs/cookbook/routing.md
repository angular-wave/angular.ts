---
title: Add application routes
description: Register states, render them in ng-view, and protect private pages
weight: 17
---

## Problem

A client-owned area needs URLs, back-button support, nested views, and route
data. A normal server page is no longer enough for that area.

## Before you start

Use client routing only inside an area the browser must own. The server must
still serve the initial application URL and authentication endpoints.

## Recipe

Register states on the module:

<!-- tested-by: src/router/directives/state-directives.spec.ts, src/router/directives/view-directive.spec.ts, src/router/router.test.ts -->

```js
angular
  .createModule('account', [])
  .router({
    name: 'account',
    url: '/account',
    component: 'accountHome',
  })
  .router({
    name: 'account.orders',
    url: '/orders',
    component: 'orderList',
    policy: {
      navigation: { authenticated: true, redirectTo: 'login' },
    },
  })
  .router({
    name: 'account.order',
    url: '/orders/:id',
    component: 'orderDetail',
    policy: {
      navigation: { authenticated: true, redirectTo: 'login' },
    },
  });
```

Render the active state and create links:

<!-- tested-by: src/router/directives/state-directives.spec.ts, src/router/directives/view-directive.spec.ts, src/router/router.test.ts -->

```html
<nav>
  <a ng-state="'account'">Account</a>
  <a ng-state="'account.orders'">Orders</a>
</nav>

<main ng-view></main>
```

Use `$state.go()` when code initiates navigation:

<!-- tested-by: src/router/directives/state-directives.spec.ts, src/router/directives/view-directive.spec.ts, src/router/router.test.ts -->

```js
$state.go('account.orders');
$state.go('account.order', { id: order.id });
```

[`StateService`](../../../typedoc/types/StateService.html) also provides
`href()` for URL generation and `matches()` for active-state checks.

Keep the first page server-rendered. Add a route only when the browser must own
navigation and state across several related views.

## Failure path

A route that works only after visiting another state is incomplete. Resolve
direct URLs, rejected policy, missing data, and superseded navigation.

## Apply it now

List the URLs in one browser-owned area. Keep pages on the server unless users
need client-side back-button history and state across those URLs. Register the
smallest useful parent and child states, open a child URL directly, refresh it,
and use Back. If any step depends on first visiting another state, the route is
not complete.

## Verify

Open every documented URL directly, refresh it, move through child states, and
use Back and Forward. Confirm private states enforce policy before rendering.
