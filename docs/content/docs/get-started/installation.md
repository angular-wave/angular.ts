---
title: "Install AngularTS in your project"
weight: 20
description: "Add AngularTS via a CDN script tag or npm. The package ships TypeScript declarations and supports auto-bootstrap with ng-app or manual bootstrap."
---
AngularTS can be added to any project in two ways: a single `<script>` tag for zero-configuration browser use, or an npm package for projects that use a bundler or want TypeScript declarations. Both approaches support the full framework — there is no difference in available features between the two.
## CDN

The fastest way to get started is to load AngularTS directly from [jsDelivr](https://www.jsdelivr.com/). No installation, no configuration — just add the script to your HTML file:

```html
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
  </head>
  <body>
    <div ng-app ng-init="x = 'world'">
      Hello {{ x }}
    </div>
  </body>
</html>
```

The UMD build exposes the `angular` global on `window` and auto-bootstraps any element with an `ng-app` attribute once the DOM is ready.

> **Tip:** The CDN URL always points to the latest published version on npm. To pin a specific version, include it in the URL: `https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts@0.26.0/dist/angular-ts.umd.min.js`
## npm

Install the package from the npm registry:

  ```bash
  npm install @angular-wave/angular.ts
  ```

  ```bash
  yarn add @angular-wave/angular.ts
  ```

  ```bash
  pnpm add @angular-wave/angular.ts
  ```

The package ships two distribution formats:

* **ESM** (`dist/angular-ts.esm.js`) — the default entry point for bundlers
* **UMD** (`dist/angular-ts.umd.js`) — for direct browser use

Import the library in your entry file:

```javascript
```

When loaded in a browser environment, the `angular` singleton is also assigned to `window.angular` automatically.
## TypeScript setup

The published package includes generated TypeScript declarations under `@types/`. No separate `@types/` package is required.

After installing, TypeScript will resolve types automatically. You can reference the type namespace in your project:

```typescript
const myModule: ng.NgModule = angular.module("myApp", []);

myModule.controller("MyController", function ($scope: ng.Scope) {
  $scope.message = "Hello, AngularTS";
});
```

> **Info:** The `ng` namespace provides types for scopes, injectors, services, directives, and all other AngularTS primitives. It is declared globally by the package and available anywhere TypeScript resolves the package types.
## Auto-bootstrap with ng-app

The simplest way to start an AngularTS application is the `ng-app` attribute. Place it on any HTML element and AngularTS will bootstrap that element as the application root when the DOM is ready:

```html
<div ng-app>
  {{ 1 + 1 }}
</div>
```

To connect a named module, set `ng-app` to the module name:

```html
<div ng-app="myApp">
  <p ng-controller="GreetController">{{ greeting }}</p>
</div>

<script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
<script>
  angular.module("myApp", []).controller("GreetController", function ($scope) {
    $scope.greeting = "Hello from AngularTS";
  });
</script>
```

Multiple independent `ng-app` elements can exist on the same page. Each becomes its own isolated application instance.
### Strict dependency injection

Add the `strict-di` attribute alongside `ng-app` to enable strict mode, which requires explicit dependency annotations and rejects minified code that relies on function parameter names:

```html
  ...
</div>
```
## Manual bootstrap with angular.bootstrap()

For full control over when and how your application starts, call `angular.bootstrap()` directly instead of using `ng-app`:

```html
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
  </head>
  <body>
    <div id="app">
      <p ng-controller="WelcomeController">{{ greeting }}</p>
    </div>

    <script>
      angular
        .module("demo", [])
        .controller("WelcomeController", function ($scope) {
          $scope.greeting = "Welcome!";
        });

      angular.bootstrap(document.getElementById("app"), ["demo"]);
    </script>
  </body>
</html>
```

`angular.bootstrap()` accepts three arguments:

| Argument  | Type                                    | Description                                               |
| --------- | --------------------------------------- | --------------------------------------------------------- |
| `element` | `string \| HTMLElement \| HTMLDocument` | The root element to bootstrap the application on          |
| `modules` | `Array<string \| any>`                  | Module names or inline config functions to load           |
| `config`  | `{ strictDi: boolean }`                 | Optional configuration; defaults to `{ strictDi: false }` |

It returns the `$injector` instance for the bootstrapped application.

> **Warning:** Do not call `angular.bootstrap()` on an element that already has an `ng-app` attribute, or on an element that contains `ng-view`, `ng-if`, or other transclusion directives. This causes the root element and injector to be misplaced.
## Next steps

#### [Quickstart]({{< relref "/docs/get-started/quickstart" >}})

Build a working app with a counter and todo list.

#### [Modules]({{< relref "/docs/concepts/modules" >}})

Learn how the AngularTS module system organizes your application.
