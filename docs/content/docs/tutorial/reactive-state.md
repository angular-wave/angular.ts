---
title: Add reactive state
description:
  Render a keyed collection and update it without replacing unrelated DOM.
weight: 30
---

Add a method to the controller:

```ts
class TaskBoard {
  nextId = 2;
  tasks = [{ id: 1, title: 'Read the guide', done: false }];

  add(title: string) {
    this.tasks = [...this.tasks, { id: this.nextId++, title, done: false }];
  }
}
```

Render the collection with stable keys:

```ts
import { each, li, ul } from '@angular-wave/angular.ts';

view: ({ controller }) =>
  ul(
    each(
      () => controller.tasks,
      (task) => task.id,
      (task) => li(() => task().title),
    ),
  ),
```

The item renderer receives a reader. Call `task()` inside reactive bindings so a
same-key item replacement updates its row.

## Checkpoint

Calling `controller.add("Ship it")` appends one row while retaining the existing
row.

## Next step

[Build the form](../forms/).
