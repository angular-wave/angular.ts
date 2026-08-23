---
title: Load content when it enters the viewport
description: Delay below-the-fold work with ng-viewport
weight: 18
---

## Problem

A chart, comment list, or request should not start until the user scrolls near
it.

## Before you start

Measure the initial request or CPU work first. The deferred feature must have a
visible loading or empty state when it has not started.

## Recipe

Use `ng-viewport` and run the enter expression once:

<!-- tested-by: src/directive/viewport/viewport.spec.ts -->

```html
<section
  ng-viewport
  data-viewport-once
  data-viewport-margin="200px 0px"
  on-enter="comments.load()"
>
  <p ng-if="comments.loading">Loading comments...</p>
  <comment-list ng-if="comments.ready"></comment-list>
</section>
```

The margin starts work 200 pixels before the section enters the viewport.
`data-viewport-once` stops later enter events after the first one.

Use `on-leave` when work should pause after leaving the viewport:

<!-- tested-by: src/directive/viewport/viewport.spec.ts -->

```html
<video ng-viewport on-enter="player.play()" on-leave="player.pause()"></video>
```

The directive owns its browser observer and disconnects it when the scope is
destroyed.

## Failure path

Intersection is only a scheduling hint. Keep keyboard access and an explicit
retry path, and disconnect observers when their scope is destroyed.

## Apply it now

Record the requests and long tasks made before first paint. Choose one
below-the-fold feature that is not needed yet, move its start expression to
`on-enter`, and set the margin from measured load time rather than guessing.
Scroll past it twice and confirm `data-viewport-once` prevents duplicate work.

## Verify

Scroll into and out of the element twice, then remove it. Confirm the margin,
once behavior, leave behavior, and observer cleanup match the recipe.
