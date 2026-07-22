---
title: "Advanced directives: workers, WASM, channels, viewport"
linkTitle: "Advanced"
weight: 240
description: "AngularTS advanced directives for Web Workers, WebAssembly, lazy loading, event channels, DOM references, and accessibility — all declarative in HTML."
---
AngularTS ships several advanced directives that expose modern browser APIs — Web Workers, WebAssembly, Intersection Observer, and custom event channels — directly in HTML without requiring JavaScript. These directives are registered as part of the core `ng` module and are available in every AngularTS application.
## Controller and scope directives
### `ng-controller`

Attaches a controller function to a section of the DOM, creating a new child scope populated by the controller.

```html
  <p>{{ ctrl.title }}</p>
</div>
```

```javascript
  .controller('TodoController', ['$scope', function($scope) {
    $scope.title = 'My Todos';
  }]);
```
### `ng-scope`

Marks an explicit scope boundary. Useful for isolating a section of the page without a controller.

```html
  <p>Hello {{ user.name }}</p>
</div>
```
### `ng-init`

Initializes scope variables inline in the template. Best suited for simple one-off values or prototyping.

```html
  Hello {{ name }}, count is {{ count }}
</div>
```

> **Tip:** Prefer controllers or services over `ng-init` for any real application logic. `ng-init` is ideal for zero-JS demos and quick prototypes.
## DOM reference directives
### `ng-el`

Use `ng-el` when you only need the native DOM element. It is the simple DOM
reference API and is usually the clearest choice for canvas, focus management,
layout measurement, and pointer-driven UI.

```html
<section ng-controller="BoardController as $ctrl">
  <canvas ng-el="$ctrl.boardEl"></canvas>
</section>
```

```javascript
function BoardController() {
  this.boardEl = null;
}
```

`ng-el="$ctrl.boardEl"` stores the element on the controller. Use this form
with controller-as syntax.

For simple scope shorthand, pass a bare name:

```html
<canvas ng-el="boardEl"></canvas>
```

If the value is omitted, AngularTS uses the element `id`.

```html
<canvas id="board" ng-el></canvas>
```

### `ng-ref`

Use `ng-ref` when you need a component or directive controller reference, or
when you need to assign the reference to a full expression such as
`$ctrl.child`.

```html
<search-box ng-ref="$ctrl.search"></search-box>
<button ng-click="$ctrl.search.clear()">Clear</button>
```

By default, `ng-ref` reads the component or element-directive controller when
one exists, and falls back to the DOM element.

`ng-ref-read` is not a standalone directive. It only changes what `ng-ref`
assigns.

```html
<canvas ng-ref="$ctrl.boardEl" ng-ref-read="$element"></canvas>
<my-widget ng-ref="$ctrl.resizeHandle" ng-ref-read="resizeHandle"></my-widget>
```

Use `ng-ref-read="$element"` only when you specifically need the DOM element
through an assignable expression. For the common DOM-only case, prefer `ng-el`.

```javascript
function BoardController() {
  this.boardEl = null;
}
```
## Event and communication directives
### `ng-channel`

Subscribes to a named event channel (backed by `$eventBus`). When an event is published on the channel, the expression is evaluated.

```html
  Latest: {{ lastNotification }}
</div>
```
### `ng-listener`

Attaches a DOM event listener to the element using the native `addEventListener` API — without the overhead of Angular's event directive wiring.

```html
  Scroll-tracked content
</div>
```
### `ng-inject`

Injects a named service directly into the scope, making it accessible in the template without a controller.

```html
  <!-- $http is now available in this scope -->
</div>
```
## Lazy loading and performance
### `ng-viewport`

Uses the browser's Intersection Observer API to run expressions when an element
enters or leaves the viewport. Ideal for below-the-fold loading, lazy request
triggers, analytics markers, and canvas/chart initialization.

```html
<div
  ng-viewport
  on-enter="loadComments($entry)"
  on-leave="visible = false"
  data-viewport-threshold="0.5"
  data-viewport-margin="200px 0px"
>
  <div ng-repeat="comment in comments">{{ comment.text }}</div>
</div>
```

Use `data-viewport-once` when the enter expression should run only once:

```html
<div ng-viewport data-viewport-once on-enter="loadOnce($entry)"></div>
```

#### `ng-viewport`

- **Type:** marker attribute

Supported attributes:

| Attribute                  | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `on-enter`                 | Expression evaluated when the element intersects the viewport.    |
| `on-leave`                 | Expression evaluated when the element stops intersecting.         |
| `data-viewport-threshold`  | Intersection threshold, such as `0.5` or `0, 0.5, 1`.             |
| `data-viewport-margin`     | Root margin passed to IntersectionObserver, such as `200px 0px`.  |
| `data-viewport-once`       | Disconnects the observer after the first enter callback.          |

`on-enter` and `on-leave` receive `$entry` and `$entries` locals from the
Intersection Observer callback.

### `ng-cloak`

Prevents the browser from briefly displaying uncompiled template syntax (`{{ }}`) before AngularTS bootstraps. Add to the root element or any element with interpolation.

```html

<div ng-cloak>
  <p>Hello {{ user.name }}</p>
</div>
```

> **Note:** Always include the CSS rule `[ng-cloak] { display: none; }` in your stylesheet when using `ng-cloak`.
## Web Workers and WebAssembly
### `ng-worker`

Runs a JavaScript file in a Web Worker and binds the result back to scope. The worker communicates via `postMessage`.

```html
<div
  ng-worker="/workers/sort.js"
  data-params="{ items: largeList }"
  on-result="sortedItems = $result"
>
  <div ng-repeat="item in sortedItems">{{ item.name }}</div>
</div>
```
#### `ng-worker`

- **Type:** `string`
- **Required:** yes

Path to the Web Worker JavaScript file.

Use an empty `ng-worker` with `data-handle="name"` to reuse a worker registered
through `app.worker(name, script)`. Shared handles are application-owned rather
than terminated with the directive scope.
#### `data-params`

- **Type:** `expression`

Data to pass to the worker as the message payload.
#### `on-result`

- **Type:** `expression`

Expression evaluated when the worker posts a result. `$result` contains the worker's response.

Worker results are not inserted as HTML when this expression is absent.

#### `data-request`

- **Type:** `boolean data attribute`

Use the standard correlated request protocol instead of consuming every stream
message. This is the preferred mode for shared workers.
#### `interval`

- **Type:** `number`

Re-send the params to the worker on a millisecond interval.
#### `throttle`

- **Type:** `number`

Throttle worker invocations to at most once per N milliseconds.

The worker file uses standard `onmessage` / `postMessage`:

```javascript
  var sorted = e.data.items.slice().sort((a, b) => a.name.localeCompare(b.name));
  postMessage(sorted);
};
```
### `ng-wasm`

Loads a WebAssembly module and makes its `WasmResource` available on scope.

```html
<div ng-wasm src="/wasm/math.wasm" as="math"></div>
<p>
  Result:
  {{ math.status === 'ready' ? math.exports.add(3, 4) : 'Loading...' }}
</p>
```
#### `ng-wasm`

- **Type:** `string`
- **Required:** yes

Path to the `.wasm` file to load.
#### `as`

- **Type:** `string`

Scope property name to assign the `WasmResource` to. Defaults to `wasm`.
The reserved object keys `__proto__`, `constructor`, and `prototype` are
rejected.
## Transclusion
### `ng-transclude`

Used inside custom directive templates to mark where transcluded content should be inserted.

```javascript
  return {
    transclude: true,
    template: '<div class="panel"><ng-transclude></ng-transclude></div>'
  };
});
```

```html
  <p>This content is transcluded into the panel.</p>
</my-panel>
```
## Non-bindable sections
### `ng-non-bindable`

Prevents AngularTS from compiling or interpolating a subtree. Use this for displaying raw Angular syntax as documentation or code examples.

```html
  {{ this will not be interpolated }}
  ng-repeat="item in items"
</pre>
```
## Aria directives

AngularTS automatically manages ARIA attributes for accessibility. These directives are applied alongside their functional counterparts:

| Directive             | ARIA attribute managed |
| --------------------- | ---------------------- |
| `ng-disabled`         | `aria-disabled`        |
| `ng-checked`          | `aria-checked`         |
| `ng-readonly`         | `aria-readonly`        |
| `ng-required`         | `aria-required`        |
| `ng-show` / `ng-hide` | `aria-hidden`          |
| `ng-model`            | `aria-value*`, role    |

The `$aria` service and module config let you configure which ARIA attributes
are automatically managed:

```javascript
angular.module('app', []).config({
  $aria: {
    ariaDisabled: true,
    ariaChecked: true,
    ariaReadonly: true,
    ariaRequired: true,
    ariaHidden: true,
    ariaValue: true,
    tabindex: true,
  },
});
```
## Event directives

AngularTS generates event directives for all common DOM events. They all follow the `ng-<eventname>="expression"` pattern:

| Directive       | DOM event           |
| --------------- | ------------------- |
| `ng-click`      | `click`             |
| `ng-dblclick`   | `dblclick`          |
| `ng-focus`      | `focus`             |
| `ng-blur`       | `blur`              |
| `ng-keydown`    | `keydown`           |
| `ng-keyup`      | `keyup`             |
| `ng-keypress`   | `keypress`          |
| `ng-mouseenter` | `mouseenter`        |
| `ng-mouseleave` | `mouseleave`        |
| `ng-mousemove`  | `mousemove`         |
| `ng-mouseover`  | `mouseover`         |
| `ng-mousedown`  | `mousedown`         |
| `ng-mouseup`    | `mouseup`           |
| `ng-submit`     | `submit` (on forms) |
| `ng-cut`        | `cut`               |
| `ng-copy`       | `copy`              |
| `ng-paste`      | `paste`             |
| `ng-load`       | `load`              |
| `ng-on`         | custom event name   |

The expression is evaluated in the current scope. `$event` refers to the native DOM event object:

```html
<input ng-keydown="$event.key === 'Enter' && submit()">
```

Event policy can be declared once on the same element and applies to every `ng-on-*` or generated event directive on that element:

```html
<div
  ng-on-pointerdown="$ctrl.startDrag($event)"
  data-event-prevent
  data-event-capture>
</div>
```

Supported policy attributes:

| Attribute             | Behavior                                      |
| --------------------- | --------------------------------------------- |
| `data-event-prevent`  | Calls `$event.preventDefault()` first         |
| `data-event-stop`     | Calls `$event.stopPropagation()` first        |
| `data-event-capture`  | Registers the listener with `capture: true`   |
| `data-event-once`     | Registers the listener with `once: true`      |
| `data-event-passive`  | Registers the listener with `passive: true`   |

`data-event-passive` cannot be combined with `data-event-prevent`, because passive listeners cannot cancel default browser behavior.

`ng-pointer-capture` can be combined with `ng-on-pointer*` handlers for game and board interactions that need reliable pointer streams:

```html
<div
  ng-pointer-capture
  ng-on-pointerdown="$ctrl.startDrag($event)"
  ng-on-pointermove="$ctrl.drag($event)"
  ng-on-pointerup="$ctrl.drop($event)"
  data-event-prevent>
</div>
```
