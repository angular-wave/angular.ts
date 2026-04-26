---
title: "Client-Side Routing"
weight: 420
description: "Navigate between named states, read and modify the URL, manage history, and intercept route transitions."
---

AngularTS has two routing layers. `$location` manages the browser URL and history directly. `$state` works at the application level with named states, parameters, resolves, and transition hooks.

Exact routing API signatures live in TypeDoc:

- [`StateService`](../../../typedoc/classes/StateProvider.html)
- [`StateDeclaration`](../../../typedoc/interfaces/StateDeclaration.html)
- [`TransitionOptions`](../../../typedoc/interfaces/TransitionOptions.html)
- [`Location`](../../../typedoc/classes/Location.html)
- [`LocationProvider`](../../../typedoc/classes/LocationProvider.html)

## Work With The URL

Use `$location` when code needs to inspect or change the raw URL.

```typescript
$location.path();    // "/dashboard"
$location.search();  // { tab: "overview" }
$location.hash();    // "summary"
$location.url();     // "/dashboard?tab=overview#summary"
$location.absUrl();  // "https://app.example.com/dashboard?tab=overview#summary"
```

Setter methods return `$location`, so related URL changes can be chained.

```typescript
$location
  .path("/settings/profile")
  .search({ tab: "security" })
  .hash("billing-section");
```

Changes to `$location` are applied asynchronously. `$locationChangeStart` and `$locationChangeSuccess` are broadcast on `$rootScope` around navigation.

## Configure URL Mode

Configure `$locationProvider` before the application runs.

```typescript
angular.config(($locationProvider: ng.LocationProvider) => {
  $locationProvider.html5Mode({
    enabled: true,
    requireBase: false,
    rewriteLinks: true,
  });

  $locationProvider.hashPrefix("!");
});
```

When `requireBase` is enabled, the application document must include a `<base>` tag.

## Navigate With `$state`

Use `$state.go()` for normal application navigation. It accepts absolute state names, parent-relative names, and sibling-relative names.

```typescript
$state.go("contacts.detail", { id: 42 });

$state.go("^.list");

$state.go(".detail", { id: 42 });

$state.go($state.current, $state.params, { reload: true });
```

`go()` returns a transition promise. Use transition options when you need to control reloads, parameter inheritance, URL updates, or relative navigation.

## Generate Links

Use `$state.href()` when templates or controllers need a URL without starting navigation.

```typescript
const relative = $state.href("contacts.detail", { id: 42 });
const absolute = $state.href(
  "contacts.detail",
  { id: 42 },
  { absolute: true },
);
```

## Check Active States

Use `is()` for exact matches and `includes()` for ancestors or glob patterns.

```typescript
$state.is("contacts.detail");
$state.is("contacts.detail", { id: 42 });

$state.includes("contacts");
$state.includes("*.detail");
```

These helpers are useful for active navigation styling and conditional UI.

## Register States At Runtime

`$stateRegistry` stores state definitions and can register states after bootstrap, which is useful for lazy-loaded feature modules.

```typescript
const detail = $stateRegistry.get("contacts.detail");
const allStates = $stateRegistry.get();

$stateRegistry.register({
  name: "profile",
  url: "/profile",
  component: "profilePage",
});
```

## Handle Navigation Events

Listen on `$rootScope` for URL-level events when you need a broad guard.

```typescript
angular.run(($rootScope, $state, authService) => {
  $rootScope.$on("$locationChangeStart", (event, newUrl) => {
    if (newUrl.includes("/admin") && !authService.isAuthenticated()) {
      event.preventDefault();
      $state.go("login", { returnUrl: newUrl });
    }
  });
});
```

For state-level lifecycle work, prefer transition hooks.

## Example: Programmatic Navigation

```typescript
class OrderController {
  static $inject = ["$state"];

  order!: Order;

  constructor(private $state: ng.StateService) {}

  viewOrder(id: number) {
    this.$state.go("orders.detail", { orderId: id });
  }

  backToList() {
    this.$state.go("^");
  }

  get orderLink(): string | null {
    return this.$state.href("orders.detail", { orderId: this.order.id });
  }
}
```

## Related

- [Routing overview]({{< relref "/docs/routing/overview" >}})
- [Transitions]({{< relref "/docs/routing/transitions" >}})
