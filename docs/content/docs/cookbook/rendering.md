---
title: Stop hidden UI from doing work
description: Choose between removing UI and only hiding it
weight: 104
---

## Problem

A closed panel still runs watchers, observers, timers, or network work because
CSS hides it without removing it.

## Recipe

Use `ng-if` when closing the UI should destroy it.

```html
<button type="button" ng-click="detailsOpen = !detailsOpen">
  Toggle details
</button>

<account-details ng-if="detailsOpen"></account-details>
```

Use `ng-show` only when the DOM and its state must stay alive:

```html
<video-player ng-show="playerOpen"></video-player>
```

## Why this works

`ng-if` removes the subtree and destroys its child scope. Reopening it creates a
fresh subtree.

`ng-show` changes visibility. The subtree, scope, form state, media state, and
watchers stay alive.

Choose based on what should happen while the UI is closed, not on which
directive is shorter.

## Verify

1. Open and close the panel repeatedly.
2. Confirm `ng-if` runs component cleanup when the panel closes.
3. Confirm hidden panels no longer issue requests or handle browser events.
4. If state must survive, confirm the `ng-show` version preserves it.

## Avoid

Do not use `ng-if` for a control that opens and closes constantly when
rebuilding it is expensive. Do not use `ng-show` for a large inactive subtree
that keeps doing work.
