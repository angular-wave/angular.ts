---
title: "ng-view"
description: "Render the active routed view."
---
Marks the element where the router renders the active state's template. When the active state changes, the content inside `ng-view` is replaced with the new state's template, compiled into a new scope.

```html
<ng-view></ng-view>

<!-- As an attribute -->
<div ng-view></div>

<!-- Named view (for multiple named views in one state) -->
<div ng-view="sidebar"></div>
```
#### `ng-view`

- **Type:** `string`

Optional view name. When omitted, this outlet renders the unnamed (default) view of the active state. When specified, renders the named view from the state's `views` configuration.

States define their templates in `$stateRegistry`:

```javascript
  name: 'home',
  url: '/home',
  template: '<h1>Home</h1>'
});

// Named views:
$stateRegistry.register({
  name: 'dashboard',
  url: '/dashboard',
  views: {
    '': { template: '<p>Main content</p>' },
    'sidebar': { template: '<nav>Sidebar</nav>' }
  }
});
```
