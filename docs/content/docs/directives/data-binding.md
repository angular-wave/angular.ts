---
title: "Data Binding Directives in AngularTS Explained"
weight: 260
description: "Explore ng-bind, ng-bind-html, ng-model, ng-class, ng-style, and ng-init with real examples covering one-way and two-way data binding."
---
Data binding directives synchronise values between the scope and the DOM without requiring you to write event listeners or DOM queries by hand. AngularTS provides one-way and two-way binding variants to cover every use case, from safe text output to full form synchronisation.
## ng-bind

`ng-bind` is the attribute equivalent of double-curly interpolation (`{{ }}`). It watches the given scope expression and writes the result as the element's `textContent`. Because it sets `textContent`, it is immune to XSS — no HTML is ever parsed.

```html
<p>Hello, {{ user.name }}!</p>

<!-- Using ng-bind — element is empty until AngularTS compiles -->
<p>Hello, <span ng-bind="user.name"></span>!</p>
```

The implementation watches the expression on every digest. The `lazy` attribute defers the first watch until a digest is explicitly triggered:

```html
<span ng-bind="heavyExpression" lazy></span>
```

> **Tip:** Prefer `ng-bind` over `{{ }}` in the `<body>` of server-rendered pages to avoid the flash of uncompiled template (FOUC). The element starts empty and is filled when Angular bootstraps.
### Parameters
#### `ng-bind`

- **Type:** `expression`
- **Required:** yes

Any AngularTS expression. The result is converted to a string via `stringify()` and written to `element.textContent`. `null` and `undefined` render as an empty string.

***
## ng-bind-template

`ng-bind-template` lets you embed multiple interpolated expressions inside a single attribute value — useful when the surrounding text cannot hold a child element.

```html
<title ng-bind-template="{{pageTitle}} — {{siteName}}"></title>

<!-- Equivalent using child elements (not possible inside <title>) -->
```

The directive uses `attr.$observe` to watch the already-interpolated string; Angular re-evaluates the interpolation on each digest and writes the result to `textContent`.

```html
```
#### `ng-bind-template`

- **Type:** `string with {{ }} expressions`
- **Required:** yes

A string literal containing one or more `{{ expression }}` placeholders. The entire interpolated string is written to `textContent`.

***
## ng-bind-html

`ng-bind-html` inserts the expression result directly into `element.innerHTML`. Use this directive when you need to render server-provided or pre-sanitised markup. It calls `$parse` during compilation to check for interpolation errors, then watches the expression and sets `innerHTML` on every change.

```html
<div ng-bind-html="article.body"></div>
```

```javascript
  .controller('ArticleCtrl', function($scope) {
    $scope.article = {
      body: '<p>Hello <strong>world</strong></p>'
    };
  });
```

> **Warning:** `ng-bind-html` sets `innerHTML` directly. Always sanitise content on the server before placing it in scope. Avoid interpolating raw user input with this directive.
#### `ng-bind-html`

- **Type:** `expression`
- **Required:** yes

An expression evaluating to a string of HTML. The string is written to `element.innerHTML`. `null` and `undefined` clear the element.

***
## ng-model

`ng-model` establishes a two-way binding between a form input and a scope property. Changes to the input update the scope; changes to the scope property update the input. It is the backbone of AngularTS form handling.

### Text input

```html
<input type="text" ng-model="user.name" />
<p>Hello, {{ user.name }}!</p>
```

### Checkbox

```html
<input type="checkbox" ng-model="settings.notifications" />
<p ng-bind="settings.notifications ? 'On' : 'Off'"></p>
```

### Select

```html
<select ng-model="selected.country">
  <option value="us">United States</option>
  <option value="gb">United Kingdom</option>
</select>
<p>You selected: {{ selected.country }}</p>
```

### Textarea

```html
<textarea ng-model="message.body" rows="4"></textarea>
<p>Characters: {{ message.body.length }}</p>
```

`ng-model` creates an `NgModelController` instance that manages:

* **`$viewValue`** — the formatted value shown in the control (always a string for native inputs)
* **`$modelValue`** — the parsed value stored in the scope
* **`$parsers`** — pipeline from view to model (view → model transformation)
* **`$formatters`** — pipeline from model to view (model → view transformation)
* **`$validators`** — synchronous validator functions keyed by error name
* **`$asyncValidators`** — async validator functions that return Promises
* **`$error`** — object whose keys are failing validator names
### State properties

| Property     | Type    | Description                                             |
| ------------ | ------- | ------------------------------------------------------- |
| `$pristine`  | boolean | `true` if the user has not interacted with this control |
| `$dirty`     | boolean | `true` after the user has changed the value             |
| `$touched`   | boolean | `true` after the control has lost focus                 |
| `$untouched` | boolean | `true` before the control has ever been blurred         |
| `$valid`     | boolean | `true` if all validators pass                           |
| `$invalid`   | boolean | `true` if any validator fails                           |
### CSS classes

AngularTS automatically toggles CSS classes on the element:

```css
.ng-valid { border-color: green; }

/* Applied when the model is invalid */
.ng-invalid { border-color: red; }

/* Applied when the user has not yet changed the value */
.ng-pristine { }

/* Applied once the user has changed the value */
.ng-dirty { }

/* Applied once the input has been blurred */
.ng-touched { }
```
#### `ng-model`

- **Type:** `expression`
- **Required:** yes

An assignable AngularTS expression. The expression must be assignable (pointing to a scope property), otherwise AngularTS throws an `ngModel:nonassign` error.

***
## ng-class

`ng-class` conditionally adds and removes CSS classes based on a scope expression. It supports three input formats: an object, an array, or a string.

### Object syntax

Keys are class names; values are expressions. A class is applied when its value is truthy.

```html
<div ng-class="{ active: isActive, 'text-danger': hasError }">
  Status panel
</div>
```

```javascript
$scope.isActive = true;
$scope.hasError = false;
// Result: class="active"
```

### Array syntax

Each element is evaluated as a class name or object. Useful when combining static and conditional classes.

```html
<div ng-class="[baseClass, { highlighted: isSelected }]">
  Item
</div>
```

```javascript
$scope.baseClass = 'card';
$scope.isSelected = true;
// Result: class="card highlighted"
```

### String syntax

The expression evaluates to a space-separated class string.

```html
<div ng-class="currentTheme">
  Themed content
</div>
```

```javascript
$scope.currentTheme = 'theme-dark compact';
// Result: class="theme-dark compact"
```

The implementation uses reference counting internally (`digestClassCounts`) so that when multiple `ng-class` directives compete on the same element, classes are not prematurely removed while still in use.
### ng-class-even / ng-class-odd

These variants apply classes only to even- or odd-indexed rows inside an `ng-repeat`.

```html
  <li ng-repeat="item in items"
      ng-class-even="'row-even'"
      ng-class-odd="'row-odd'">
    {{ item.name }}
  </li>
</ul>
```
#### `ng-class`

- **Type:** `string | object | array`
- **Required:** yes

* **String** — a space-delimited list of class names.
* **Object** — keys are class names, values are truthy/falsy conditions.
* **Array** — each element is recursively processed using the above rules.

***
## ng-style

`ng-style` watches a scope object and applies its key-value pairs as inline CSS properties using `element.style.setProperty`. When the expression changes, the old properties are first removed before the new ones are applied.

```html
<div ng-style="boxStyles">
  Dynamic box
</div>
```

```javascript
  'background-color': '#4f46e5',
  'color': '#ffffff',
  'padding': '16px',
  'border-radius': '8px'
};
```

```html
<p ng-style="{ 'font-size': fontSize + 'px', 'font-weight': isBold ? 'bold' : 'normal' }">
  Styled text
</p>
```

> **Note:** CSS property names must use hyphen-case (`background-color`, not `backgroundColor`) since the implementation calls `element.style.setProperty` rather than assigning to `element.style[key]`.
#### `ng-style`

- **Type:** `object`
- **Required:** yes

An expression evaluating to an object where keys are CSS property names in hyphen-case and values are CSS value strings. Setting the expression to `null` or `undefined` removes all previously applied inline styles.

***
## ng-init

`ng-init` evaluates an expression during the pre-link phase — before child directives are linked. It is most useful for initialising scope variables inline without requiring a separate controller.

```html
<div ng-init="count = 0; title = 'Hello'">
  <button ng-click="count = count + 1">Clicked {{ count }} times</button>
</div>
```

```html
<ul>
  <li ng-repeat="item in items" ng-init="pos = $index + 1">
    {{ pos }}. {{ item.name }}
  </li>
</ul>
```

The implementation checks whether a controller is present on the element (via `getController`) and, if so, evaluates the expression on the controller's scope. Otherwise it falls back to the current scope.

> **Warning:** Use `ng-init` sparingly. For any non-trivial initialisation, use a controller instead. Keeping logic in templates makes it harder to test and maintain.
#### `ng-init`

- **Type:** `expression`
- **Required:** yes

An AngularTS expression or semicolon-separated list of expressions evaluated once in the pre-link phase. The expression has access to the current scope.
