---
title: "Dependency injection and the AngularTS injector"
weight: 200
description: "Understand how the AngularTS injector resolves named tokens, how to annotate dependencies, and how the provider pattern controls the config and run phases."
---
Dependency injection (DI) is the mechanism AngularTS uses to supply components with the services they need. Rather than constructing dependencies directly, you declare what you need by name and the **injector** finds, instantiates, and delivers each dependency. This keeps components decoupled, composable, and straightforward to test in isolation.
## How the injector works

When you call `angular.bootstrap()` (or use the `ng-app` directive), AngularTS calls `createInjector()` with your list of modules. The injector builds two internal caches:

* **Provider cache** — holds provider objects, accessible during the config phase.
* **Instance cache** — holds fully constructed service singletons, built on first request.

When a service is requested via `$injector.get('myService')`, the injector looks up `myServiceProvider`, calls its `$get` method (injecting that method's own dependencies), caches the result, and returns it. Every subsequent `get` returns the same instance.

```typescript

// Retrieve a service
const $http = injector.get('$http');

// Check existence without throwing
if (injector.has('myOptionalService')) {
  const svc = injector.get('myOptionalService');
}

// Invoke a function with injection
injector.invoke(['$rootScope', '$http', function ($rootScope, $http) {
  // both dependencies are injected automatically
}]);
```
## Declaring dependencies

AngularTS reads dependency names from the function's arguments — but argument names are erased by minifiers. The safe, minification-proof approach is **array annotation**: an array where every element except the last is a dependency name string, and the last element is the function.

### Array annotation (recommended)

```typescript
angular.module('myApp', [])
  .controller('UserCtrl', [
    '$scope', '$http', 'userService',
    function ($scope, $http, userService) {
      $scope.users = [];

      userService.getAll().then(({ data }) => {
        $scope.users = data;
      });
    },
  ]);
```

### $inject property

```typescript
class UserCtrl {
  static $inject = ['$scope', '$http', 'userService'];

  constructor(
    private $scope: ng.Scope,
    private $http: ng.HttpService,
    private userService: UserService,
  ) {
    $scope.users = [];
    userService.getAll().then(({ data }) => {
      $scope.users = data;
    });
  }
}

angular.module('myApp', []).controller('UserCtrl', UserCtrl);
```

> **Note:** The `$inject` static property on a class is the TypeScript-idiomatic form of array annotation. When present, AngularTS reads it in preference to inspecting function argument names.
## Strict DI mode

Passing `{ strictDi: true }` to `angular.bootstrap()` (or adding the `strict-di` attribute to the `ng-app` element) disables implicit annotation. Every injectable must carry explicit annotations. This catches minification bugs at development time.

```typescript
```

```html
<div ng-app="myApp" strict-di></div>
```

Under strict DI, any function that reaches the injector without annotations throws immediately — even if the un-annotated function would have worked in development.
## Injectable types

#### value

A fixed JavaScript value. Registered with `$provide.value()`. Not available during the config phase.

#### constant

Like value, but available during the config phase and cannot be overridden by a decorator.

#### factory

A function whose return value becomes the singleton. Must not return `undefined`.

#### service

A constructor function. Instantiated with `new` once; the instance is the singleton.

#### provider

The most flexible type. An object with a `$get` method. Can expose configuration methods accessible during the config phase.

#### decorator

Wraps an existing service. Receives `$delegate` (the original) and returns a replacement or augmented version.
## The provider pattern

Providers give you a way to configure a service before any instance is created. During the **config phase** the provider itself is injected (not the instance), allowing configuration. During the **run phase** and everywhere else, the instance produced by `$get` is injected.

```typescript
  private prefix = 'Hello';

  // Configuration method — callable during config phase
  setPrefix(value: string) {
    this.prefix = value;
  }

  // The injector calls $get to produce the service instance
  $get = ['$log', ($log: ng.LogService) => {
    const prefix = this.prefix;
    return {
      greet(name: string) {
        $log.info(`${prefix}, ${name}!`);
      },
    };
  }];
}

angular.module('myApp', [])
  .provider('greeter', GreeterProvider)
  .config(['greeterProvider', function (greeterProvider) {
    // During config, the *provider* is injected — note the "Provider" suffix
    greeterProvider.setPrefix('Greetings');
  }])
  .run(['greeter', function (greeter) {
    // During run, the *instance* is injected
    greeter.greet('world');
  }]);
```

> **Info:** During the config phase, inject a provider by appending `Provider` to its name: `greeterProvider` for the `greeter` service. This naming convention is enforced by AngularTS internally.
## Decorating existing services

A decorator intercepts an existing service and can replace, wrap, or augment it. The original instance is available as `$delegate`.

```typescript
  .config(['$provide', function ($provide) {
    $provide.decorator('$log', ['$delegate', function ($delegate) {
      const originalInfo = $delegate.info.bind($delegate);

      $delegate.info = function (...args: any[]) {
        originalInfo('[DECORATED]', ...args);
      };

      return $delegate;
    }]);
  }]);
```
## Injecting into different artifact types

### Controllers

Controllers receive `$scope` as their first dependency by convention, followed by any other services. Use array annotation or `$inject`.

```typescript
app.controller('DashboardCtrl', [
  '$scope', '$http',
  function ($scope, $http) { /* ... */ },
]);
```

### Directives

Directive factories are injected like any other factory. The returned directive definition object is not itself injected.

```typescript
app.directive('myWidget', ['$http', 'dataService', function ($http, dataService) {
  return {
    restrict: 'E',
    link(scope) {
      dataService.load().then(data => { scope.data = data; });
    },
  };
}]);
```

### Filters

Filter factories are injectable. The returned filter function itself is not — it receives only the value and optional arguments from the template.

```typescript
app.filter('truncate', ['$log', function ($log) {
  return function (text: string, limit = 80) {
    $log.info('truncating');
    return text.length > limit ? text.slice(0, limit) + '…' : text;
  };
}]);
```

### Config and run blocks

Config blocks can inject providers and constants only. Run blocks have access to all services.

```typescript
// Config — providers only
app.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.defaults.headers.common['X-App'] = 'myApp';
}]);

// Run — services are available
app.run(['$rootScope', '$state', function ($rootScope, $state) {
  $rootScope.$on('$stateChangeError', () => $state.go('error'));
}]);
```
## `$injector` API reference

| Method                                 | Description                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `$injector.get(token)`                 | Returns the service instance for `token`. Throws if not found.                          |
| `$injector.has(token)`                 | Returns `true` if a provider for `token` is registered.                                 |
| `$injector.invoke(fn, self?, locals?)` | Calls `fn` with injected arguments. Optionally overrides specific tokens with `locals`. |
| `$injector.instantiate(Type, locals?)` | Instantiates a constructor with `new`, injecting its dependencies.                      |
| `$injector.annotate(fn)`               | Returns the array of dependency names for `fn`.                                         |
| `$injector.loadNewModules(mods)`       | Loads additional modules into a running injector.                                       |
