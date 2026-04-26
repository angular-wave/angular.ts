---
title: "ng-sref"
description: "Create links to named router states."
---
Generates an `href` attribute pointing to a named state and handles click navigation. Equivalent to `<a href="...">` but driven by state name rather than a raw URL.

```html
<a ng-sref="home">Go home</a>

<!-- State with parameters -->
<a ng-sref="user.profile({ userId: user.id })">{{ user.name }}</a>

<!-- State with query params -->
<a ng-sref="search({ q: 'angular', page: 1 })">Search</a>
```
#### `ng-sref`

- **Type:** `expression`
- **Required:** yes

State name, optionally followed by a params object in parentheses: `"stateName"` or `"stateName({ param: value })"`. The expression is evaluated in the current scope.
#### `ng-sref-opts`

- **Type:** `object`

Options passed to `$state.go()`. Common options: `{ reload: true }`, `{ inherit: false }`, `{ location: 'replace' }`.

```html
<a ng-sref="home" ng-sref-opts="{ reload: true }">Reload Home</a>
```
