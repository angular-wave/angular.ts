---
title: Add routing and server data
description:
  Give the task board a URL and expose explicit loading and error states.
weight: 50
---

Register the component as a route:

```ts
app.router({
  name: 'tasks',
  url: '/tasks',
  component: 'taskBoard',
});
```

Place the route outlet in the host page:

```html
<main ng-view></main>
```

Load initial data from a controller method:

```ts
loading = true;
error = "";
tasks: Task[] = [];

async onInit() {
  try {
    const response = await fetch("/api/tasks");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    this.tasks = await response.json();
  } catch (error) {
    this.error = error instanceof Error ? error.message : "Load failed";
  } finally {
    this.loading = false;
  }
}
```

Render loading, error, empty, and populated states deliberately. An empty array
does not prove loading succeeded.

## Checkpoint

Opening `/tasks` renders the board. A failed request produces a readable error
state.

## Next step

[Test the application behavior](../testing/).
