---
title: "States"
weight: 350
description: "Define state hierarchies, resolve data, register states, and navigate with $state."
---

A state represents a place in an AngularTS application: a page, a nested layout,
a modal, or a step in a workflow. States are declared as plain objects and
registered through `$stateProvider` during configuration or `$stateRegistry` at
runtime.

Exact state and router contracts live in TypeDoc:

- [`StateDeclaration`](../../../typedoc/interfaces/StateDeclaration.html)
- [`StateProvider`](../../../typedoc/classes/StateProvider.html)
- [`StateRegistryProvider`](../../../typedoc/classes/StateRegistryProvider.html)
- [`TransitionOptions`](../../../typedoc/interfaces/TransitionOptions.html)
- [`TransitionPromise`](../../../typedoc/interfaces/TransitionPromise.html)
- [`StateResolveObject`](../../../typedoc/types/StateResolveObject.html)
- [`StateResolveArray`](../../../typedoc/types/StateResolveArray.html)
- [`ParamDeclaration`](../../../typedoc/interfaces/ParamDeclaration.html)
- [`HrefOptions`](../../../typedoc/interfaces/HrefOptions.html)

## Register States

Register most states in a config block, or use `module.state()` for the same
provider registration through the fluent module API. Calls to both
`$stateProvider.state()` and `module.state()` are chainable.

```javascript
angular.module("demo", []).config(($stateProvider) => {
  $stateProvider
    .state({
      name: "home",
      url: "/home",
      component: "homePage",
    })
    .state({
      name: "contacts",
      url: "/contacts",
      templateUrl: "contacts/list.html",
      controller: "ContactsListCtrl",
      controllerAs: "vm",
    });
});
```

Equivalent module-level registration:

```javascript
angular.module("demo", [])
  .state("home", {
    url: "/home",
    component: "homePage",
  })
  .state("contacts", {
    url: "/contacts",
    templateUrl: "contacts/list.html",
    controller: "ContactsListCtrl",
    controllerAs: "vm",
  });
```

Register states at runtime when a feature is loaded after bootstrap.

```javascript
angular.module("demo").run(($stateRegistry) => {
  $stateRegistry.register({
    name: "settings",
    url: "/settings",
    component: "settingsPage",
  });
});
```

Runtime registration requires the parent state to exist first. If the parent is
missing, the state is queued until the parent is registered.

## Nest States

Use dot notation or an explicit `parent` property to create a hierarchy.

```javascript
$stateProvider
  .state({
    name: "contacts",
    url: "/contacts",
    template: "<div ng-view></div>",
  })
  .state({
    name: "contacts.list",
    url: "/list",
    templateUrl: "contacts/list.html",
  })
  .state({
    name: "contacts.detail",
    url: "/:id",
    templateUrl: "contacts/detail.html",
  });
```

Child states inherit the parent URL prefix. A transition to `contacts.detail`
with `{ id: 42 }` produces `/contacts/42`.

A parent state must provide a `ng-view` outlet where child views can render.

## Use Abstract States

Abstract states cannot be activated directly. Use them to share a URL prefix,
resolves, metadata, or layout with child states.

```javascript
$stateProvider
  .state({
    name: "admin",
    url: "/admin",
    abstract: true,
    template: "<admin-layout ng-view></admin-layout>",
    resolve: {
      currentUser: (AuthService) => AuthService.currentUser(),
    },
    data: { requiresAuth: true },
  })
  .state({
    name: "admin.dashboard",
    url: "/dashboard",
    component: "adminDashboard",
  });
```

Navigating to `admin.dashboard` enters both `admin` and `admin.dashboard`.

## Declare Parameters

URL parameters are parsed from path and query segments.

```javascript
$stateProvider.state({
  name: "product",
  url: "/products/:category?page&sort",
  component: "productList",
});
```

Non-URL parameters belong in the `params` block.

```javascript
$stateProvider.state({
  name: "search",
  url: "/search?q",
  params: {
    q: { value: "", squash: true },
    filters: { value: null, type: "any" },
  },
  component: "searchPage",
});
```

Use parameter declarations for defaults, typed values, dynamic params, array
params, squashing, inheritance, and raw URL values.

## Resolve Data

Resolves fetch or compute data before a state renders. The router waits for
required resolves before entering the state.

```javascript
$stateProvider.state({
  name: "contacts.detail",
  url: "/:contactId",
  resolve: {
    contact: ($transition$, ContactService) =>
      ContactService.get($transition$.params().contactId),
    contactHistory: [
      "contact",
      "HistoryService",
      (contact, HistoryService) => HistoryService.forContact(contact.id),
    ],
  },
  templateUrl: "contact-detail.html",
  controller($scope, contact, contactHistory) {
    $scope.contact = contact;
    $scope.history = contactHistory;
  },
});
```

Use array-style resolves when you need explicit tokens, dependency metadata, or
resolve policies.

```javascript
resolve: [
  {
    token: "contact",
    deps: ["$transition$", "ContactService"],
    resolveFn: ($transition$, ContactService) =>
      ContactService.get($transition$.params().contactId),
    policy: { when: "EAGER", async: "WAIT" },
  },
];
```

## Navigate

Use `$state.go()` for normal application navigation. It supports absolute
states, parent-relative states, sibling-relative states, params, and transition
options.

```javascript
$state.go("contacts.detail", { contactId: 42 });

$state.go("^");

$state.go("^.list");

$state.go(".detail", { contactId: 42 });

$state.go("home", {}, { location: "replace", reload: true });
```

`$state.go()` returns a `TransitionPromise`, which is a promise with the active
`Transition` attached as `.transition`.

Use `transitionTo()` only when you need lower-level control.

```javascript
$state.transitionTo("contacts.detail", { contactId: 42 }, {
  location: true,
  inherit: false,
  reload: false,
  supercede: true,
});
```

## Inspect And Link

Generate links without navigating:

```javascript
const url = $state.href("contacts.detail", { contactId: 42 });
const absUrl = $state.href(
  "contacts.detail",
  { contactId: 42 },
  { absolute: true },
);
```

Check active states:

```javascript
$state.is("contacts.detail");
$state.is("contacts.detail", { contactId: 42 });

$state.includes("contacts");
$state.includes("contacts.**");
$state.includes("*.detail.*.*");
```

Reload the current state or an ancestor subtree:

```javascript
$state.reload();
$state.reload("contacts");
```

## Related

- [Routing overview]({{< relref "/docs/routing/overview" >}})
- [Transitions]({{< relref "/docs/routing/transitions" >}})
- [URL matching]({{< relref "/docs/routing/url-matching" >}})
