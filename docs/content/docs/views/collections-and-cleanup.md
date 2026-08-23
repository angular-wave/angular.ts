---
title: 'Reactive collections and cleanup'
weight: 30
description:
  'Render keyed reactive collections, preserve DOM identity, and release
  resources with the owning view.'
---

## What you will build

Render the changing task collection and close an external resource when its
component is removed.

## Before you start

Complete [typed views]({{< relref "/docs/views/typed" >}}).

```ts
const { each, tags } = angular.view;

view: ({ controller, onDestroy }) => {
  const channel = new BroadcastChannel('todos');
  onDestroy(() => channel.close());

  return tags.ul(
    each(
      () => controller.todos,
      (todo) => todo.id,
      (todo) => tags.li(() => todo().title),
    ),
  );
};
```

Normal `array.map()` creates a one-time DOM snapshot. `each()` observes the
collection, preserves nodes by a stable unique key, moves existing nodes when
order changes, and disposes nodes for removed keys. Its renderer receives a
reader because an item object can be replaced while retaining the same key.

Bindings and framework listeners are cleaned up automatically. Register sockets,
channels, timers, observers, and other application-owned resources with
`onDestroy()`.

## Next step

Use the complete [typed component view
reference]({{< relref "/docs/concepts/programmatic-views" >}}).
