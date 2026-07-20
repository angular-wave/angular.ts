---
title: 'Dependency injection and the AngularTS injector'
linkTitle: 'Dependency Injection'
weight: 200
description:
  'Understand how the AngularTS injector resolves named tokens, how to annotate
  dependencies, and how the provider pattern controls the config and run phases.'
---

Dependency injection (DI) is the mechanism AngularTS uses to supply components
with the services they need. Rather than constructing dependencies directly, you
declare what you need by name and the **injector** finds, instantiates, and
delivers each dependency. This keeps components decoupled, composable, and
straightforward to test in isolation.

## How the injector works

When you call `angular.bootstrap()` (or use the `ng-app` directive), AngularTS
calls `createInjector()` with your list of modules. The injector builds two
internal caches:

- **Provider cache** — holds provider objects, accessible during the config
  phase.
- **Instance cache** — holds fully constructed service singletons, built on
  first request.

When a service is requested via `$injector.get('myService')`, the injector looks
up `myServiceProvider`, calls its `$get` method (injecting that method's own
dependencies), caches the result, and returns it. Every subsequent `get` returns
the same instance.

```typescript
// Retrieve a service
const $http = injector.get('$http');

// Built-in token literals infer their registered service type.
const $machine = injector.get(angular.$t.$machine);

// Custom services can provide an explicit result type.
const flags = injector.get<{ enabled: boolean }>('featureFlags');

// Check existence without throwing
if (injector.has('myOptionalService')) {
  const svc = injector.get('myOptionalService');
}

// Invoke a function with injection
injector.invoke([
  '$rootScope',
  '$http',
  function ($rootScope, $http) {
    // both dependencies are injected automatically
  },
]);
```

Applications that use the injector directly can declare their complete custom
service registry once. Built-in token inference remains available alongside the
application services, and `invoke()` and `instantiate()` infer their return
types.

```typescript
interface AppServices {
  auth: AuthService;
  featureFlags: { enabled: boolean };
}

const appInjector: ng.InjectorService<AppServices> = injector;
const auth = appInjector.get('auth');
const answer = appInjector.invoke(() => 42); // number
const session = appInjector.instantiate(Session); // Session
```

## Declaring dependencies

AngularTS reads dependency names from the function's arguments — but argument
names are erased by minifiers. The safe, minification-proof approach is **array
annotation**: an array where every element except the last is a dependency name
string, and the last element is the function.

### Array annotation (recommended)

```typescript
angular.module('myApp', []).controller('UserCtrl', [
  '$scope',
  '$http',
  'userService',
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

> **Note:** The `$inject` static property on a class is the TypeScript-idiomatic
> form of array annotation. AngularTS does not infer dependencies from function
> parameter names.

## Explicit dependency annotation

Every dependency-bearing function must use array annotation or a static
`$inject` property. An unannotated function with parameters throws immediately.
This invariant makes dependency injection deterministic under minification.

## Injectable types

#### value

A fixed JavaScript value registered with `module.value()`. It is not available
during the config phase.

#### constant

Like value, but available during the config phase and cannot be overridden by a
decorator.

#### factory

A function whose return value becomes the singleton. Must not return
`undefined`.

#### service

A constructor function. Instantiated with `new` once; the instance is the
singleton.

#### provider

The most flexible type. An object with a `$get` method. Can expose configuration
methods accessible during the config phase.

#### decorator

Wraps an existing service. Receives `$delegate` (the original) and returns a
replacement or augmented version.

## The provider pattern

Providers give you a way to configure a service before any instance is created.
During the **config phase** the provider itself is injected (not the instance),
allowing configuration. During the **run phase** and everywhere else, the
instance produced by `$get` is injected.

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

> **Info:** During the config phase, inject a provider by appending `Provider`
> to its name: `greeterProvider` for the `greeter` service. This naming
> convention is enforced by AngularTS internally.

## Public Injectable Contracts

`ng.InjectionTokenMap` is the authoritative mapping from every public
single-dollar token to its named contract. `InjectorService.get()` uses this map
automatically:

```typescript
const compile: ng.CompileService = $injector.get('$compile');
const rootScope: ng.RootScopeService = $injector.get('$rootScope');
const stateRegistry: ng.StateRegistryService = $injector.get('$stateRegistry');
const browserWindow: ng.WindowService = $injector.get('$window');
```

Framework-owned double-dollar tokens are internal implementation details and are
deliberately absent from `PublicInjectionTokens`, `InjectionTokenMap`, and the
`ng` namespace.

Every `InjectionTokenMap` value is a named `ng.*` contract exported through the
generated TypeDoc entry point. Adding a public token without both its namespace
contract and documentation export fails `make check`.

## Decorating existing services

A decorator intercepts an existing service and can replace, wrap, or augment it.
The original instance is available as `$delegate`.

```typescript
  .decorator('$log', ['$delegate', function ($delegate) {
      const originalInfo = $delegate.info.bind($delegate);

      $delegate.info = function (...args: any[]) {
        originalInfo('[DECORATED]', ...args);
      };

      return $delegate;
    }]);
```

## Injecting into different artifact types

### Controllers

Controllers receive `$scope` as their first dependency by convention, followed
by any other services. Use array annotation or `$inject`.

```typescript
app.controller('DashboardCtrl', [
  '$scope',
  '$http',
  function ($scope, $http) {
    /* ... */
  },
]);
```

### Directives

Directive factories are injected like any other factory. The returned directive
definition object is not itself injected.

```typescript
app.directive('myWidget', [
  '$http',
  'dataService',
  function ($http, dataService) {
    return {
      restrict: 'E',
      link(scope) {
        dataService.load().then((data) => {
          scope.data = data;
        });
      },
    };
  },
]);
```

### Filters

Filter factories are injectable. The returned filter function itself is not — it
receives only the value and optional arguments from the template.

```typescript
app.filter('truncate', [
  '$log',
  function ($log) {
    return function (text: string, limit = 80) {
      $log.info('truncating');
      return text.length > limit ? text.slice(0, limit) + '…' : text;
    };
  },
]);
```

### Config and run blocks

Framework configuration is a typed declarative object. Run blocks have access to
runtime services.

```typescript
app.config({
  $http: {
    defaults: {
      headers: {
        common: { 'X-App': 'myApp' },
      },
    },
  },
});

// Run — services are available
app.run([
  '$rootScope',
  '$state',
  function ($rootScope, $state) {
    $rootScope.$on('$stateChangeError', () => $state.go('error'));
  },
]);
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
