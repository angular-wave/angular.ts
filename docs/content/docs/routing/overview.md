---
title: 'State-based routing in AngularTS applications'
linkTitle: 'Routing'
weight: 340
description:
  'Learn how AngularTS implements state-based routing with states, views,
  resolves, transitions, and URL matching configured through module
  declarations.'
---

AngularTS ships a full-featured router ported from UI-Router. Unlike simple
URL-based routers, it models your application as a **state machine**: each
screen or workflow step is a named state, and navigation means transitioning
from one state to another. URLs are a way to enter a state, not the primary
concept.

Router naming, inference, and public-type placement follow the
[shared API ergonomics contract](../../../../src/DESIGN_PHILOSOPHY.md#api-ergonomics-contract).
Throughout the router documentation, a **router state** is one named navigation
node. A **route tree** is the module-owned hierarchy made from router states.
Machine and workflow states are execution modes and are not router states.

## Key concepts

The router is built from five interlocking primitives:

- **States** — named nodes in the application state tree. Each state can have a
  URL, template, component, and resolved data.
- **Views** — the rendered output of a state, inserted into a `ng-view` element
  in the DOM.
- **Resolves** — asynchronous data-fetching functions that run before a state is
  entered.
- **Transitions** — the lifecycle of moving between states with hooks you can
  intercept.
- **URL matching** — an optional layer that maps browser URLs onto states and
  keeps them in sync.

## How routing integrates with the module system

The router exposes these injectable services:

| Token            | Type                 | Purpose                                                                              |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `$state`         | `StateService`  | Navigate (`go`), inspect current state (`is`, `includes`, `current`) |
| `$transitions`   | `TransitionsService` | Register lifecycle hooks (`onBefore`, `onStart`, `onSuccess`, …)                     |
| `$stateRegistry` | Advanced registry    | Register and deregister state declarations at runtime                                |

For ordinary app authoring, `$state` is usually sufficient. `$transitions` and
`$stateRegistry` are classified as **advanced runtime APIs** for policy wiring,
late-bound navigation policies, and runtime diagnostics.

## Setting up the router

### Register your states

Call `module.router(declaration)` with a route tree or forest. Every route must
have a unique name.

```javascript
angular
  .module('app', ['ng.router'])
  .router({
    name: 'home',
    url: '/home',
    template: '<h1>Home</h1>',
  })
  .router({
    name: 'contacts',
    url: '/contacts',
    templateUrl: 'contacts.html',
    controller: 'ContactsCtrl',
  })
  .router({
    name: 'contacts.detail',
    url: '/:contactId',
    resolve: {
      contact: ['$transition$', 'ContactService', function ($transition$, ContactService) {
        return ContactService.get($transition$.params().contactId);
      }],
    },
    templateUrl: 'contact-detail.html',
    controller: 'ContactDetailCtrl',
  });
```

### Add ng-view to your layout

Place `ng-view` where you want the active state's template to render. An unnamed
`ng-view` receives the default view.

```html
<!DOCTYPE html>
<html ng-app="app">
  <body>
    <nav>
      <a ng-state="'home'" data-state-active="active">Home</a>
      <a ng-state="'contacts'" data-state-active>Contacts</a>
    </nav>

    <!-- Active state template renders here -->
    <div ng-view></div>
  </body>
</html>
```

### Navigate between states

Use `$state.go()` in controllers or services to perform programmatic navigation.

```javascript
angular.module('app').controller('ContactsCtrl', ["$state", function ($state) {
  this.viewContact = function (contactId) {
    $state.go('contacts.detail', { contactId: contactId });
  };
}]);
```

## The ng-view directive

`ng-view` is a viewport directive that renders the template and controller for
the currently active state. When a transition completes, the view is swapped in.
Multiple named views can coexist:

```html
<div ng-view></div>

<!-- Named views -->
<div ng-view="header"></div>
<div ng-view="content"></div>
<div ng-view="sidebar"></div>
```

A state targets named views through its `views` property:

```javascript
  name: 'dashboard',
  views: {
    'header': { template: '<app-header></app-header>' },
    'content': { templateUrl: 'dashboard.html', controller: 'DashboardCtrl' },
    'sidebar': { component: 'DashboardSidebar' }
  }
});
```

The `ng-view` directive emits `$viewContentLoading` before the DOM is rendered
and `$viewContentLoaded` after. It also supports `autoscroll` and `onload`
attributes.

Router-wide scroll and focus behavior belongs in typed module config. This keeps
accessibility and scroll restoration consistent across the whole route tree
without repeating settings on every route:

```javascript
angular.module('demo', []).config({
  $router: {
    scroll: { top: 0 },
    focus: '[data-route-focus]',
  },
});
```

Use `scroll: true` or `scroll: "top"` to reset to the top after every successful
navigation, `scroll: "preserve"` to leave the current position alone, or
`scroll: { selector: "#content" }` to scroll a specific element into view. Use
`focus: true` for the default focus target (`[autofocus]`,
`[data-router-focus]`, `main`, then `h1`), a selector string, or
`{ selector, preventScroll }` for explicit focus behavior.

Executable sample: [`scroll-focus.html`](/examples/routing/scroll-focus.html)

When `$router.viewTransitions` is not disabled and the browser exposes
`document.startViewTransition()`, connected routed views commit inside the View
Transitions API so CSS can animate the outgoing and incoming route content as
one navigation. Detached, ignored, redirected, loading-resume, or explicitly
disabled transitions keep the normal synchronous view commit path.

Executable demo:
[`router-view-transition-test.html`](/src/router/router-view-transition-test.html)

## Router directives

### ng-state

`ng-state` is the router link primitive.

```html
<a
  ng-state="'contacts.detail'"
  ng-state-params="{ contactId: contact.id }"
  data-state-active
>
  Contact {{ contact.name }}
</a>

<a
  ng-state="'users.edit'"
  ng-state-params="{ id: user.id }"
  ng-state-opts="{ inherit: false, reload: true }"
  data-state-active
  data-state-exact
>
  Edit user
</a>
```

### Active link modifiers

- `data-state-active`: track active state (and descendant states).
- `data-state-exact`: switch to exact-match behavior.

`data-state-active="activeClass"` supports both direct and object-based usage in
scoped contexts through inherited route context.

`ng-state` manages `data-state-current="true|false"` so CSS and scripts can read
current-link state directly.

## Explore further

#### [States]({{< relref "/docs/routing/states" >}})

Define state hierarchies, configure resolves, and navigate with `$state.go()`.

#### [Transitions]({{< relref "/docs/routing/transitions" >}})

Intercept the transition lifecycle with hooks for auth guards, analytics, and
more.

#### [URL matching]({{< relref "/docs/routing/url-matching" >}})

Configure parameterized URLs, typed parameters, hash mode, and base href.

#### [Resolve]({{< relref "/docs/routing/states#resolves" >}})

Fetch data asynchronously before a state is entered, with eager and lazy
policies.
