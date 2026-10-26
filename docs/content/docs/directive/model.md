---
title: "ng-model"
description: "Two-way data binding for form controls."
---
Binds the value of `<input>`, `<textarea>`, `<select>`, and custom controls to a scope expression.

```html
<textarea ng-model="user.bio"></textarea>
<select ng-model="user.role" ng-options="r for r in roles"></select>
<input type="checkbox" ng-model="user.active">
```
#### `ng-model`

- **Type:** `expression`
- **Required:** yes

An assignable AngularTS expression. When the user changes the input, the expression is assigned the new value. When the scope value changes, the input is updated.
### Model controller ([`NgModelController`](../../../typedoc/classes/NgModelController.html))

When `ng-model` is applied, AngularTS creates an [`NgModelController`](../../../typedoc/classes/NgModelController.html) accessible as `formName.fieldName` on the scope. It exposes:
#### `viewValue`

- **Type:** `TView | undefined`

The value as seen by the user in the input (always a string for text inputs).
#### `modelValue`

- **Type:** `TModel | undefined`

The value after parsers have run — what is stored on the scope.
#### `valid`

- **Type:** `boolean | undefined`

`true` when all validators pass.
#### `invalid`

- **Type:** `boolean | undefined`

`true` when any validator fails.
#### `pristine`

- **Type:** `boolean`

`true` until the user has interacted with this field.
#### `dirty`

- **Type:** `boolean`

`true` after the user has changed the value at least once.
#### `touched`

- **Type:** `boolean`

`true` after the field has received and lost focus.
#### `error`

- **Type:** `object`

Map of failing validator names to `true`. E.g., `{ required: true, minlength: true }`.
### Parsers and formatters

`ng-model` processes values through two pipelines:

* **Parsers** (`parsers`): Convert `viewValue` → `modelValue`. Applied on user input. Return `undefined` to mark invalid.
* **Formatters** (`formatters`): Convert `modelValue` → `viewValue`. Applied when scope value changes.

```js
angular.createModule('formsDemo', []).directive('integer', () => ({
  require: 'ngModel',
  link(scope, element, control) {
    control.parsers.push((text) => {
      const value = Number(text);
      return text !== '' && Number.isInteger(value) ? value : undefined;
    });
    control.formatters.push((value) => value === undefined ? '' : String(value));
  },
}));
```

For TypeScript custom controls, declare the model and view domains with
[`NgModelController<TModel, TView>`](../../../typedoc/classes/NgModelController.html).
Parsers return the model domain or `undefined`, formatters return the view domain,
and validators receive both domains. All form controls retain the same HTML
binding syntax.

### Asynchronous validators

Register promise-returning callbacks in `asyncValidators`. Each callback receives
`(modelValue, viewValue, { signal })`. Pass `signal` to Fetch or `$http` to stop
obsolete requests when validation restarts or the linked scope is destroyed.
Callbacks that accept only the first two arguments still work. A resolved
promise passes validation; a rejected promise fails it. Obsolete runs cannot
change validity, including when their callbacks ignore cancellation.

See the [forms guide]({{< relref "/docs/guides/forms" >}}) for typed parser,
formatter, and cancellable validation examples.
