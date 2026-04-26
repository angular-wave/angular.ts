---
title: "Form directives"
description: "API reference for form, ng-form, validation, and ng-messages directives."
---
AngularTS enhances native HTML forms with a form controller that tracks validity and user interaction state. The `form` and `ng-form` directives attach this controller to the scope, and the built-in validators populate it automatically.
## form / ng-form

A plain `<form>` element with a `name` attribute creates a `FormController` on the current scope. `ng-form` does the same but can be used on non-form elements or for nested forms.

```html
  <input name="email" ng-model="user.email" required type="email">
  <button type="submit" ng-disabled="registrationForm.$invalid">Register</button>
</form>
```

The `name` attribute (here `registrationForm`) is the scope property under which the controller is available.
### FormController properties
#### `$valid`

- **Type:** `boolean`

`true` when all child controls are valid.
#### `$invalid`

- **Type:** `boolean`

`true` when any child control is invalid.
#### `$pristine`

- **Type:** `boolean`

`true` until any control has been changed.
#### `$dirty`

- **Type:** `boolean`

`true` after any control has been changed.
#### `$submitted`

- **Type:** `boolean`

`true` after the form has been submitted at least once.
#### `$pending`

- **Type:** `object`

Map of pending async validators. Empty object when none are pending.
#### `$error`

- **Type:** `object`

Map of validator names to arrays of controls that are failing that validator. E.g., `{ required: [ctrl1], email: [ctrl2] }`.
### FormController methods
#### `$setPristine()`

- **Type:** `function`

Resets the form and all controls to pristine state. Useful after a successful save.
#### `$setUntouched()`

- **Type:** `function`

Resets the `$touched` state of all controls.
#### `$setSubmitted()`

- **Type:** `function`

Marks the form as submitted programmatically.
## Built-in validators

Apply validators as attributes on `<input>`, `<textarea>`, or `<select>` elements. When validation fails, the validator's name appears in `$error`.
#### `required`

- **Type:** `none`

The field must have a non-empty value. Alias: `ng-required="expression"` for conditional requirement.
#### `minlength`

- **Type:** `number`

Minimum number of characters. Alias: `ng-minlength="expression"`.
#### `maxlength`

- **Type:** `number`

Maximum number of characters. Alias: `ng-maxlength="expression"`.
#### `pattern`

- **Type:** `string`

JavaScript regex pattern the value must match. Alias: `ng-pattern="expression"`.
#### `min`

- **Type:** `number`

Minimum value for `type="number"` or `type="date"` inputs.
#### `max`

- **Type:** `number`

Maximum value for `type="number"` or `type="date"` inputs.
#### `type`

- **Type:** `string`

HTML input type. AngularTS adds validators for `email`, `url`, `number`, `date`, `time`, `week`, `month`, `datetime-local`.

```html
  <input name="username"
         ng-model="user.username"
         required
         minlength="3"
         maxlength="20"
         pattern="[a-zA-Z0-9_]+">

  <input name="age"
         ng-model="user.age"
         type="number"
         ng-min="18"
         ng-max="120">
</form>
```
## ng-messages / ng-message

Display validation error messages tied to a field's `$error` object.

```html
  <div ng-message="required">Email is required.</div>
  <div ng-message="email">Please enter a valid email address.</div>
  <div ng-message-default>This field has an error.</div>
</div>
```
#### `ng-messages`

- **Type:** `expression`
- **Required:** yes

Expression pointing to an `$error` object (typically `formName.fieldName.$error`).
#### `ng-messages-multiple`

- **Type:** `none`

By default, only the first matching message is shown. Add this attribute to show all matching messages simultaneously.
#### `ng-message`

- **Type:** `string`
- **Required:** yes

The validator key to match against the `$error` object. Shown when `$error[key]` is truthy.
#### `ng-message-exp`

- **Type:** `expression`

Same as `ng-message` but evaluates an expression rather than a string literal.
#### `ng-message-default`

- **Type:** `none`

Shown when no other `ng-message` matches. Useful as a generic fallback.
## Complete form example

```html
  <div>
    <label>Email</label>
    <input name="email" type="email" ng-model="user.email" required>
    <div ng-messages="signupForm.email.$error" ng-show="signupForm.email.$dirty">
      <div ng-message="required">Required.</div>
      <div ng-message="email">Invalid email format.</div>
    </div>
  </div>

  <div>
    <label>Password</label>
    <input name="password" type="password" ng-model="user.password"
           required minlength="8">
    <div ng-messages="signupForm.password.$error" ng-show="signupForm.password.$dirty">
      <div ng-message="required">Required.</div>
      <div ng-message="minlength">Must be at least 8 characters.</div>
    </div>
  </div>

  <button type="submit" ng-disabled="signupForm.$invalid">Sign Up</button>

</form>
```
