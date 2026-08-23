---
title: Preserve focus when replacing server HTML
description: Keep the trigger stable or move focus to a deliberate result heading
weight: 75
---

## Problem

A fragment replacement removes the focused element or leaves keyboard users
outside the newly displayed content.

## Before you start

Choose whether focus should remain on a stable trigger or move to the result. Add
a programmatically focusable heading only when moving focus is useful.

## Keep the target stable and focus its heading

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts, src/directive/el/el.spec.ts -->

```html
<section>
  <button
    ng-get="/account/summary"
    data-target="#summary-body"
    swap="innerHTML"
    on-success="summaryHeading.focus()"
  >
    Load summary
  </button>
  <article>
    <h2 ng-el="summaryHeading" tabindex="-1">Account summary</h2>
    <div id="summary-body"><p>Summary not loaded.</p></div>
  </article>
</section>
```

## Server contract

Return only the body fragment so the stable heading and its `ng-el` reference are
not removed. Use valid application-owned HTML.

## Failure path

Keep focus on the trigger after failure and announce the error nearby. Do not move
focus for silent prefetch or background refreshes.

## Apply it now

Run one fragment swap using only the keyboard and observe the active element before
and after. Make that transition deliberate.

## Verify

Test success, failure, repeated replacement, screen reader announcements, and a
user who activates the control with keyboard or pointer.
