---
title: Debug a running application
description:
  Read and change scopes, controllers, and services from browser DevTools
weight: 5
---

## Problem

A page is running, but you do not know which state, controller, or service owns
the DOM you are looking at. You want to inspect it before changing code.

## Before you start

Run a development build with AngularTS debugging helpers available. Open the
page and browser DevTools; no source changes are required for the first
inspection.

## Recipe

Open the browser's **Elements** panel and select the element you want to
inspect. The DevTools console exposes that element as `$0`.

### Inspect its scope

Select an element that creates a scope, such as an `ng-controller`, component,
or repeated row. Then run:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
const scope = angular.getScope($0);
scope;
```

[`angular.getScope()`](../../../typedoc/classes/Angular.html#getscope) returns
the [`Scope`](../../../typedoc/classes/Scope.html) attached to that compiled
element. Read the same properties used by its template:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
scope.query;
scope.results;
```

Change a value directly:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
scope.query = 'boots';
```

AngularTS observes writes to the scope proxy and schedules the affected
bindings. You do not need to run a digest. Collection changes work the same way:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
scope.results.push({ id: 'debug', name: 'Temporary result' });
```

### Find a scope by ID or name

AngularTS gives each scope a numeric `id` when it creates it:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
scope.id; // for example, 7
scope.root.getById(7);
```

An ID is useful while inspecting the current page, but it can change after a
reload or after AngularTS recreates part of the page. Give an important scope a
name when you want to find it repeatedly.

Add `ng-scope` with a non-empty name to the element whose scope you want to
find:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```html
<section ng-controller="CartController" ng-scope="cart">
  <p>{{ items.length }} items</p>
</section>
```

`ng-scope="cart"` assigns `cart` to that scope's `scopeName`. It does not create
another child scope. The name is required. Find it from the console without
selecting the element again:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
const cart = angular.getScopeByName('cart');

cart.items;
cart.refresh();
```

[`angular.getScopeByName()`](../../../typedoc/classes/Angular.html#getscopebyname)
searches the current application's scope tree.

If the page has several `ng-app` roots, start with an element inside the
intended application and search from that application's root scope:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
const injector = angular.getInjector($0);
const rootScope = injector.get('$rootScope');
const cart = rootScope.searchByName('cart');
```

### Inspect its controller

[`angular.getController()`](../../../typedoc/classes/Angular.html#getcontroller)
finds the nearest inherited `ng-controller` controller:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
const controller = angular.getController($0);
controller;
controller.reload();
```

Pass a directive name when you need a specific controller. For example, select
an input with `ng-model` and run:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
const model = angular.getController($0, 'ngModel');
model;
```

Use this to read controller state and call the same methods as the page.

### Inspect available services

[`angular.getInjector()`](../../../typedoc/classes/Angular.html#getinjector)
walks up from the selected element to the nearest bootstrapped application and
returns its [`InjectorService`](../../../typedoc/types/InjectorService.html):

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
const injector = angular.getInjector($0);

const rootScope = injector.get('$rootScope');
const http = injector.get('$http');
const router = injector.get('$state');
```

Use the injector to answer practical questions: whether a service is registered,
which instance the page uses, and what state that instance currently holds.

### Choose the right application

A page can contain more than one `ng-app`. Each application has its own
injector, root scope, and service instances. Start from an element inside the
application you want to inspect.

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```html
<main ng-app="storefront">...</main>
<aside ng-app="admin">...</aside>
```

Get each injector from its own root element:

<!-- tested-by: src/angular.spec.ts, src/directive/scope/scope.spec.ts -->

```js
const storefrontElement = document.querySelector('[ng-app="storefront"]');
const adminElement = document.querySelector('[ng-app="admin"]');

const storefront = angular.getInjector(storefrontElement);
const admin = angular.getInjector(adminElement);

storefront === admin; // false
```

When `$0` is inside `storefront`, `angular.getInjector($0)` returns the
storefront injector. When `$0` is inside `admin`, it returns the admin injector.
The same rule applies when reading scopes and controllers: select an element
inside the application you mean to inspect.

Do not fetch a service from one injector and assume it belongs to the other
application. Even when both applications register a service with the same name,
they can hold different instances and state.

## Verify

1. Select the element whose text or value you want to change.
2. Read its scope or controller and find the matching property.
3. Change that property in the console.
4. Confirm only the expected part of the DOM updates.
5. If the page has several `ng-app` roots, confirm you selected the intended
   one.
6. Reload the page and confirm the temporary change disappears.

## Failure path

Helpers return state from the application containing the selected element. On
pages with several `ng-app` roots, selecting outside the intended root can
produce a different injector or no result.

## Apply it now

Select one element whose behavior you do not understand. Find its application,
scope, and controller in DevTools. Change one reversible value and identify the
exact binding that updates. Keep the scope name only if you expect to inspect
this part of the page again.
