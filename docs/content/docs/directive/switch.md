---
title: "ng-switch"
description: "Switch between exclusive template blocks."
---
Conditionally renders one of several templates based on the value of an expression. Similar to a JavaScript `switch` statement.

```html
  <div ng-switch-when="admin">Admin panel</div>
  <div ng-switch-when="editor">Editor tools</div>
  <div ng-switch-default>Standard view</div>
</div>
```
#### `ng-switch`

- **Type:** `expression`
- **Required:** yes

The value to switch on. Applied to the container element.
#### `ng-switch-when`

- **Type:** `string`
- **Required:** yes

The value to match against `ng-switch`. The element is rendered when the switch value equals this.
#### `ng-switch-default`

- **Type:** `none`

Rendered when no `ng-switch-when` matches. No value required.

Multiple `ng-switch-when` values match the same element:

```html
  <div ng-switch-when="pending" ng-switch-when="processing">In progress</div>
  <div ng-switch-when="done">Complete</div>
</div>
```

**Animation hooks:** `.ng-enter` / `.ng-leave` on matched/unmatched elements.
