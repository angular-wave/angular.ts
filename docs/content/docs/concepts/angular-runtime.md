---
title: "Angular Runtime"
weight: 60
description: "Use the Angular runtime to create modules, bootstrap applications, access injectors, and bridge external code."
---

`Angular` is the runtime entry point for AngularTS. It owns module registration,
application bootstrap, injector creation, cached DOM helpers, and the
event-based invocation helpers exposed through `window.angular`.

Exact runtime contracts live in TypeDoc:

- [`Angular`](../../../typedoc/classes/Angular.html)
- [`AngularBootstrapConfig`](../../../typedoc/interfaces/AngularBootstrapConfig.html)
- [`NgModule`](../../../typedoc/classes/NgModule.html)
- [`InjectorService`](../../../typedoc/interfaces/InjectorService.html)

## Create Modules

Use `angular.module()` to create or retrieve modules. Passing a dependency array
creates a module; passing only the name retrieves one.

```typescript
const app = angular.module("myApp", ["ng"]);

app.service("UserService", UserService);

app.config(($locationProvider) => {
  $locationProvider.hashPrefix("!");
});

const existing = angular.module("myApp");
```

Calling `angular.module("name")` without first creating that module throws the
same `nomod` error as AngularJS.

## Bootstrap Manually

`angular.bootstrap()` starts an application on a DOM element. It is the
programmatic alternative to `ng-app`.

```typescript
document.addEventListener("DOMContentLoaded", () => {
  angular.bootstrap(document.body, ["myApp"], {
    strictDi: true,
  });
});
```

The built-in `ng` module is prepended automatically. Use `strictDi` when code
must be safe for minification.

Each element can host only one application. Bootstrapping an element that
already has an injector throws `ng:btstrpd`.

## Auto-Bootstrap

`angular.init()` scans an element or document for `ng-app` roots. The first root
uses the current `Angular` instance. Additional roots are bootstrapped as
sub-applications and stored in `angular.subapps`.

```typescript
window.addEventListener("DOMContentLoaded", () => {
  angular.init(document);
});
```

You usually do not need to call this yourself for static pages because AngularTS
runs auto-bootstrap when the script loads. Call it manually when dynamically
adding new `ng-app` roots.

## Create A Standalone Injector

Use `angular.injector()` when tests or non-DOM code need services without
compiling an application root.

```typescript
const injector = angular.injector(["ng", "myApp"], true);
const $http = injector.get("$http");
```

## Bridge External Code

`angular.emit()` and `angular.call()` evaluate expressions against an injectable
service or a named scope. The input format is `"<target>.<expression>"`.

```typescript
angular.emit("UserService.logout()");

const count = await angular.call("cartScope.items.length");
```

Use these helpers for small integration boundaries such as browser callbacks,
legacy scripts, or embedded widgets. Normal application code should prefer
dependency injection.

## Locate Named Scopes

`getScopeByName()` searches from `$rootScope` for a scope with a matching
`$scopename`.

```typescript
$scope.$scopename = "dashboard";

const scope = angular.getScopeByName("dashboard");
scope?.refresh();
```

## Inspect Compiled Elements

The runtime exposes DOM cache helpers for integration and debugging:

```typescript
const el = document.querySelector("[ng-controller='MyCtrl']") as Element;

const ctrl = angular.getController(el);
const scope = angular.getScope(el);
const injector = angular.getInjector(el);
```

These helpers read metadata attached during compilation and bootstrap.

## Use Injection Tokens

`angular.$t` exposes public injection token strings as a typed object. Prefer it
when writing `$inject` arrays in TypeScript.

```typescript
MyService.$inject = [angular.$t.$http, angular.$t.$rootScope];
```
