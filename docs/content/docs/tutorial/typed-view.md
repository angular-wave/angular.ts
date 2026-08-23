---
title: Add a typed view
description:
  Register a component whose model and DOM bindings are checked by TypeScript.
weight: 20
---

A typed view constructs real DOM and keeps controller reads reactive. Its main
advantage over string templates is type safety between the component model and
its bindings.

```ts
class TaskBoard {
  title = 'Task board';
  tasks = [{ id: 1, title: 'Read the guide', done: false }];
}

const { tags } = angular;

app.component<TaskBoard>('taskBoard', {
  controller: TaskBoard,
  view: ({ controller }) =>
    tags.main(
      tags.h1(() => controller.title),
      tags.p(() => `${controller.tasks.length} task(s)`),
    ),
});
```

The view is registered on the normal application module. It does not need a
separate mount operation. Functions used as children or property values are
reactive readers; plain values render once.

## Checkpoint

The page should display “Task board” and one task count.

## Next step

[Render and update the collection](../reactive-state/).
