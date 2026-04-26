---
title: "Defining and navigating application states"
weight: 350
description: "Learn how to declare states, build nested state hierarchies, resolve data before entering a state, and navigate programmatically with $state."
---
A state in AngularTS represents a discrete place in the application—a page, a modal, a step in a wizard. States are declared as plain objects and registered at config time via `$stateProvider.state()` or at any point via `$stateRegistry.register()`. Each state has a unique `name`, an optional `url`, template or component, controller, and resolve data.
## State definition structure

A `StateDeclaration` object configures every aspect of a state:
#### `Parameter`

- **Type:** `string`
- **Required:** yes

The unique state name. Use dot notation to declare parent-child relationships: `"contacts.detail"` is a child of `"contacts"`.
#### `Parameter`

- **Type:** `string`

A URL fragment appended to the parent state's URL. Supports named path parameters (`:id`), regex-constrained parameters (`{id:[0-9]+}`), typed parameters (`{id:int}`), and query parameters (`?q&page`).
#### `Parameter`

- **Type:** `string | Function`

Inline HTML template string, or a function that receives transition params and returns a string.
#### `Parameter`

- **Type:** `string | Function`

Path to an external template file, or a function that receives transition params and returns a path.
#### `Parameter`

- **Type:** `string`

Name of an Angular 1.5+ component. Resolve data is bound directly to component inputs. Cannot be combined with `template`, `templateUrl`, or `controller`.
#### `Parameter`

- **Type:** `string | Function | Injectable`

Controller function or registered controller name. Accepts Angular DI annotation arrays for minification safety.
#### `Parameter`

- **Type:** `string`

Alias for the controller instance on the scope.
#### `Parameter`

- **Type:** `object | array`

Data dependencies to fetch before the state is entered. See [Resolves](#resolves) below.
#### `Parameter`

- **Type:** `object`

Per-parameter configuration. Each key is a parameter name; the value is a `ParamDeclaration` with `value` (default), `type`, `array`, `squash`, `dynamic`, `raw`, and `inherit` options.
#### `Parameter`

- **Type:** `object`

Named view declarations keyed by view name. Use `@` notation to target views from ancestor states: `"header@app"`.
#### `Parameter`

- **Type:** `boolean`

If `true`, this state cannot be directly activated. Use abstract states to share URLs, resolves, or templates with child states.
#### `Parameter`

- **Type:** `string | StateDeclaration`

Explicitly set a parent state. Allows short state names without dots. `parent: 'contacts'` is equivalent to naming the state `'contacts.detail'`.
#### `Parameter`

- **Type:** `any`

Arbitrary metadata attached to the state. Child states prototypally inherit from their parent's `data` object. Commonly used for `requiresAuth` flags.
#### `Parameter`

- **Type:** `string | object | TargetState | Function`

Automatically redirect transitions that target this state. Can be a state name string, an object with `state` and `params`, a `TargetState`, or a function (optionally async) that returns one of those.
#### `Parameter`

- **Type:** `Function | Injectable`

Hook called when the state is being entered. Receives `$transition$` and `$state$` as injectable tokens.
#### `Parameter`

- **Type:** `Function | Injectable`

Hook called when the state is retained (neither entered nor exited) during a transition.
#### `Parameter`

- **Type:** `Function | Injectable`

Hook called when the state is being exited.
#### `Parameter`

- **Type:** `Function`

A function called before the state is entered for the first time. Returns a promise. Used to code-split state definitions and their dependencies.
#### `Parameter`

- **Type:** `boolean`

When `true`, all parameters on the state default to `dynamic: true`. Parameter changes do not cause the state to exit and re-enter—components can react to the new param values without a full re-render.
## Registering states
### At config time

Use `$stateProvider.state()` inside an Angular config block. Calls are chainable:

```javascript
  .config(function ($stateProvider) {
    $stateProvider
      .state({
        name: 'home',
        url: '/home',
        template: '<home-page></home-page>'
      })
      .state({
        name: 'contacts',
        url: '/contacts',
        templateUrl: 'contacts/list.html',
        controller: 'ContactsListCtrl',
        controllerAs: 'vm'
      });
  });
```
### At runtime

`$stateRegistry.register()` accepts the same declaration object and can be called after the application has bootstrapped. A state can only be registered if its parent is already registered—otherwise it is queued until the parent appears.

```javascript
  .run(function ($stateRegistry) {
    $stateRegistry.register({
      name: 'settings',
      url: '/settings',
      component: 'SettingsPage'
    });
  });
```

To remove a state (and all its children) from the registry:

```javascript
```
## Nested states

Parent-child relationships are expressed either through dot notation in the `name` or via an explicit `parent` property.

```javascript
$stateProvider
  .state({ name: 'contacts', url: '/contacts', template: '<div ng-view></div>' })
  .state({ name: 'contacts.list', url: '/list', templateUrl: 'contacts/list.html' })
  .state({ name: 'contacts.detail', url: '/:id', templateUrl: 'contacts/detail.html' });
```

```javascript
$stateProvider
  .state({ name: 'contacts', url: '/contacts', template: '<div ng-view></div>' })
  .state({ name: 'list',   url: '/list', parent: 'contacts', templateUrl: 'contacts/list.html' })
  .state({ name: 'detail', url: '/:id',  parent: 'contacts', templateUrl: 'contacts/detail.html' });
```

Child states inherit the parent URL prefix. A transition to `contacts.detail` with `{ id: 42 }` produces `/contacts/42`. The parent state's `ng-view` is filled with the child's template; the root `ng-view` is filled with the parent's template.

> **Note:** A parent state must declare a `ng-view` outlet in its template for child states to render into. Without it, child templates are discarded silently.
## Abstract states

An abstract state is a structural node that cannot be navigated to directly. It is used to:

* Share a common URL prefix with child states
* Run resolves that all children depend on
* Provide a shared layout template with a `ng-view` for children

```javascript
  .state({
    name: 'admin',
    url: '/admin',
    abstract: true,
    template: '<admin-layout ng-view></admin-layout>',
    resolve: {
      currentUser: function (AuthService) { return AuthService.currentUser(); }
    },
    data: { requiresAuth: true }
  })
  .state({ name: 'admin.dashboard', url: '/dashboard', component: 'AdminDashboard' })
  .state({ name: 'admin.users',     url: '/users',     component: 'AdminUsers' });
```

Navigating to `'admin.dashboard'` enters both `admin` and `admin.dashboard`. The `currentUser` resolve runs once and is available to both states.
## State parameters
### URL parameters

Parameters declared in the `url` are parsed from the path or query string:

```javascript
  name: 'product',
  // :category is a path param; page and sort are query params
  url: '/products/:category?page&sort',
  component: 'ProductList'
});
```
### Non-URL parameters

Parameters can exist outside the URL. Declare them in the `params` block with a default value:

```javascript
  name: 'search',
  url: '/search?q',
  params: {
    // URL param with a default value (squashed from URL when default)
    q: { value: '', squash: true },
    // Non-URL param: never appears in the address bar
    filters: { value: null, type: 'any' }
  },
  component: 'SearchPage'
});
```
### Parameter declarations

```javascript
  userId: {
    type: 'int',        // parse as integer
    value: 0,           // default value (makes param optional)
    squash: true,       // omit from URL when value equals default
    dynamic: true,      // param changes don't cause state re-entry
    array: false,       // single value (set true for multi-value)
    inherit: true,      // inherited from current params on $state.go
    raw: false          // don't URL-encode the value
  }
}
```
## Navigating with \$state
### \$state.go()

The primary navigation method. Automatically sets `location: true`, `inherit: true`, and uses the current state as the `relative` base, so relative state names (`'^'`, `'.child'`) work without extra options.

```javascript
$state.go('contacts.detail', { contactId: 42 });

// Relative: go to parent
$state.go('^');

// Relative: go to sibling
$state.go('^.list');

// Relative: go to child
$state.go('.detail', { contactId: 42 });

// With transition options
$state.go('home', {}, { location: 'replace', reload: true });
```

`$state.go()` returns a `TransitionPromise`—a `Promise<StateObject>` that also carries a `.transition` property pointing to the active `Transition` object.
### \$state.transitionTo()

The lower-level method that `go()` delegates to. Use it when you need full control over options:

```javascript
  location: true,
  inherit: false,
  reload: false,
  supercede: true  // cancel any in-progress transition
});
```
### \$state.reload()

Force the current state (and all its children) to re-enter. All resolves are re-fetched and views are re-rendered:

```javascript
$state.reload();

// Reload from 'contacts' down (ancestors are retained)
$state.reload('contacts');
```
### \$state.href()

Generate the URL string for a state without navigating:

```javascript
var url = $state.href('contacts.detail', { contactId: 42 });

// Returns an absolute URL: "http://example.com/contacts/42"
var absUrl = $state.href('contacts.detail', { contactId: 42 }, { absolute: true });
```
### $state.is() and $state.includes()

Check the current state:

```javascript
$state.is('contacts.detail');                            // true/false
$state.is('contacts.detail', { contactId: 42 });         // also checks params

// Ancestry match (true if current state is the state or a descendant)
$state.includes('contacts');                             // true when in any contacts.* state
$state.includes('contacts.**');                          // glob pattern
$state.includes('*.detail.*.*');                         // wildcards
```
### $state.current and $state.params

```javascript
console.log($state.current.name);    // "contacts.detail"
console.log($state.current.data);    // inherited data object

// The latest successful parameter values
console.log($state.params.contactId); // 42
```

`$state.params` is a `StateParams` instance. Its `$inherit()` method is used internally to merge parameter values when navigating with `inherit: true`.
## Resolves

Resolves let you fetch asynchronous data before a state becomes active. The router waits for all resolve promises to settle before rendering the state's views.
### Object syntax

```javascript
  name: 'contacts.detail',
  url: '/:contactId',
  resolve: {
    // Function is injected with Angular services and resolve tokens
    contact: function ($transition$, ContactService) {
      return ContactService.get($transition$.params().contactId);
    },
    // A resolve can depend on another resolve from the same state
    contactHistory: ['contact', 'HistoryService', function (contact, HistoryService) {
      return HistoryService.forContact(contact.id);
    }]
  },
  templateUrl: 'contact-detail.html',
  controller: function ($scope, contact, contactHistory) {
    $scope.contact = contact;
    $scope.history = contactHistory;
  }
});
```
### Array syntax (ResolvableLiteral)

The array syntax supports typed tokens, custom resolve policies, and non-string tokens:

```javascript
  {
    token: 'contact',
    deps: ['$transition$', 'ContactService'],
    resolveFn: function ($transition$, ContactService) {
      return ContactService.get($transition$.params().contactId);
    },
    policy: { when: 'EAGER', async: 'WAIT' }
  }
]
```

**Resolve policies:**

| `when`             | Behavior                                                             |
| ------------------ | -------------------------------------------------------------------- |
| `'LAZY'` (default) | Fetched just before the state is entered                             |
| `'EAGER'`          | Fetched as soon as the transition starts, before any state is exited |

| `async`            | Behavior                                                                   |
| ------------------ | -------------------------------------------------------------------------- |
| `'WAIT'` (default) | Transition waits for the promise to resolve                                |
| `'NOWAIT'`         | Transition proceeds; the resolve promise is available but not yet resolved |
### Special injectable tokens in resolves

* `$transition$` — the current `Transition` object
* `$state$` — (in `onEnter`/`onExit`/`onRetain`) the state being entered/exited/retained
* Other resolve tokens from the same state or any ancestor state
### Resolve scoping

Resolved data is scoped to the state tree. A child state can inject resolves from its parent. Resolves are cached per-transition: if a parent state is retained across a transition, its resolves are not re-fetched.

```javascript
$stateProvider
  .state({
    name: 'contacts',
    resolve: {
      contacts: function (ContactService) { return ContactService.list(); }
    }
  })
  .state({
    name: 'contacts.detail',
    url: '/:id',
    resolve: {
      // Injects 'contacts' from the parent state
      contact: function (contacts, $transition$) {
        return contacts.find(c => c.id === $transition$.params().id);
      }
    }
  });
```
## Lazy loading states

Set a `lazyLoad` function to defer loading a state's code until the first time it is activated:

```javascript
$stateProvider.state({
  name: 'admin.**',
  url: '/admin',
  lazyLoad: function (transition, state) {
    return import('./admin/admin.module.js');
  }
});
```

When the transition targets any `admin.*` state, `lazyLoad` is called once. The returned promise should resolve to a `{ states: [...] }` object containing the real state declarations. The placeholder is replaced with the real state and the transition is retried automatically.

> **Warning:** Do not use `lazyLoad` with states that have already been registered. The function is only invoked once per state: after it resolves, the `lazyLoad` property is deleted from the declaration.
## Listening for state changes

`$stateRegistry.onStatesChanged()` fires whenever states are registered or deregistered:

```javascript
  if (event === 'registered') {
    console.log('New states:', states.map(s => s.name));
  }
});

// Later: stop listening
deregister();
```

To handle navigation to states that don't exist, register an `onInvalid` callback:

```javascript
  console.warn('Unknown state:', toState.name());
  // Optionally redirect:
  return $state.target('home');
});
```
