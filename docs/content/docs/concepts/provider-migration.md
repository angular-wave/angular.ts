---
title: 'Provider Migration'
linkTitle: 'Provider Migration'
weight: 260
description:
  'Move provider-era AngularTS code to NgModule declarations, app.config, and
  runtime services.'
---

AngularTS keeps user-defined providers as an advanced module extension
mechanism, but framework providers are not an application authoring API. Normal
apps declare structure through `NgModule`, configure framework behavior through
`app.config({ ... })`, and inject runtime services. The old provider paths below
are migration references, not compatibility APIs.

Non-provider compatibility symbols are tracked in the
[public API migration guide](../public-api-migration/).

## Preferred Paths

| Old provider path                   | Preferred path                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `$compileProvider.directive(...)`   | `app.directive(...)`                                                                 |
| `$compileProvider.component(...)`   | `app.component(...)`                                                                 |
| `$controllerProvider.register(...)` | `app.controller(...)`                                                                |
| `$filterProvider.register(...)`     | `app.filter(...)`                                                                    |
| `$animateProvider.register(...)`    | `app.animation(...)`                                                                 |
| `$stateProvider.state(...)`         | `app.router(...)`                                                                    |
| `$stateProvider.lazy(...)`          | `app.lazyState(...)`                                                                 |
| `$restProvider.rest(...)`           | `app.rest(...)`                                                                      |
| `$machineProvider`                  | `app.machine(...)` and injected `$machine`                                           |
| `$workflowProvider`                 | `defineWorkflow(...)`, `app.workflow(...)`, and injected `$workflow`                 |
| `$workerProvider`                   | `app.worker(...)` and injected `$worker`                                             |
| `$websocketProvider`                | `app.websocket(...)`, injected `$websocket`, and service config for lifecycle policy |
| `$httpProvider`                     | `app.config({ $http: ... })`                                                         |
| `$locationProvider`                 | `app.config({ $location: ... })`                                                     |
| `$logProvider`                      | `app.config({ $log: ... })`                                                          |
| `$cookieProvider`                   | `app.config({ $cookie: ... })`                                                       |
| `$exceptionHandlerProvider`         | `app.config({ $exceptionHandler: ... })`                                             |
| `$sceProvider`                      | `app.config({ $sce: ... })`                                                          |
| `$sceDelegateProvider`              | `app.config({ $sceDelegate: ... })`                                                  |
| `$anchorScrollProvider`             | `app.config({ $anchorScroll: ... })`                                                 |
| `$ariaProvider`                     | `app.config({ $aria: ... })`                                                         |
| `$templateCacheProvider`            | `app.config({ $templateCache: ... })` or runtime `$templateCache` APIs               |
| `$templateRequestProvider`          | `app.config({ $templateRequest: ... })`                                              |
| `$interpolateProvider`              | `app.config({ $interpolate: ... })`                                                  |

## Example

Old provider-style configuration:

```javascript
angular.module('app', []).config([
  '$stateProvider',
  '$httpProvider',
  '$interpolateProvider',
  function ($stateProvider, $httpProvider, $interpolateProvider) {
    $stateProvider.state({
      name: 'home',
      url: '/',
      template: '<home-page></home-page>',
    });
    $stateProvider.lazy('admin.**', loadAdminStates);
    $httpProvider.defaults.withCredentials = true;
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');
  },
]);
```

Preferred AngularTS authoring:

```javascript
angular
  .module('app', [])
  .router({ name: 'home', url: '/', template: '<home-page></home-page>' })
  .lazyState('admin.**', loadAdminStates)
  .config({
    $http: {
      defaults: {
        withCredentials: true,
      },
    },
    $interpolate: {
      startSymbol: '[[',
      endSymbol: ']]',
    },
  });
```

## Cleanup Rules

Provider compatibility aliases are not retained. Documentation must teach the
current `NgModule` and `app.config({ ... })` APIs, generated surfaces must match
that API, and new framework features must not expose provider recipes.
