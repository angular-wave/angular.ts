---
title: Run the complete application
description:
  Open the maintained task-board example and compare it with your
  implementation.
weight: 80
---

The repository contains a browser-runnable version of the task board:

- `docs/examples/task-board/task-board.ts` is compiled as a package consumer.
- `docs/static/examples/task-board/task-board-demo.html` provides the host page.
- `docs/static/examples/task-board/task-board.js` registers the component view.

[Open the task-board example](/examples/task-board/task-board-demo.html).

The example keeps data local so it runs without a backend. The routing and
server-data step shows where application-owned transport behavior belongs.

## Compare behavior

Verify that both versions:

1. Render the initial keyed collection.
2. Disable submission for blank text.
3. Trim accepted task titles.
4. Clear the input after submission.
5. Preserve existing rows when a task is appended.

CI type-checks the TypeScript application and runs the browser interaction
contract. Documentation checks also validate its AngularTS API usage.
