---
title: "Client-side routing with $state and $location"
weight: 420
description: "Navigate between named states, read and modify the URL, manage history, and intercept route transitions using $state, $location, and related services."
---
AngularTS ships two routing layers: `$location` manages the raw browser URL and history, while `$state` operates at the level of named application states — hierarchical route definitions with parameter binding, resolvers, and lifecycle hooks. Most application code only needs `$state`; `$location` is useful when you need direct URL manipulation outside the router.
## `$location`

The `$location` service reflects the current browser URL as a parsed, mutable object. Changes to `$location` update the browser URL, and browser navigation events update `$location`. HTML5 History API (`pushState`) is enabled by default.
### Reading the current URL

```typescript

$location.path();    // "/dashboard"
$location.search();  // { tab: "overview" }
$location.hash();    // "summary"
$location.url();     // "/dashboard?tab=overview#summary"
$location.absUrl();  // "https://app.example.com/dashboard?tab=overview#summary"
```
### Changing the URL

All setter methods return `$location` itself so they can be chained.

```typescript
$location.path("/settings/profile");

// Update query parameters — merges with existing params
$location.search({ tab: "security" });

// Set a single query param (other params are preserved)
$location.search("tab", "security");

// Remove a query param
$location.search("tab", null);

// Set hash fragment
$location.hash("billing-section");

// Set path, search, and hash in one call
$location.url("/settings?tab=billing#payment");
```

> **Note:** Changes to `$location` take effect asynchronously. The browser URL is updated on the next microtask tick via `$location._updateBrowser()`. The `$locationChangeStart` and `$locationChangeSuccess` events are broadcast on `$rootScope` around each navigation.
### History state

In HTML5 mode, you can attach arbitrary state to a history entry:

```typescript

// Retrieve it later (e.g., after a popstate event)
const state = $location.state(); // { orderId: "abc-123" }
```
### `$locationProvider` configuration

Configure `$location` behavior before the application runs:

```typescript
  // HTML5 mode is enabled by default. Disable to use hash-bang URLs.
  $locationProvider.html5Mode({
    enabled: true,
    requireBase: false,   // don't require a <base> tag
    rewriteLinks: true,   // rewrite <a href> clicks to use pushState
  });

  // Hash prefix for hash-bang mode (default: "!")
  $locationProvider.hashPrefix("!");
});
```

> **Warning:** When `requireBase: true` (the default), a `<base href="/">` element must exist in your HTML. If it is missing, `$location` throws an error at bootstrap.
### URL change events

Listen for navigation events on `$rootScope`:

```typescript
  if (!authService.isLoggedIn()) {
    event.preventDefault(); // block the navigation
    $location.path("/login");
  }
});

$rootScope.$on("$locationChangeSuccess", (event, newUrl, oldUrl) => {
  analytics.track("page_view", { url: newUrl });
});
```
## `$state`

`$state` is the high-level routing service. It manages transitions between named, hierarchical states.
### Navigating to a state

`$state.go()` is the primary navigation method. It accepts absolute state names, parent-relative names (`.child`), and sibling-relative names (`^.sibling`).

```typescript
$state.go("contacts.detail", { id: 42 });

// Navigate to a sibling state (relative to current)
$state.go("^.list");

// Navigate to a child state
$state.go(".detail", { id: 42 });

// Reload the current state (re-run resolvers)
$state.go($state.current, $state.params, { reload: true });
```

`go()` returns a `TransitionPromise` — a promise that resolves when the transition completes, with the `Transition` object attached as `.transition`.
#### `Parameter`

- **Type:** `string | StateDeclaration | StateObject`
- **Required:** yes

Absolute state name, state object, or a relative name (using `.` and `^` notation).
#### `Parameter`

- **Type:** `Record<string, any>`

Parameter values for the target state. Unspecified params inherit from the current state (because `go()` defaults to `{ inherit: true }`).
#### `Parameter`

- **Type:** `TransitionOptions`

Override transition behavior. Common options: `reload: true` to force resolver re-execution; `inherit: false` to prevent param inheritance; `location: false` to skip URL update.
### Generating URLs

`$state.href()` returns the URL for a state without navigating to it — useful for building `href` attributes in templates.

```typescript
// returns "/contacts/42" (or "#/contacts/42" in hash mode)

$state.href("contacts.detail", { id: 42 }, { absolute: true });
// returns "https://app.example.com/contacts/42"
```
### Checking the current state

```typescript
// The current StateDeclaration — { name: "contacts.detail", url: "/contacts/:id", ... }

$state.params;
// The active parameter values — { id: "42" }

// Exact state match
$state.is("contacts.detail");            // true
$state.is("contacts.detail", { id: 42 }); // true (params match)
$state.is("contacts.list");              // false

// Ancestor/glob match
$state.includes("contacts");             // true (any contacts.* state)
$state.includes("*.detail");             // true (glob syntax)
$state.includes("contacts.detail");      // true
$state.includes("contacts.list");        // false
```
### Low-level `transitionTo`

`$state.go()` calls `transitionTo` internally with sensible defaults. Use `transitionTo` directly when you need explicit control:

```typescript
  reload: true,
  inherit: false,
  notify: false,  // suppress lifecycle events
});
```
### Reloading

```typescript
$state.reload();

// Reload only a specific ancestor (and its descendants)
$state.reload("contacts");
```
### Handling invalid states

Register a callback for navigation to states that don't exist:

```typescript
  const loader = injector.get("LazyLoader");
  return loader.load(toState.name()).then(() => $state.target(toState.name()));
});
```
## `$stateRegistry`

The state registry stores all state definitions and provides lookup methods.

```typescript
const detail = $stateRegistry.get("contacts.detail");

// Get all registered states
const allStates = $stateRegistry.get();

// Register a new state at runtime
$stateRegistry.register({
  name: "profile",
  url: "/profile",
  component: "profilePage",
});
```
## `$url` service

The `$url` service provides lower-level URL manipulation that is router-aware — changes through `$url` update the URL in a way that the router can react to.

```typescript
$url.search();            // current query params
$url.hash();              // current fragment
$url.url("/new-path");    // update URL and trigger routing
$url.listen((url) => {    // subscribe to URL changes
  console.log("URL changed to:", url);
});
```
## Practical examples

### Programmatic navigation

```typescript
class OrderController {
  static $inject = ["$state"];
  constructor(private $state: ng.StateService) {}

  viewOrder(id: number) {
    this.$state.go("orders.detail", { orderId: id });
  }

  backToList() {
    this.$state.go("^"); // navigate to parent state
  }

  get orderLink(): string {
    return this.$state.href("orders.detail", { orderId: this.order.id });
  }
}
```

### Navigation guard

```typescript
angular.run(($rootScope, $state, authService) => {
  $rootScope.$on("$locationChangeStart", (event, newUrl) => {
    const requiresAuth = newUrl.includes("/admin");
    if (requiresAuth && !authService.isAuthenticated()) {
      event.preventDefault();
      $state.go("login", { returnUrl: newUrl });
    }
  });
});
```

### Breadcrumbs from state

```typescript
class BreadcrumbController {
  static $inject = ["$state"];
  crumbs: Array<{ label: string; href: string }> = [];

  constructor(private $state: ng.StateService) {
    const current = $state.current;
    // Build breadcrumbs by walking the includes map
    const stateChain = Object.keys(current?.includes ?? {}).filter(Boolean);
    this.crumbs = stateChain.map((name) => ({
      label: name.split(".").pop() ?? name,
      href: $state.href(name),
    }));
  }
}
```

#### [Routing overview]({{< relref "/docs/routing/overview" >}})

State declarations, nested states, and URL patterns.

#### [Transitions]({{< relref "/docs/routing/transitions" >}})

Lifecycle hooks: `onBefore`, `onStart`, `onSuccess`, `onError`.
