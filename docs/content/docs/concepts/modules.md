---
title: "Modules: organizing your AngularTS application"
weight: 210
description: "Learn how AngularTS modules group controllers, services, directives, and config into composable units that the injector loads at bootstrap."
---
Every AngularTS application is assembled from one or more **modules**. A module is a named container that registers services, directives, controllers, filters, and configuration blocks. Modules do not execute any code themselves — they record recipes that the injector later uses to construct and wire together your application. This separation between declaration and instantiation is what makes AngularTS applications easy to test and compose.
## Creating and retrieving modules

Use `angular.module()` to both create and look up modules. The presence of the second argument — the `requires` array — is what distinguishes creation from retrieval.

### TypeScript

```typescript
// Create a new module with no dependencies
const app = angular.module('myApp', []);

// Retrieve an already-registered module
const same = angular.module('myApp');
```

### JavaScript

```javascript
// Create a new module
var app = angular.module('myApp', []);

// Retrieve it elsewhere (e.g., in another file)
var same = angular.module('myApp');
```

> **Warning:** Calling `angular.module('myApp', [])` a second time **replaces** the existing module. Always pass the `requires` array only once — at the point of creation — and omit it everywhere else.
## Module registration methods

The `NgModule` instance returned by `angular.module()` exposes a fluent API for registering every kind of application artifact. All methods return the same module so calls can be chained.

#### .controller(name, fn)

Registers a controller constructor. The controller is instantiated by `$controller` and receives a child scope.

#### .service(name, ctor)

Registers a singleton service constructed with `new`. The constructor is instantiated once and reused.

#### .factory(name, fn)

Registers a factory function whose return value becomes the singleton. The function must not return `undefined`.

#### .provider(name, type)

Registers a full provider. The provider's `$get` method is called to produce the service instance. Providers can expose configuration methods accessible during the config phase.

#### .value(name, val)

Registers an arbitrary value as a service. Values cannot be injected during the config phase.

#### .constant(name, val)

Registers a constant that is available during both the config and run phases and cannot be overridden by a decorator.

#### .directive(name, fn)

Registers a directive factory for the `$compile` provider.

#### .filter(name, fn)

Registers a filter function for use in templates and `$filter`.

#### .config(fn)

Runs during the config phase, before any services are instantiated. Only providers and constants can be injected.

#### .run(fn)

Runs after the injector has been created. Services are available. Use this for one-time initialization logic.
## A complete module example

The following example creates a module, registers a constant, a service, a controller, and a config block, then composes that module with a second utility module.

```typescript
const utilModule = angular.module('util', []);

utilModule.constant('API_BASE', 'https://api.example.com');

utilModule.factory('logger', ['$log', function ($log) {
  return {
    info(msg: string) { $log.info('[app]', msg); },
    warn(msg: string) { $log.warn('[app]', msg); },
  };
}]);
```

```typescript
class UserService {
  static $inject = ['$http', 'API_BASE', 'logger'];

  constructor(
    private $http: ng.HttpService,
    private base: string,
    private logger: { info: (m: string) => void },
  ) {}

  getAll() {
    this.logger.info('Fetching users');
    return this.$http.get(`${this.base}/users`);
  }
}

const app = angular.module('myApp', ['ng', 'util']);

app.service('userService', UserService);

app.controller('UserListController', [
  '$scope', 'userService',
  function ($scope, userService) {
    $scope.users = [];

    userService.getAll().then(({ data }) => {
      $scope.users = data;
    });
  },
]);

app.config(['$locationProvider', function ($locationProvider) {
  $locationProvider.html5Mode(true);
}]);

app.run(['logger', function (logger) {
  logger.info('Application started');
}]);
```
## Module dependencies

The `requires` array lists the names of other modules that must be loaded before the current one. The injector resolves the entire dependency graph recursively before running any config or run blocks.

```typescript
  'ng',        // AngularTS core — always auto-loaded but explicit is fine
  'util',      // local utility module
  'ngRoute',   // third-party module
]);
```

Modules are loaded in dependency order, depth-first. If two modules declare the same service, the last one registered wins.
## The built-in `ng` module

The `ng` module is registered automatically when the `Angular` class is instantiated. You never need to declare it as a dependency — it is always prepended to the bootstrap module list. It provides every core service and directive, including:

| Token          | Description                     |
| -------------- | ------------------------------- |
| `$rootScope`   | The root of the scope hierarchy |
| `$compile`     | Template compiler               |
| `$http`        | HTTP client                     |
| `$interpolate` | Template interpolation          |
| `$parse`       | Expression parser               |
| `$filter`      | Filter registry                 |
| `$animate`     | Animation support               |
| `$location`    | URL management                  |
| `$sce`         | Strict contextual escaping      |
| `$state`       | Router state service            |
| `$eventBus`    | Pub/sub messaging               |

> **Tip:** Splitting your application into small, focused modules makes unit testing dramatically easier. Each module can be loaded in isolation with `angular.injector(['ng', 'myModule'])`, giving you a fully functional injector without bootstrapping the DOM.
## Special module methods

Beyond the standard registration methods, `NgModule` supports several higher-level conveniences:

```typescript
app.wasm('mathLib', '/wasm/math.wasm', {});

// Register a Web Worker connection
app.worker('backgroundWorker', '/workers/bg.js');

// Register a REST resource backed by $rest
app.rest('Post', '/api/posts', Post);

// Register a persisted service (session, local, or cookie storage)
app.store('prefs', UserPreferences, 'local');

// Register a pre-configured SSE stream
app.sse('notifications', '/events/stream');

// Register a pre-configured WebSocket connection
app.websocket('chat', 'wss://chat.example.com/ws');
```

These methods all push entries onto the module's internal invoke queue. They are resolved by the injector during bootstrap exactly like any other `$provide` registration.
