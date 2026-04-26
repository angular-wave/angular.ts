---
title: "ng-model-options"
description: "Configure update timing and validation behavior for ng-model."
---
Configures how and when `ng-model` reads and writes its value.

```html
```
#### `updateOn`

- **Type:** `string`

Space-separated list of DOM events that trigger a model update. Default is `'default'` (uses the element's natural update event). Common values: `'blur'`, `'change'`, `'keyup'`, `'default'`.

```html
<!-- Only update on blur -->
<input ng-model="name" ng-model-options="{ updateOn: 'blur' }">

<!-- Update on both blur and custom event -->
<input ng-model="name" ng-model-options="{ updateOn: 'blur myEvent' }">
```
#### `debounce`

- **Type:** `number | object`

Milliseconds to wait after the last change before updating the model. Can be a number (applies to all events) or an object mapping event names to delays.

```html
<!-- 300ms debounce for all events -->
<input ng-model="search" ng-model-options="{ debounce: 300 }">

<!-- Different debounce per event -->
<input ng-model="search" ng-model-options="{ debounce: { default: 300, blur: 0 } }">
```
#### `allowInvalid`

- **Type:** `boolean`

When `true`, the model is updated even when validators fail. Default is `false` (model is set to `undefined` on invalid input).
#### `getterSetter`

- **Type:** `boolean`

When `true`, the `ng-model` expression is treated as a getter/setter function rather than a plain property. The function is called with no arguments to get and with the new value to set.

```javascript
$scope.getUser = function(newVal) {
  if (arguments.length) { _user = newVal; }
  return _user;
};
```

```html
<input ng-model="getUser" ng-model-options="{ getterSetter: true }">
```
#### `time
