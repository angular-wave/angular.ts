---
title: "Form Directives and Validation in AngularTS"
weight: 270
description: "Complete guide to AngularTS form directives: ng-model, built-in validators, ng-messages, ng-model-options, and form state properties like $valid and $dirty."
---
AngularTS treats HTML forms as first-class citizens of the framework. Every `<form>` element (and `ng-form` directive) creates a `FormController` instance that tracks the aggregate validity and dirty state of all its inputs. Each input bound with `ng-model` gets its own `NgModelController` that manages the view-to-model pipeline, validation, and CSS class hooks.
## The form directive

A plain `<form>` element is enhanced by AngularTS into a `FormController`. Give the form a `name` attribute and the controller is published on the current scope under that name, giving you programmatic access to validation state.

```html
  <input type="email" name="email"
         ng-model="user.email"
         required />

  <button type="submit"
          ng-disabled="registrationForm.$invalid">
    Register
  </button>
</form>
```

```javascript
  .controller('RegistrationCtrl', function($scope) {
    $scope.register = function() {
      if ($scope.registrationForm.$valid) {
        // submit logic
      }
    };
  });
```
### FormController state properties

| Property     | Type    | Description                                                     |
| ------------ | ------- | --------------------------------------------------------------- |
| `$valid`     | boolean | `true` when all child controls are valid                        |
| `$invalid`   | boolean | `true` when any child control is invalid                        |
| `$pristine`  | boolean | `true` before any control has been changed                      |
| `$dirty`     | boolean | `true` after any control has been changed                       |
| `$submitted` | boolean | `true` after the form's submit event fires                      |
| `$error`     | object  | Keys are validator names; values are arrays of failing controls |
| `$pending`   | object  | Keys are validator names with pending async validators          |
### CSS classes on forms

AngularTS automatically toggles these classes on both the `<form>` element and each `ng-model` input:

| Class          | Applied when                         |
| -------------- | ------------------------------------ |
| `ng-pristine`  | Control has not been changed         |
| `ng-dirty`     | Control has been changed             |
| `ng-valid`     | All validators pass                  |
| `ng-invalid`   | Any validator fails                  |
| `ng-submitted` | Form has been submitted              |
| `ng-touched`   | Input has been blurred at least once |
| `ng-untouched` | Input has never been blurred         |
| `ng-pending`   | An async validator is in progress    |

```css
input.ng-invalid.ng-dirty {
  border: 2px solid #ef4444;
}

input.ng-valid.ng-dirty {
  border: 2px solid #22c55e;
}

/* Show error messages only after the form is submitted or field is touched */
.field-error {
  display: none;
}
input.ng-touched.ng-invalid ~ .field-error {
  display: block;
}
```

***
## ng-form

`ng-form` creates a nested `FormController` that tracks its own controls independently. Because browsers do not allow nested `<form>` elements, `ng-form` is the standard way to group controls into sub-sections with their own validity state.

```html
  <!-- Shipping address group -->
  <ng-form name="shippingForm">
    <input name="street" ng-model="shipping.street" required />
    <input name="city" ng-model="shipping.city" required />
    <p ng-if="shippingForm.$invalid">Please complete shipping address.</p>
  </ng-form>

  <!-- Billing address group -->
  <ng-form name="billingForm">
    <input name="street" ng-model="billing.street" required />
    <p ng-if="billingForm.$invalid">Please complete billing address.</p>
  </ng-form>

  <button ng-disabled="outerForm.$invalid">Submit</button>
</form>
```

The outer form's `$valid` is `false` if any nested `ng-form` is invalid, allowing you to check a single top-level form while still presenting granular errors per section.

***
## Input directives

All standard HTML input types are supported. For `<input>`, `<textarea>`, and `<select>` elements, AngularTS registers type-specific parsers and validators automatically when `ng-model` is present.

### Text / Email / URL

```html
<input type="text"
       name="username"
       ng-model="user.username"
       required
       minlength="3"
       maxlength="20"
       ng-pattern="/^[a-z0-9_]+$/" />

<input type="email"
       name="email"
       ng-model="user.email"
       required />

<input type="url"
       name="website"
       ng-model="user.website" />
```

### Number

```html
<input type="number"
       name="age"
       ng-model="user.age"
       min="18"
       max="120"
       required />
```

Parses the input into a JavaScript `number`. Sets `$error.number` if the value is not numeric, `$error.min` or `$error.max` if out of range.

### Checkbox

```html
<!-- Simple boolean checkbox -->
<input type="checkbox"
       name="agree"
       ng-model="user.agreedToTerms"
       required />

<!-- Custom true/false values -->
<input type="checkbox"
       ng-model="settings.mode"
       ng-true-value="'dark'"
       ng-false-value="'light'" />
```

### Radio

```html
<label>
  <input type="radio" ng-model="plan" value="free" /> Free
</label>
<label>
  <input type="radio" ng-model="plan" value="pro" /> Pro
</label>
<label>
  <input type="radio" ng-model="plan" value="enterprise" /> Enterprise
</label>
<p>Selected: {{ plan }}</p>
```

### Select

```html
<!-- Simple string options -->
<select name="country" ng-model="user.country" required>
  <option value="">-- Choose a country --</option>
  <option value="us">United States</option>
  <option value="gb">United Kingdom</option>
</select>

<!-- Object options with ng-options -->
<select ng-model="selectedRole"
        ng-options="role.id as role.label for role in roles">
  <option value="">-- Select a role --</option>
</select>
```

***
## Built-in validators
### required / ng-required

`required` makes the field mandatory. `ng-required` accepts an expression so you can make a field conditionally required.

```html

<!-- Conditionally required -->
<input type="text"
       ng-model="user.company"
       ng-required="user.accountType === 'business'" />
```

The validator calls `NgModelController.$isEmpty` on the view value. For text inputs, empty means `""`. For checkboxes, empty means `false`.
### minlength / ng-minlength

```html
       ng-model="user.password"
       ng-minlength="8" />
<p ng-if="form.password.$error.minlength">
  Password must be at least 8 characters.
</p>
```
### maxlength / ng-maxlength

```html
       ng-model="tweet.text"
       ng-maxlength="280" />
<p>{{ 280 - tweet.text.length }} characters remaining</p>
```
### pattern / ng-pattern

`pattern` accepts a regex literal (as an attribute value subject to interpolation). `ng-pattern` accepts a scope expression that evaluates to a `RegExp` object or a string.

```html
<input type="text"
       ng-model="user.phone"
       pattern="^\d{10}$" />

<!-- Dynamic pattern from scope -->
<input type="text"
       ng-model="user.code"
       ng-pattern="validationRules.codePattern" />
```

```javascript
  codePattern: /^[A-Z]{2}\d{4}$/
};
```

> **Note:** Avoid the `g` (global) flag on patterns used with `ng-pattern`. RegExp objects with the `g` flag maintain internal state between calls to `.test()`, which causes alternating pass/fail results.

***
## ng-messages

`ng-messages` simplifies displaying validation error messages. It watches a form control's `$error` object and renders the first matching `ng-message` child (or all matching, with the `multiple` attribute).

```html
  <div class="field">
    <label>Email</label>
    <input type="email"
           name="email"
           ng-model="user.email"
           required />

    <div ng-messages="signupForm.email.$error" role="alert">
      <p ng-message="required">Email address is required.</p>
      <p ng-message="email">Please enter a valid email address.</p>
    </div>
  </div>
</form>
```

By default, only the first matching error is shown. Add the `multiple` attribute to show all failing validators at once:

```html
  <p ng-message="required">Password is required.</p>
  <p ng-message="minlength">At least 8 characters required.</p>
  <p ng-message="pattern">Must contain a number and special character.</p>
</div>
```
### ng-message-default

`ng-message-default` acts as a fallback shown when none of the specific `ng-message` keys match but there is at least one truthy error:

```html
  <p ng-message="pattern">Invalid format.</p>
  <p ng-message-default>This field has an error.</p>
</div>
```
### Reusable message templates

Use `ng-messages-include` to load a shared message template file:

```html
  <div ng-messages-include="'/partials/common-messages.html'"></div>
  <p ng-message="email">Not a valid email address.</p>
</div>
```

***
## ng-model-options

`ng-model-options` controls when the model is updated and how updates are debounced. It can be placed on a form (to apply to all controls) or on individual inputs.

### Debounce

Delay model updates by a given number of milliseconds after the user stops typing:

```html
<input type="text"
       ng-model="search.query"
       ng-model-options="{ debounce: 300 }" />
```

This fires a search 300ms after the last keystroke rather than on every character.

### Update on blur

Only update the model when the input loses focus:

```html
<input type="text"
       ng-model="user.username"
       ng-model-options="{ updateOn: 'blur' }" />
```

### Combined events

Update immediately on `blur`, but also debounced on `default` (which covers all other events):

```html
<input type="text"
       ng-model="user.slug"
       ng-model-options="{
         updateOn: 'blur default',
         debounce: { 'default': 500, 'blur': 0 }
       }" />
```

### Getter/setter

When `getterSetter: true`, the `ng-model` expression is expected to be a function that both gets and sets the value:

```html
<input type="text"
       ng-model="user.getName"
       ng-model-options="{ getterSetter: true }" />
```

```javascript
let _name = 'Alice';
$scope.user = {
  getName: function(newValue) {
    if (arguments.length) {
      _name = newValue.trim();
    }
    return _name;
  }
};
```
### Available options
#### `updateOn`

- **Type:** `string`

Space-separated DOM event names that trigger model updates. Use `"default"` as a placeholder for the control's standard update event (e.g., `"input"` for text inputs).
#### `debounce`

- **Type:** `number | object`

Milliseconds to wait before committing the view value. Can be an object mapping event names to delays: `{ 'blur': 0, 'default': 500 }`.
#### `allowInvalid`

- **Type:** `boolean`

When `true`, the model is updated even when the value is invalid (normally the model is set to `undefined` when validation fails).
#### `getterSetter`

- **Type:** `boolean`

When `true`, the `ng-model` expression is treated as a function that acts as both getter and setter.
#### `timezone`

- **Type:** `string`

Timezone offset for date/time input parsing, e.g. `"UTC"` or `"+0530"`.

***
## Complete form example

The following example demonstrates a registration form with multiple input types, validators, debouncing, and `ng-messages` error display.

```html

  <!-- Username -->
  <div class="field">
    <label for="username">Username</label>
    <input id="username"
           type="text"
           name="username"
           ng-model="form.username"
           ng-model-options="{ debounce: 300 }"
           required
           ng-minlength="3"
           ng-maxlength="20"
           ng-pattern="/^[a-z0-9_]+$/" />

    <div ng-messages="regForm.username.$error"
         ng-if="regForm.username.$touched || regForm.$submitted">
      <p ng-message="required">Username is required.</p>
      <p ng-message="minlength">At least 3 characters.</p>
      <p ng-message="maxlength">No more than 20 characters.</p>
      <p ng-message="pattern">Only lowercase letters, numbers, and underscores.</p>
    </div>
  </div>

  <!-- Email -->
  <div class="field">
    <label for="email">Email</label>
    <input id="email"
           type="email"
           name="email"
           ng-model="form.email"
           required />

    <div ng-messages="regForm.email.$error"
         ng-if="regForm.email.$touched || regForm.$submitted">
      <p ng-message="required">Email is required.</p>
      <p ng-message="email">Enter a valid email address.</p>
    </div>
  </div>

  <!-- Password -->
  <div class="field">
    <label for="password">Password</label>
    <input id="password"
           type="password"
           name="password"
           ng-model="form.password"
           required
           ng-minlength="8" />

    <div ng-messages="regForm.password.$error"
         ng-if="regForm.password.$dirty">
      <p ng-message="required">Password is required.</p>
      <p ng-message="minlength">At least 8 characters required.</p>
    </div>
  </div>

  <!-- Terms acceptance -->
  <div class="field">
    <label>
      <input type="checkbox"
             name="terms"
             ng-model="form.agreedToTerms"
             required />
      I agree to the terms and conditions
    </label>
    <p ng-if="regForm.terms.$error.required && regForm.$submitted">
      You must accept the terms.
    </p>
  </div>

  <button type="submit"
          ng-disabled="regForm.$invalid && regForm.$submitted">
    Create account
  </button>
</form>
```

```javascript
  .controller('RegistrationCtrl', function($scope) {
    $scope.form = {};

    $scope.submitRegistration = function() {
      $scope.regForm.$setSubmitted();

      if ($scope.regForm.$valid) {
        // Call your API
        console.log('Registering:', $scope.form);
      }
    };
  });
```
