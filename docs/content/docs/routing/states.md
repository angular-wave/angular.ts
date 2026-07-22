---
title: 'States'
weight: 350
description:
  'Define state hierarchies, resolve data, register states, and navigate with
  $state.'
---

A state represents a place in an AngularTS application: a page, a nested layout,
a modal, or a step in a workflow. States are declared as plain objects and
registered through `module.router()` before bootstrap or `$stateRegistry` at
runtime.

Exact state and router contracts live in TypeDoc:

- [`StateDeclaration`](../../../typedoc/interfaces/StateDeclaration.html)
- [`TransitionOptions`](../../../typedoc/interfaces/TransitionOptions.html)
- [`TransitionPromise`](../../../typedoc/interfaces/TransitionPromise.html)
- [`ParamDeclaration`](../../../typedoc/interfaces/ParamDeclaration.html)
- [`HrefOptions`](../../../typedoc/interfaces/HrefOptions.html)

Route resolves are authored through the `resolve` property on
`StateDeclaration`. The object and array helper containers are internal typing
details and are intentionally not part of the public `ng` namespace.

## Register States

Register most states as one module-owned route tree or forest through
`module.router()`.

```javascript
angular
  .module('demo', [])
  .router({
    name: 'home',
    url: '/home',
    component: 'homePage',
  })
  .router({
    name: 'contacts',
    url: '/contacts',
    templateUrl: 'contacts/list.html',
    controller: 'ContactsListCtrl',
    controllerAs: 'vm',
  });
```

Register states at runtime when a feature is loaded after bootstrap.

```javascript
angular.module('demo').run(["$stateRegistry", ($stateRegistry) => {
  $stateRegistry.register({
    name: 'settings',
    url: '/settings',
    component: 'settingsPage',
  });
}]);
```

Runtime registration requires the parent state to exist first. If the parent is
missing, the state is queued until the parent is registered.

## Nest States

Use dot notation or an explicit `parent` property to create a hierarchy.

```javascript
angular
  .module('demo', [])
  .router({
    name: 'contacts',
    url: '/contacts',
    template: '<div ng-view></div>',
  })
  .router({
    name: 'contacts.list',
    url: '/list',
    templateUrl: 'contacts/list.html',
  })
  .router({
    name: 'contacts.detail',
    url: '/:id',
    templateUrl: 'contacts/detail.html',
  });
```

Child states inherit the parent URL prefix. A transition to `contacts.detail`
with `{ id: 42 }` produces `/contacts/42`.

A parent state must provide a `ng-view` outlet where child views can render.

## Use Abstract States

Abstract states cannot be activated directly. Use them to share a URL prefix,
resolves, metadata, or layout with child states.

```javascript
angular
  .module('demo', [])
  .router({
    name: 'admin',
    url: '/admin',
    abstract: true,
    template: '<admin-layout ng-view></admin-layout>',
    resolve: {
      currentUser: ['AuthService', (AuthService) => AuthService.currentUser()],
    },
    data: { requiresAuth: true },
  })
  .router({
    name: 'admin.dashboard',
    url: '/dashboard',
    component: 'adminDashboard',
  });
```

Navigating to `admin.dashboard` enters both `admin` and `admin.dashboard`.

## Declare Parameters

URL parameters are parsed from path and query segments.

```javascript
angular.module('demo', []).router({
  name: 'product',
  url: '/products/:category?page&sort',
  component: 'productList',
});
```

Non-URL parameters belong in the `params` block.

```javascript
angular.module('demo', []).router({
  name: 'search',
  url: '/search?q',
  params: {
    q: { value: '', squash: true },
    filters: { value: null, type: 'any' },
  },
  component: 'searchPage',
});
```

Use parameter declarations for defaults, typed values, dynamic params, array
params, squashing, inheritance, and raw URL values.

## Resolve Data

Resolves fetch or compute data before a state renders. The router waits for
required resolves before entering the state.

```javascript
angular.module('demo', []).router({
  name: 'contacts.detail',
  url: '/:contactId',
  resolve: {
    contact: [
      '$transition$',
      'ContactService',
      ($transition$, ContactService) =>
        ContactService.get($transition$.params().contactId),
    ],
    contactHistory: [
      'contact',
      'HistoryService',
      (contact, HistoryService) => HistoryService.forContact(contact.id),
    ],
  },
  templateUrl: 'contact-detail.html',
  controller: [
    '$scope',
    'contact',
    'contactHistory',
    function ($scope, contact, contactHistory) {
      $scope.contact = contact;
      $scope.history = contactHistory;
    },
  ],
});
```

Use array-style resolves when you need explicit tokens, dependency metadata, or
resolve policies.

```javascript
resolve: [
  {
    token: 'contact',
    deps: ['$transition$', 'ContactService'],
    resolveFn: ($transition$, ContactService) =>
      ContactService.get($transition$.params().contactId),
    policy: { when: 'EAGER', async: 'WAIT' },
  },
];
```

## Navigate

Use `$state.go()` for normal application navigation. It supports absolute
states, parent-relative states, sibling-relative states, params, and transition
options.

```javascript
$state.go('contacts.detail', { contactId: 42 });

$state.go('^');

$state.go('^.list');

$state.go('.detail', { contactId: 42 });

$state.go('home', {}, { location: 'replace', reload: true });
```

`$state.go()` returns a `TransitionPromise`. When navigation starts immediately,
the active `Transition` is available as `.transition`; lazy route loading may
defer creation of that transition until after the promise has been returned.

## Inspect And Link

Generate links without navigating:

```javascript
const url = $state.href('contacts.detail', { contactId: 42 });
const absUrl = $state.href(
  'contacts.detail',
  { contactId: 42 },
  { absolute: true },
);
```

Check active states:

```javascript
$state.matches('contacts.detail', undefined, { exact: true });
$state.matches('contacts.detail', { contactId: 42 }, { exact: true });

$state.matches('contacts');
$state.matches('contacts.**');
$state.matches('*.detail.*.*');
```

## Route Policies

Prefer `policy.navigation` for auth/authorization and auth-like policy checks.

`policy.transition.canExit` handles transition decisions, while
`policy.transition.dirty` centralizes unsaved-change prompts for state leaves.

```javascript
angular
  .module('editorDemo', [])
  .router({
    name: 'edit',
    url: '/edit',
    template: '<editor></editor>',
    policy: {
      transition: {
        dirty: {
          when: () => true,
          prompt: 'Discard unsaved changes?',
          redirectTo: 'discard',
        },
      },
    },
  })
  .router({
    name: 'confirm',
    url: '/confirm',
    template: "<button data-action='accept'>Accept</button>",
  })
  .router({
    name: 'saved',
    url: '/saved',
    template: "<button data-action='save'>Back</button>",
  })
  .router({
    name: 'discard',
    url: '/discard',
    template: '<p>Discarded</p>',
  })
  .router({
    name: 'list',
    url: '/list',
    template: "<button data-route='edit'>Edit</button>",
    policy: {
      transition: {
        canExit: (context) => !context.to.params.confirmed,
      },
    },
  });
```

In this example, leaving `edit` prompts for unsaved changes and can redirect to
`discard` when declined. `list` uses `canExit` with a transition param to skip
the transition in a confirmation flow.

### Retry and Fallback

Use `retry` to control how the router re-runs transiently failing work before
the transition continues, and use `fallbackTo` to route to a recovery state when
the final attempt fails.

```javascript
angular
  .module('demo', [])
  .router({
    name: 'base',
    url: '/base',
    template: '<p>Base state</p>',
  })
  .router({
    name: 'loading',
    url: '/loading',
    template: '<p>Preparing next state...</p>',
  })
  .router({
    name: 'fallback',
    url: '/fallback',
    template: '<p>Fallback view reached after retries.</p>',
  })
  .router({
    name: 'transient',
    url: '/transient',
    template: '<p>Should eventually load.</p>',
    policy: {
      transition: {
        loading: 'loading',
        retry: (ctx) => ctx.attempt < 2,
        fallbackTo: 'fallback',
      },
    },
    resolve: {
      payload: () => {
        const attempt = (window.routingRetryAttemptCount || 0) + 1;

        window.routingRetryAttemptCount = attempt;

        if (attempt < 3) {
          return Promise.reject(new Error('temporary failure'));
        }

        return 'ready';
      },
    },
  })
  .router({
    name: 'stable',
    url: '/stable',
    template:
      '<p>Permanent view loaded with resolve payload {{$resolve.payload}}.</p>',
    policy: {
      transition: {
        retry: 1,
        fallbackTo: { state: 'fallback' },
      },
    },
    resolve: {
      payload: () => Promise.reject(new Error('permanent failure')),
    },
  });
```

`transient` retries its resolve up to two times (`attempt` is 0-based in the
context), then enters the target only if it eventually resolves. `stable` shows
fallback policy using a static and object target form.

When policy-driven boundaries are declarative, transitions do not require manual
`$transitions.onBefore/onStart/onError` handlers for common retry/fallback
behavior.

Use `$router` config when most routes should share the same transition policy:

```javascript
angular.module('demo', []).config({
  $router: {
    loading: 'loading',
    retry: 2,
    fallbackTo: 'fallback',
    error: 'error',
    viewTransitions: true,
  },
});
```

Route-level `policy.transition` values override these router-wide defaults for
that route subtree. Set `loading: false` or `retry: false` on a route when that
route should opt out of the default behavior.

Route-level loading/error decisions can be expressed in `policy.transition` too.
`error` is the preferred short name for the boundary used on recoverable
transition failure, while `errorBoundary` remains supported for compatibility.

```javascript
angular
  .module('editorDemo', [])
  .router({
    name: 'profile',
    url: '/profile',
    template: '<profile/>',
    policy: {
      transition: {
        loading: true,
        error: 'error',
      },
    },
  })
  .router({
    name: 'error',
    url: '/error',
    template: '<p>Unable to load this state.</p>',
  });
```

`loading` is an executable decision point that currently accepts a boolean, a
state target, or an injectable policy.

Loading and error boundaries are UX-level transition concerns. They are
evaluated after the inherited security decision is made, so
authentication/authorization still happens in `$security` and route policy
decides what loading/error flow the app shows on the router side.

### Retention

Use `policy.retention` for route branches that should deactivate while inactive
instead of losing DOM, scope, and component state on every navigation.

```javascript
angular.module('retentionDemo', []).router({
  name: 'workspace',
  abstract: true,
  template: '<section><ng-view></ng-view></section>',
  policy: {
    retention: {
      mode: 'keep-alive',
      max: 2,
      pause: 'schedulers',
      evict: 'lru',
    },
  },
  children: [
    {
      name: 'tabA',
      template:
        '<button ng-click="count = count + 1">Tab A: {{count}}</button>',
      controller: ['$scope', function ($scope) {
        $scope.count = 0;
      }],
    },
    {
      name: 'tabB',
      template:
        '<button ng-click="count = count + 1">Tab B: {{count}}</button>',
      controller: ['$scope', function ($scope) {
        $scope.count = 0;
      }],
    },
    {
      name: 'tabC',
      template:
        '<button ng-click="count = count + 1">Tab C: {{count}}</button>',
      controller: ['$scope', function ($scope) {
        $scope.count = 0;
      }],
    },
  ],
});
```

In this branch, `workspace.tabA`, `workspace.tabB`, and `workspace.tabC` inherit
the same retention policy. Leaving a tab deactivates its route tree. Returning
to the same retained key reactivates it with the previous scope and DOM state.
Because `max` is `2`, entering a third distinct retained tab evicts one cached
entry and destroys its retained scope.

Use `$router.retention` when the entire application or module should share a
default retention policy:

```javascript
angular.module('workspaceApp', []).config({
  $router: {
    retention: {
      mode: 'keep-alive',
      max: 5,
      pause: 'schedulers',
      evict: 'lru',
    },
  },
});
```

Route-level `policy.retention` overrides the router-wide default for that route
subtree. A route can opt out by declaring `policy.retention.mode = 'destroy'`.

Retention keys default to state name plus route/query params. Use a string `key`
to share a retained instance across params, or an injectable key policy when the
cache identity needs app-specific route context.

`pause: "schedulers"` tells retained route scopes to pause scheduler-bound work
while inactive and resume it on reactivation. App-owned model schedulers remain
app-context owned; retention applies to route/root-owned work.

Reload the current state or an ancestor subtree through `go()`:

```javascript
$state.go($state.current, $state.params, { reload: true, inherit: false });
$state.go($state.current, $state.params, {
  reload: 'contacts',
  inherit: false,
});
```

Executable examples:

- [Route policy auth and inheritance sample](/examples/routing-policy/policy.html)
- [Route retry and fallback sample](/examples/routing-policy/retry-fallback.html)
- [Route retention sample](/examples/routing-policy/retention.html)

## Related

- [Routing overview]({{< relref "/docs/routing/overview" >}})
- [Route maps]({{< relref "/docs/routing/route-maps" >}})
- [Transitions]({{< relref "/docs/routing/transitions" >}})
- [URL matching]({{< relref "/docs/routing/url-matching" >}})
