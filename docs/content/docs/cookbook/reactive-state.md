---
title: Make a component view reactive
description: Fix state changes that do not update a typed component view
weight: 102
---

## Problem

A component changes its controller state, but a value in its component view
stays frozen at the initial value.

## Recipe

Pass a reader function for values that can change.

```ts
import { button, output } from '@angular-wave/angular.ts';

class CounterController {
  count = 0;
}

const app = angular.createModule('counter', []);

app.component<CounterController>('counter', {
  controller: CounterController,
  view: ({ controller }) => {
    return [
      button(
        {
          type: 'button',
          onclick: () => {
            controller.count += 1;
          },
        },
        'Add',
      ),
      output(() => controller.count),
    ];
  },
});
```

Use `() => controller.count`, not `controller.count`, for the changing child.

## Why this works

`controller.count` reads the value while the view is being created. The view
receives one number and has nothing to read later.

`() => controller.count` gives the runtime a reader. AngularTS tracks the
properties read by that function and updates the affected DOM when they change.

The same rule applies to reactive properties:

```ts
button(
  {
    disabled: () => !controller.canSubmit,
  },
  'Save',
);
```

## Verify

1. Click **Add** several times.
2. Confirm the existing `output` node changes.
3. Inspect the DOM and confirm the component is not rebuilt for each click.

## Avoid

Do not wrap constant strings or numbers in functions. Readers are for values
that can change. Keep static children static.
