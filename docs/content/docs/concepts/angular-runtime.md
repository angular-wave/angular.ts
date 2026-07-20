---
title: 'Angular Runtime'
weight: 60
description:
  'Use the Angular runtime to create modules, bootstrap applications, access
  injectors, and bridge external code.'
---

`Angular` is the runtime entry point for AngularTS. It owns module registration,
application bootstrap, injector creation, cached DOM helpers, and the
event-based invocation helpers exposed through `window.angular`.

Exact runtime contracts live in TypeDoc:

- [`Angular`](../../../typedoc/classes/Angular.html)
- [`NgModule`](../../../typedoc/classes/NgModule.html)
- [`InjectorService`](../../../typedoc/interfaces/InjectorService.html)

## Create Modules

Use `angular.module()` to create or retrieve modules. Passing a dependency array
creates a module; passing only the name retrieves one.

```typescript
const app = angular.module('myApp', ['ng']);

app.service('UserService', UserService);

app.config({
  $location: {
    hashPrefix: '!',
  },
});

const existing = angular.module('myApp');
```

Calling `angular.module("name")` without first creating that module throws the
same `nomod` error as AngularJS.

## Bootstrap Manually

`angular.bootstrap()` starts an application on a DOM element. It is the
programmatic alternative to `ng-app`.

```typescript
document.addEventListener('DOMContentLoaded', () => {
  angular.bootstrap(document.body, ['myApp']);
});
```

The built-in `ng` module is prepended automatically. Every dependency-bearing
function must use array annotation or declare a static `$inject` property.

Each element can host only one application. Bootstrapping an element that
already has an injector throws `ng:btstrpd`.

## Auto-Bootstrap

`angular.init()` scans an element or document for `ng-app` roots. The first root
uses the current `Angular` instance. Additional roots are bootstrapped as
sub-applications and stored in `angular.subapps`.

```typescript
window.addEventListener('DOMContentLoaded', () => {
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
const injector = angular.injector(['ng', 'myApp'], true);
const $http = injector.get('$http');
```

## Publish A Standalone Custom Element

Use `defineAngularElement()` from
`@angular-wave/angular.ts/runtime/web-component` when an AngularTS feature
should ship as a native web component. The helper creates a custom runtime,
registers only the directives and services you list, defines the custom element,
and builds the injector without requiring a host page bootstrap.

Custom runtime core providers include only the compile, scope, controller,
parse, interpolation, and exception-handling services needed to render
templates. Orchestration services such as `$machine` and `$workflow` are not
part of that core set. Include the orchestration module only when a custom
runtime needs reactive state machines or workflows.

```typescript
import { createAngular } from '@angular-wave/angular.ts/runtime';
import { orchestrationModule } from '@angular-wave/angular.ts/runtime/orchestration';

const angular = createAngular({
  modules: [orchestrationModule],
});
```

Include `wasmModule` when a custom runtime loads WebAssembly or exposes
AngularTS scope state through the language-neutral WASM ABI. The bridge remains
owned by that runtime and is disposed with it.

```typescript
import { createAngular } from '@angular-wave/angular.ts/runtime';
import { wasmModule } from '@angular-wave/angular.ts/runtime/wasm';

const angular = createAngular({
  modules: [wasmModule],
});
const injector = angular.injector(['ng']);
const playerGuest = injector.get('$wasm').load({
  source: '/player.wasm',
});
const player = injector.get('$rootScope');

await playerGuest.bind(player, { name: 'player' });
player.score = 42;
```

Include `realtimeModule` for managed websocket, SSE, and WebTransport
connections without including the rest of the browser integration group.
Connection defaults still use the normal typed module configuration, and all
active connections close when the custom runtime is destroyed.

```typescript
import { createAngular } from '@angular-wave/angular.ts/runtime';
import { realtimeModule } from '@angular-wave/angular.ts/runtime/realtime';

const angular = createAngular({
  modules: [realtimeModule],
});

angular.module('app', []).config({
  $websocket: {
    defaults: { retryDelay: 500, maxRetries: 5 },
  },
});
```

Include `routerModule` when a custom runtime owns navigation. The slice includes
URL state, navigation security, route links, routed views, ARIA state, anchor
scrolling, and route-template fetching, while leaving unrelated browser and
orchestration services out of the build.

```typescript
import { createAngular } from '@angular-wave/angular.ts/runtime';
import { routerModule } from '@angular-wave/angular.ts/runtime/router';

const angular = createAngular({
  modules: [routerModule],
});

angular.module('app', []).router({
  name: 'dashboard',
  url: '/dashboard',
  template: '<dashboard-view></dashboard-view>',
});

angular.bootstrap(document.body, ['app']);
```

Include `serviceWorkerModule` for managed service-worker registration, updates,
and messaging without including the full browser integration group. The native
listeners owned by `$serviceWorker` are released when the custom runtime is
destroyed.

```typescript
import { createAngular } from '@angular-wave/angular.ts/runtime';
import { serviceWorkerModule } from '@angular-wave/angular.ts/runtime/service-worker';

const angular = createAngular({
  modules: [serviceWorkerModule],
});

angular.module('app', []).serviceWorker('/service-worker.js', {
  scope: '/app/',
  autoRegister: true,
});

const injector = angular.injector(['ng', 'app']);
const appWorker = injector.get('$serviceWorker');

appWorker.onMessage((event) => {
  console.log(event.data);
});
```

Include `webComponentModule` when a custom runtime defines scoped custom
elements directly. `defineAngularElement(...)` includes it automatically.

```typescript
import { createAngular } from '@angular-wave/angular.ts/runtime';
import { webComponentModule } from '@angular-wave/angular.ts/runtime/web-component';

const angular = createAngular({
  modules: [webComponentModule],
});
```

```typescript
import { defineAngularElement } from '@angular-wave/angular.ts/runtime/web-component';
import { ngClickDirective } from '@angular-wave/angular.ts/directives/events';

defineAngularElement('billing-summary', {
  directives: {
    ngClick: ngClickDirective,
  },
  services: {
    billingApi: BillingApi,
  },
  component: {
    shadow: true,
    inputs: {
      accountId: String,
    },
    template: `
      <button ng-click="refresh()">
        {{ accountId }} / {{ status }}
      </button>
    `,
    connected({ dispatch, injector, scope }) {
      const api = injector.get('billingApi');

      scope.status = 'ready';
      scope.refresh = () => {
        scope.status = api.status(scope.accountId);
        dispatch('billing-refresh', { status: scope.status });
      };
    },
  },
});
```

Consumers only need the bundled module and the native element:

```html
<script type="module" src="/widgets/billing-summary.js"></script>
<billing-summary account-id="acct_123"></billing-summary>
```

Inputs are DOM attributes or properties. Outputs should be `CustomEvent`s
dispatched with the `dispatch()` helper from the component context.

## Bridge External Code

`angular.emit()` and `angular.call()` evaluate expressions against an injectable
service or a named scope. The input format is `"<target>.<expression>"`.

```typescript
angular.emit('UserService.logout()');

const count = await angular.call('cartScope.items.length');
```

Use these helpers for small integration boundaries such as browser callbacks,
legacy scripts, or embedded widgets. Normal application code should prefer
dependency injection.

## Locate Named Scopes

`getScopeByName()` searches from `$rootScope` for a scope with a matching
`$scopename`.

```typescript
$scope.$scopename = 'dashboard';

const scope = angular.getScopeByName('dashboard');
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
