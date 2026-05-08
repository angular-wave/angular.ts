---
title: "State-based routing in AngularTS applications"
weight: 340
description: "Learn how AngularTS implements state-based routing with states, views, resolves, transitions, and URL matching configured via $stateProvider."
---
AngularTS ships a full-featured router ported from UI-Router. Unlike simple URL-based routers, it models your application as a **state machine**: each screen or workflow step is a named state, and navigation means transitioning from one state to another. URLs are one way to enter a state, but they are not the primary concept—states are.
## Key concepts

The router is built from five interlocking primitives:

* **States** — named nodes in the application state tree. Each state can have a URL, template, controller, and resolved data.
* **Views** — the rendered output of a state, inserted into a `ng-view` element in the DOM.
* **Resolves** — asynchronous data-fetching functions that run before a state is entered.
* **Transitions** — the lifecycle of moving from one state (or set of states) to another, with hooks you can intercept.
* **URL matching** — an optional layer that maps browser URLs onto states and keeps them in sync.
## How routing integrates with the module system

The router exposes three injectable services that cover the full routing API:

| Token            | Type                    | Purpose                                                                              |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `$state`         | `StateProvider`         | Navigate (`go`, `transitionTo`), inspect current state (`is`, `includes`, `current`) |
| `$transitions`   | `TransitionProvider`    | Register lifecycle hooks (`onBefore`, `onStart`, `onSuccess`, …)                     |
| `$stateRegistry` | `StateRegistryProvider` | Register and deregister state declarations at runtime                                |

All three share a `RouterProvider` globals object that tracks the current `StateObject`, the active `Transition`, and the latest resolved `StateParams`. The `RouterProvider` is injected as `$router` and holds `$router.current`, `$router.transition`, and `$router.params`.
## Setting up the router

### Register your states during config

Call `$stateProvider.state(declaration)` inside an Angular config block, or use
the equivalent module-level `module.state(declaration)` convenience. States must
have a unique `name`.

```javascript
angular.module('app', ['ng.router'])
  .config(function ($stateProvider) {
    $stateProvider
      .state({
        name: 'home',
        url: '/home',
        template: '<h1>Home</h1>'
      })
      .state({
        name: 'contacts',
        url: '/contacts',
        templateUrl: 'contacts.html',
        controller: 'ContactsCtrl'
      })
      .state({
        name: 'contacts.detail',
        url: '/:contactId',
        resolve: {
          contact: function ($transition$, ContactService) {
            return ContactService.get($transition$.params().contactId);
          }
        },
        templateUrl: 'contact-detail.html',
        controller: 'ContactDetailCtrl'
      });
  });
```

The same states can be registered without an explicit config block:

```javascript
angular.module('app', ['ng'])
  .state('home', {
    url: '/home',
    template: '<h1>Home</h1>'
  })
  .state('contacts', {
    url: '/contacts',
    templateUrl: 'contacts.html',
    controller: 'ContactsCtrl'
  });
```

### Add ng-view to your layout

Place `ng-view` where you want the active state's template to render. An unnamed `ng-view` receives the default view.

```html
<!DOCTYPE html>
<html ng-app="app">
  <body>
    <nav>
      <a ng-sref="home" ng-sref-active="active">Home</a>
      <a ng-sref="contacts" ng-sref-active="active">Contacts</a>
    </nav>

    <!-- Active state template renders here -->
    <div ng-view></div>
  </body>
</html>
```

### Navigate between states

Use `$state.go()` in controllers or services to perform programmatic navigation.

```javascript
angular.module('app')
  .controller('ContactsCtrl', function ($state) {
    this.viewContact = function (contactId) {
      $state.go('contacts.detail', { contactId: contactId });
    };
  });
```
## The ng-view directive

`ng-view` is a viewport directive that renders the template and controller for the currently active state. When a transition completes, the view is swapped in. Multiple named views can coexist:

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

The `ng-view` directive emits `$viewContentLoading` before the DOM is rendered and `$viewContentLoaded` after. It also supports `autoscroll` and `onload` attributes.
## Router directives
### ng-sref

`ng-sref` generates an `href` for a state and triggers `$state.go()` on click. The value is a state name optionally followed by a params object:

```html
<a ng-sref="home">Home</a>

<!-- With parameters -->
<a ng-sref="contacts.detail({ contactId: contact.id })">{{ contact.name }}</a>

<!-- Relative navigation -->
<a ng-sref="^">Up to parent</a>
<a ng-sref=".child">Down to child</a>
```

The `ng-sref-opts` attribute passes `TransitionOptions`:

```html
  Dashboard
</a>
```
### ng-sref-active

`ng-sref-active` adds a CSS class when the linked state (or any of its descendants) is active:

```html
<li ng-sref-active="active">
  <a ng-sref="home">Home</a>
</li>

<!-- Multiple class/state mappings -->
<li ng-sref-active="{ 'active': 'contacts', 'exact': 'contacts' }">
  <a ng-sref="contacts">Contacts</a>
</li>
```

`ng-sref-active-eq` works like `ng-sref-active` but only adds the class when the state is an exact match (uses `$state.is()` instead of `$state.includes()`).
### ng-state

`ng-state` is a dynamic alternative to `ng-sref`. The target state name is read from a scope expression rather than being hard-coded in the attribute:

```html
   ng-state-params="vm.stateParams"
   ng-state-opts="{ inherit: false }">
  Dynamic link
</a>
```

This is useful when you build navigation menus driven by data.
## Explore further

#### [States]({{< relref "/docs/routing/states" >}})

Define state hierarchies, configure resolves, and navigate with `$state.go()`.

#### [Transitions]({{< relref "/docs/routing/transitions" >}})

Intercept the transition lifecycle with hooks for auth guards, analytics, and more.

#### [URL matching]({{< relref "/docs/routing/url-matching" >}})

Configure parameterized URLs, typed parameters, hash mode, and base href.

#### [Resolve]({{< relref "/docs/routing/states#resolves" >}})

Fetch data asynchronously before a state is entered, with eager and lazy policies.
