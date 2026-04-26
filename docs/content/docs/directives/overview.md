---
title: "AngularTS Directives: Complete Overview Guide"
weight: 290
description: "Learn how AngularTS directives work, explore all built-in directive categories, and discover how to create custom directives with the ng- prefix."
---
Directives are the primary mechanism by which AngularTS attaches behaviour and structure to HTML. A directive is a marker on a DOM element — an attribute, element name, class, or comment — that tells AngularTS's compiler (`$compile`) to attach a specified behaviour to that element or transform it and its children.

Every built-in directive in AngularTS is applied as an HTML attribute using the `ng-` prefix. When the compiler processes the DOM, it matches these attributes against registered directive definitions and executes their `link` or `compile` functions to wire up watchers, event listeners, transclusion, and scope inheritance.
## How directives are applied

Directives are identified during compilation by the `restrict` option:

* **`"A"` (attribute)** — the most common form. Applied as `ng-bind="expr"`.
* **`"E"` (element)** — used when the directive represents a standalone component, such as `<form>`.
* **`"EA"` (element or attribute)** — supports both forms, as seen with `ng-form`.

Directives that operate as attributes keep the existing element in place and augment it. The `ng-` prefix is normalized: the compiler converts `ng-bind`, `data-ng-bind`, and `x-ng-bind` to the same canonical form `ngBind`.
## Directive categories

AngularTS organises its built-in directives into four main groups based on their purpose.

#### [Structural]({{< relref "/docs/directives/structural" >}})

Alter the DOM layout by adding, removing, or repeating elements. Include `ng-if`, `ng-repeat`, `ng-show`, `ng-hide`, `ng-switch`, and `ng-include`.

#### [Data Binding]({{< relref "/docs/directives/data-binding" >}})

Synchronise data between the scope and the view. Include `ng-bind`, `ng-bind-html`, `ng-model`, `ng-class`, `ng-style`, and `ng-init`.

#### [Event]({{< relref "/docs/directives/advanced" >}})

Evaluate scope expressions in response to DOM events. Include `ng-click`, `ng-submit`, `ng-keydown`, `ng-focus`, `ng-blur`, and 15 others.

#### [Form]({{< relref "/docs/directives/forms" >}})

Integrate with form validation. Include `ng-model`, built-in validators, `ng-messages`, and `ng-model-options`.
## All built-in directives

The table below lists every directive registered in the `ng` module (`src/ng.ts`).

| Directive             | Category       | Description                                                           |
| --------------------- | -------------- | --------------------------------------------------------------------- |
| `ng-bind`             | Data binding   | One-way text binding from scope to element                            |
| `ng-bind-html`        | Data binding   | Bind trusted HTML into an element's `innerHTML`                       |
| `ng-bind-template`    | Data binding   | Interpolate a template string containing multiple `{{ }}` expressions |
| `ng-model`            | Form / Binding | Two-way data binding between scope and form input                     |
| `ng-model-options`    | Form           | Configure debounce, `updateOn` events, and getter/setter mode         |
| `ng-if`               | Structural     | Conditionally add or remove a DOM element                             |
| `ng-show`             | Structural     | Toggle visibility by adding/removing `ng-hide` class                  |
| `ng-hide`             | Structural     | Toggle visibility — inverse of `ng-show`                              |
| `ng-repeat`           | Structural     | Repeat a template for each item in a collection                       |
| `ng-switch`           | Structural     | Switch between exclusive child blocks                                 |
| `ng-switch-when`      | Structural     | Declare a case block inside `ng-switch`                               |
| `ng-switch-default`   | Structural     | Fallback block inside `ng-switch`                                     |
| `ng-include`          | Structural     | Load and compile an external template                                 |
| `ng-class`            | Attribute      | Conditionally apply CSS classes                                       |
| `ng-class-even`       | Attribute      | Apply classes on even-indexed `ng-repeat` rows                        |
| `ng-class-odd`        | Attribute      | Apply classes on odd-indexed `ng-repeat` rows                         |
| `ng-style`            | Attribute      | Apply inline CSS properties from a scope object                       |
| `ng-init`             | Attribute      | Evaluate an expression during the pre-link phase                      |
| `ng-controller`       | Attribute      | Attach a controller to a DOM section and create a child scope         |
| `ng-ref`              | Attribute      | Get a reference to a directive's controller                           |
| `ng-el`               | Attribute      | Expose the raw DOM element on `scope.$target`                         |
| `ng-channel`          | Advanced       | Subscribe to a pub/sub event channel                                  |
| `ng-viewport`         | Advanced       | Evaluate expressions when element enters or leaves the viewport       |
| `ng-worker`           | Advanced       | Run a Web Worker and bind results to scope                            |
| `ng-wasm`             | Advanced       | Load a WebAssembly module and expose its exports on scope             |
| `ng-inject`           | Advanced       | Inject named services directly onto the scope                         |
| `ng-scope`            | Advanced       | Mark a named scope boundary                                           |
| `ng-cloak`            | Attribute      | Hide the element until AngularTS finishes compiling                   |
| `ng-non-bindable`     | Structural     | Prevent interpolation inside a section                                |
| `ng-transclude`       | Attribute      | Insertion point for transcluded content                               |
| `ng-get`              | HTTP           | Declarative GET request on event                                      |
| `ng-post`             | HTTP           | Declarative POST request on event                                     |
| `ng-put`              | HTTP           | Declarative PUT request on event                                      |
| `ng-delete`           | HTTP           | Declarative DELETE request on event                                   |
| `ng-sse`              | HTTP           | Subscribe to a Server-Sent Events stream                              |
| `ng-animate-swap`     | Animation      | Animate between values using enter/leave                              |
| `ng-animate-children` | Animation      | Coordinate child element animations                                   |
| `ng-messages`         | Form           | Container for validation message display                              |
| `ng-message`          | Form           | Show a message when a specific error key is truthy                    |
| `ng-message-default`  | Form           | Fallback message when no specific key matches                         |
| `ng-click`            | Event          | Evaluate expression on click                                          |
| `ng-submit`           | Event          | Evaluate expression on form submit                                    |
| `ng-change`           | Event          | Evaluate expression on change                                         |
| `ng-keydown`          | Event          | Evaluate expression on keydown                                        |
| `ng-keyup`            | Event          | Evaluate expression on keyup                                          |
| `ng-focus`            | Event          | Evaluate expression on focus                                          |
| `ng-blur`             | Event          | Evaluate expression on blur                                           |
| `ng-mouseenter`       | Event          | Evaluate expression on mouseenter                                     |
| `ng-mouseleave`       | Event          | Evaluate expression on mouseleave                                     |
## Creating a custom directive

Custom directives are registered on a module using `.directive(name, factory)`. The factory function returns a directive definition object (DDO).

```javascript
  .directive('highlight', function() {
    return {
      restrict: 'A',           // attribute only
      scope: {
        color: '@highlight'   // isolate scope binding
      },
      link(scope, element) {
        element.style.backgroundColor = scope.color || 'yellow';

        scope.$watch('color', (newColor) => {
          element.style.backgroundColor = newColor || 'yellow';
        });
      }
    };
  });
```

```html
```
### Directive definition object (DDO) options
#### `restrict`

- **Type:** `string`
- **Default:** `EA`

Controls how the directive is matched: `"A"` (attribute), `"E"` (element), `"C"` (class), or any combination such as `"EA"`.
#### `scope`

- **Type:** `boolean | object`

When `true`, creates a new child scope. When an object, creates an isolate scope with bindings: `@` (one-way string), `=` (two-way), `&` (expression), `<` (one-way data).
#### `controller`

- **Type:** `function | string`

A constructor function or the string `"@"` (use the controller named in `ng-controller`). Shared with `require`-d sibling directives.
#### `require`

- **Type:** `string | string[]`

Require another directive's controller. Prefix with `^` to search ancestors, `?` to make optional. E.g. `"^form"` requires the nearest parent form controller.
#### `link`

- **Type:** `function`

Post-link function called after the element and all its children are linked. Signature: `link(scope, element, attrs, ctrl, transclude)`.
#### `compile`

- **Type:** `function`

Called once during compilation before any instances are linked. Return value is the link function or an object with `pre` and `post` link functions.
#### `priority`

- **Type:** `number`
- **Default:** `0`

Higher-priority directives run first. `ng-repeat` uses 1000, `ng-if` uses 600, `ng-controller` uses 500.
#### `terminal`

- **Type:** `boolean`

When `true`, lower-priority directives on the same element are not executed. Used by `ng-repeat` and `ng-if`.
#### `transclude`

- **Type:** `boolean | string`

`true` transclude the element's content; `"element"` transclude the element itself (used by structural directives).
#### `template`

- **Type:** `string | function`

Inline template string to replace the directive element's content.
#### `templateUrl`

- **Type:** `string | function`

URL of the template to load asynchronously from the template cache or network.
## Priority and execution order

When multiple directives appear on the same element they are sorted by `priority` (descending). Directives with equal priority execute in registration order. This matters when one directive sets up the DOM structure that another depends on.

```html
<li ng-repeat="item in items" ng-class="{ active: item.selected }">
  {{ item.name }}
</li>
```

> **Note:** `ng-if` (priority 600) and `ng-repeat` (priority 1000) both set `terminal: true`, which prevents lower-priority directives on the same element from compiling until the structural directive has resolved the actual DOM node to link.
## Next steps

#### [Data Binding]({{< relref "/docs/directives/data-binding" >}})

`ng-bind`, `ng-model`, `ng-class`, `ng-style`, and more.

#### [Structural Directives]({{< relref "/docs/directives/structural" >}})

`ng-if`, `ng-repeat`, `ng-switch`, `ng-include`.

#### [Form Directives]({{< relref "/docs/directives/forms" >}})

Form validation, `ng-messages`, and input controls.

#### [HTTP Directives]({{< relref "/docs/directives/http" >}})

Declarative `ng-get`, `ng-post`, `ng-sse`, and friends.
