---
title: "ng-sref-active"
description: "Apply classes when a linked state is active."
---
Adds a CSS class to the element when the referenced state (or any of its descendants) is active. Used to highlight active navigation links.

```html
  <a ng-sref="home" ng-sref-active="active">Home</a>
  <a ng-sref="about" ng-sref-active="active">About</a>
  <a ng-sref="users" ng-sref-active="active">Users</a>
</nav>
```
#### `ng-sref-active`

- **Type:** `string`
- **Required:** yes

CSS class name(s) to apply when the state is active. Multiple classes separated by spaces are supported.

`ng-sref-active` uses `$state.includes()` — it is active for the referenced state AND any of its child states.

```html
<a ng-sref="users" ng-sref-active="active">Users</a>
```
### ng-sref-active-eq

Strict variant that only activates for an exact state match (uses `$state.is()` rather than `$state.includes()`):

```html
<a ng-sref="users" ng-sref-active-eq="active">Users</a>
```
