---
title: "Angular Class — Runtime Entry Point API"
weight: 60
description: "Complete API reference for the Angular class: module registration, bootstrap, injector creation, event-based invocation helpers, and static DOM helpers."
---
The `Angular` class is the main runtime entry point for AngularTS applications. It extends `EventTarget` and owns module registration, application bootstrap, injector access, and the lightweight event-based invocation helpers exposed on `window.angular`.

Instantiating `Angular` (or calling `new Angular()`) registers the global `window.angular` reference and wires up the internal module registry. A sub-application variant (`new Angular(true)`) skips the global assignment, making it suitable for embedding multiple isolated apps on one page.
## Constructor

```typescript
```
#### `subapp`

- **Type:** `boolean`
- **Default:** `false`

When `true`, the instance is **not** assigned to `window.angular`. Use this when embedding a secondary application on a page that already has a primary Angular instance. The new instance is automatically pushed onto the parent's `subapps` array by `angular.init()`.

```typescript
const angular = new Angular();

// Sub-application — isolated, no window.angular override
const subApp = new Angular(true);
```

***
## Public properties
#### `$rootScope`

- **Type:** `ng.Scope`

The application root scope. Available after `bootstrap()` completes. All child scopes inherit from this scope.
#### `$injector`

- **Type:** `ng.InjectorService`

The application injector. Available after `bootstrap()` or `injector()` completes. Use it to retrieve any registered service.
#### `$eventBus`

- **Type:** `ng.PubSubService`

The application-level publish/subscribe bus. Populated during bootstrap.
#### `version`

- **Type:** `string`

The AngularTS version string, replaced at build time.
#### `subapps`

- **Type:** `Angular[]`

Array of sub-application instances created by `init()` when multiple `ng-app` roots are found on the page.

***
## Methods
### `angular.module()`

Create or retrieve an application module. Passing only a name retrieves an existing module; passing a `requires` array creates a new one.

```typescript
```
#### `name`

- **Type:** `string`
- **Required:** yes

The name of the module to create or retrieve. Must not be a built-in property name.
#### `requires`

- **Type:** `string[]`

List of module names this module depends on. Providing this argument creates a new module and **resets** any previously registered module of the same name. Omit to retrieve an existing module.
#### `configFn`

- **Type:** `ng.Injectable<any>`

Optional configuration function passed directly to `NgModule.config()`. Runs in the config phase before services are instantiated.
#### `returns`

- **Type:** `NgModule`

The newly created or retrieved `NgModule` instance. Use its fluent API (`.controller()`, `.service()`, `.directive()`, `.config()`, `.run()`, etc.) to register application components.

```typescript
const app = angular.module('myApp', ['ng']);

// Register a service on the module
app.service('UserService', UserService);

// Configure a provider during config phase
app.config(['$locationProvider', ($locationProvider) => {
  $locationProvider.hashPrefix('!');
}]);

// Retrieve an existing module
const existing = angular.module('myApp');
```

> **Warning:** Calling `angular.module('name')` (single argument) throws `$injector:nomod` if the module has not been created yet.

***
### `angular.bootstrap()`

Manually bootstrap an AngularTS application on a DOM element. This is the programmatic alternative to the `ng-app` directive.

```typescript
  element: string | HTMLElement | HTMLDocument,
  modules?: Array<string | any>,
  config?: AngularBootstrapConfig
): ng.InjectorService
```
#### `element`

- **Type:** `string | HTMLElement | HTMLDocument`
- **Required:** yes

The root DOM element for the application. AngularTS compiles the element and all of its children. Avoid elements that are already inside a transclusion directive such as `ng-if` or `ng-view`.
#### `modules`

- **Type:** `Array<string | any>`

Module names or inline config functions to load. The built-in `"ng"` module is always prepended automatically.
#### `config`

- **Type:** `AngularBootstrapConfig`
- **Default:** `{ strictDi: false }`

Bootstrap configuration object.
### AngularBootstrapConfig properties
#### `strictDi`

- **Type:** `boolean`
- **Default:** `false`

When `true`, disables automatic function annotation. All injectable functions must be explicitly annotated with `$inject` or the array-style DI syntax. Recommended for production builds that minify function argument names.
#### `returns`

- **Type:** `ng.InjectorService`

The injector created for this application. Use it to retrieve services programmatically outside of DI-managed code.

```typescript
document.addEventListener('DOMContentLoaded', () => {
  angular.bootstrap(document.body, ['myApp'], { strictDi: true });
});
```

> **Warning:** Calling `bootstrap()` on an element that is already bootstrapped throws `ng:btstrpd`. Each element can only host one Angular application.

***
### `angular.injector()`

Create a standalone injector without bootstrapping the DOM. Useful for unit testing or server-side service instantiation.

```typescript
```
#### `modules`

- **Type:** `any[]`
- **Required:** yes

Array of module names or inline provider functions to load into the injector.
#### `strictDi`

- **Type:** `boolean`
- **Default:** `false`

When `true`, requires explicit DI annotation. Throws if a function relies on argument name inference.
#### `returns`

- **Type:** `ng.InjectorService`

A fully initialized `InjectorService` with all requested modules loaded.

```typescript
const $http = injector.get('$http');
```

***
### `angular.init()`

Auto-discover all `ng-app` attributes under `element` and bootstrap each one. The first `ng-app` found is bootstrapped on the primary `Angular` instance; additional `ng-app` roots each receive a new `Angular(true)` sub-application instance stored in `angular.subapps`.

```typescript
```
#### `element`

- **Type:** `HTMLElement | HTMLDocument`
- **Required:** yes

The root element to search. Usually `document` during page load.

```typescript
window.addEventListener('DOMContentLoaded', () => {
  angular.init(document);
});
```

> **Tip:** You do not need to call `init()` manually when using `ng-app`. AngularTS invokes it automatically when the script loads. Call it manually only when inserting dynamically created `ng-app` roots after page load.

***
### `angular.emit()`

Fire-and-forget invocation. Evaluates `expression` against an injectable service or a named scope without waiting for a result.

```typescript
```
#### `input`

- **Type:** `string`
- **Required:** yes

A dot-separated string in the format `"<target>.<expression>"`. The part before the first dot identifies either a registered injectable service name or a scope's `$scopename`. The remainder is the Angular expression to evaluate against that target.

```typescript
angular.emit('UserService.logout()');

// Set a property on a named scope
angular.emit('dashboardScope.refresh()');
```

***
### `angular.call()`

Awaitable invocation. Evaluates `expression` against an injectable service or named scope and returns a `Promise` that resolves with the result.

```typescript
```
#### `input`

- **Type:** `string`
- **Required:** yes

Same `"<target>.<expression>"` format as `emit()`. The target must be a registered service name or a scope's `$scopename`.
#### `returns`

- **Type:** `Promise<any>`

Resolves with the expression result. Rejects if the target is not found, or if the evaluated expression throws.

```typescript
const count = await angular.call('cartScope.items.length');
```

***
### `angular.getScopeByName()`

Locate a scope by its registered `$scopename` property. Searches the scope tree starting from `$rootScope`.

```typescript
```
#### `name`

- **Type:** `string`
- **Required:** yes

The value of the target scope's `$scopename` property. Must be a non-empty string.
#### `returns`

- **Type:** `ng.Scope | undefined`

The scope proxy if found, or `undefined` if no scope with that name exists in the current application.

```typescript
$scope.$scopename = 'myController';

// Later, locate it by name
const scope = angular.getScopeByName('myController');
scope?.refresh();
```

***
## Static DOM helpers

These three helpers are exposed as properties of the `Angular` instance and are also importable directly. They read cache data stored on DOM elements during compilation.
### `angular.getController(element)`

Retrieve the controller instance attached to a DOM element.

```typescript
```
### `angular.getInjector(element)`

Retrieve the injector attached to a bootstrapped root element.

```typescript
```
### `angular.getScope(element)`

Retrieve the scope attached to a compiled DOM element.

```typescript
```

### JavaScript

```javascript
const el = document.querySelector('[ng-controller="MyCtrl"]');
const ctrl = angular.getController(el);
ctrl.doSomething();
```

### TypeScript

```typescript
const el = document.querySelector('[ng-controller="MyCtrl"]') as Element;
const ctrl = angular.getController(el) as MyController;
ctrl.doSomething();
```

***
## `angular.$t` — injection tokens

`angular.$t` exposes all public injection token strings defined in `injection-tokens.ts` as a typed object. Use these instead of magic strings to reference services in DI annotations.

```typescript
MyService.$inject = [angular.$t.$http, angular.$t.$rootScope];
```
