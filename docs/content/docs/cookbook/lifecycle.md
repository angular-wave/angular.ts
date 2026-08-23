---
title: Clean up browser resources
description: Stop listeners, observers, and timers when a view is removed
weight: 106
---

## Problem

A component adds a browser listener or timer. After navigation or `ng-if`
removes the component, the callback still runs and keeps old state in memory.

## Recipe

Create the resource inside the component view and register its cleanup at the
same time.

```ts
class ClockController {
  now = new Date();
}

app.component<ClockController>('clock', {
  controller: ClockController,
  view: ({ controller, onDestroy }) => {
    const { time } = angular.tags;

    const timer = window.setInterval(() => {
      controller.now = new Date();
    }, 1_000);

    onDestroy(() => {
      window.clearInterval(timer);
    });

    return time(() => controller.now.toLocaleTimeString());
  },
});
```

For browser listeners, an `AbortController` keeps several listeners under one
cleanup:

```ts
const events = new AbortController();

window.addEventListener('resize', updateSize, {
  signal: events.signal,
});

onDestroy(() => events.abort());
```

## Why this works

Setup and cleanup live next to each other, so a later edit is less likely to add
one without the other. AngularTS runs the registered disposer when it removes
the component view.

## Verify

1. Open and remove the component several times.
2. Confirm only one timer or listener runs while it is visible.
3. Confirm no callback runs after removal.
4. Use the browser memory tools to confirm removed controllers can be collected.

## Avoid

Do not store component timers in a global list. Do not wait for a later route to
clean up resources created by the current component.
