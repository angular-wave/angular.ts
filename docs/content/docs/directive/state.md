---
title: 'ng-state'
description: 'Bind state declaration data in templates.'
---

Declarative state navigation where both the state name and params come from
scope expressions.

```html
<a
  ng-state="'orders.detail'"
  ng-state-params="{ id: order.id }"
  data-state-active
  data-state-exact
>
  Order {{order.id}}
</a>
```

Use `data-state-active` when the link should track whether its target state or a
child state is active. Add `data-state-exact` when only the exact target state
should count as current. AngularTS writes `data-state-current="true"` or
`data-state-current="false"` so styling can stay declarative.

`ng-state` also consumes `$aria` defaults. A non-native route link such as a
`div` receives `role="link"`, `tabindex="0"`, keyboard activation, and managed
`aria-current` when `data-state-active` or `data-state-exact` is present.
Authored `role`, `tabindex`, and `aria-current` values are preserved, and
`ng-aria-disable` opts an element out locally.

The quoted literal route name (`'orders.detail'`) is still an expression, but it
is static enough for TypeScript examples and documentation checks to map it back
to a known route. Use `ng-state="link.state"` when the route name itself is
dynamic.

Executable sample: [`state-links.html`](/examples/routing/state-links.html)

#### `ng-state`

- **Type:** `expression`
- **Required:** yes

Expression that evaluates to a state name string. Prefer a quoted literal route
name when the template always targets one route.

#### `ng-state-params`

- **Type:** `expression`

Expression that evaluates to the params object for the state.

```javascript
$scope.currentParams = { userId: 42 };
```
