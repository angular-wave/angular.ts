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
const { each } = angular.view;
const { tags } = angular;

view: ({ controller }) =>
  tags.ul(
    each(
      () => controller.tasks,
      (task) => task.id,
      (task) => tags.li(() => task().title),
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
