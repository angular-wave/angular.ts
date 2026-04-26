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
### Model controller (`NgModelController`)

When `ng-model` is applied, AngularTS creates an `NgModelController` accessible as `formName.fieldName` on the scope. It exposes:
#### `$viewValue`

- **Type:** `any`

The value as seen by the user in the input (always a string for text inputs).
#### `$modelValue`

- **Type:** `any`

The value after parsers have run — what is stored on the scope.
#### `$valid`

- **Type:** `boolean`

`true` when all validators pass.
#### `$invalid`

- **Type:** `boolean`

`true` when any validator fails.
#### `$pristine`

- **Type:** `boolean`

`true` until the user has interacted with this field.
#### `$dirty`

- **Type:** `boolean`

`true` after the user has changed the value at least once.
#### `$touched`

- **Type:** `boolean`

`true` after the field has received and lost focus.
#### `$error`

- **Type:** `object`

Map of failing validator names to `true`. E.g., `{ required: true, minlength: true }`.
### Parsers and formatters

`ng-model` processes values through two pipelines:

* **Parsers** (`$parsers`): Convert `$viewValue` → `$modelValue`. Applied on user input. Return `undefined` to mark invalid.
* **Formatters** (`$formatters`): Convert `$modelValue` → `$viewValue`. Applied when scope value changes.

```javascript
  return {
    require: 'ngModel',
    link: function(scope, el, attrs, ngModel) {
      ngModel.$parsers.push(function(value) {
        var n = parseInt(value, 10);
        ngModel.$setValidity('integer', !isNaN(n));
        return isNaN(n) ? undefined : n;
      });
    }
  };
});
```
