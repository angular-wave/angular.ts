---
title: "Advanced directives: workers, WASM, channels, viewport"
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
  .controller('TodoController', function($scope) {
    $scope.title = 'My Todos';
  });
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
### `ng-ref`

Exposes a directive's controller on the parent scope under a named property. Useful for accessing child component APIs from a parent scope.

```html
<button ng-click="searchInput.$setViewValue('')">Clear</button>
```
### `ng-el`

Binds the native DOM element itself to a scope property, giving you direct access to the element reference.

```html
```

```javascript
$scope.$watch('myCanvas', function(el) {
  if (el) {
    var ctx = el.getContext('2d');
    ctx.fillRect(0, 0, 400, 300);
  }
});
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

Uses the browser's Intersection Observer API to defer content rendering until the element enters the viewport. Ideal for below-the-fold content.

```html
  <!-- loadComments() is called once when this enters the viewport -->
  <div ng-repeat="comment in comments">{{ comment.text }}</div>
</div>
```
#### `ng-viewport`

- **Type:** `expression`

Expression to evaluate when the element enters the viewport. Called once and not repeated.
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
     data-params="{ items: largeList }"
     data-on-result="sortedItems = $result">
  <div ng-repeat="item in sortedItems">{{ item.name }}</div>
</div>
```
#### `ng-worker`

- **Type:** `string`
- **Required:** yes

Path to the Web Worker JavaScript file.
#### `data-params`

- **Type:** `expression`

Data to pass to the worker as the message payload.
#### `data-on-result`

- **Type:** `expression`

Expression evaluated when the worker posts a result. `$result` contains the worker's response.
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

Loads a WebAssembly module and makes its exports available on scope.

```html
  <p>Result: {{ math.add(3, 4) }}</p>
</div>
```
#### `ng-wasm`

- **Type:** `string`
- **Required:** yes

Path to the `.wasm` file to load.
#### `as`

- **Type:** `string`

Scope property name to assign the WASM exports object to. Defaults to `wasm`.
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

The `$aria` service and `$ariaProvider` let you configure which ARIA attributes are automatically managed:

```javascript
  $ariaProvider.config({
    ariaDisabled: true,
    ariaChecked: true,
    ariaReadonly: true,
    ariaRequired: true,
    ariaHidden: true,
    ariaValue: true,
    tabindex: true
  });
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
