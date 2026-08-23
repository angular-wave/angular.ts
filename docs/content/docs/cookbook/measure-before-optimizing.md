---
title: Find the slow part of an interaction
description:
  Measure whether delay comes from JavaScript, layout, rendering, or the network
weight: 107
---

## Problem

An interaction feels slow, but changing watchers or rendering code without a
trace only moves work around.

## Recipe

Record one interaction and optimize the longest measured task.

1. Reproduce the problem with realistic data and a production build.
2. Open the browser Performance panel.
3. Start recording immediately before the interaction.
4. Stop after the screen reaches its final state.
5. Find the longest main-thread task or network wait.
6. Expand that task until you can name the function, layout, paint, or request
   responsible.
7. Change one cause and record the same interaction again.

Add marks when the trace does not show where application work starts:

```ts
performance.mark('results:update:start');
controller.results = nextResults;

requestAnimationFrame(() => {
  performance.mark('results:update:painted');
  performance.measure(
    'results:update',
    'results:update:start',
    'results:update:painted',
  );
});
```

Read the result in the browser Performance panel or with:

```ts
performance.getEntriesByName('results:update');
```

## Why this works

A slow click can come from unrelated causes: request latency, JavaScript, style
calculation, layout, paint, image decoding, or too much DOM. Each cause needs a
different fix.

Measuring through the next animation frame includes the browser work needed to
show the change, not only the assignment.

## Verify

Keep the before and after traces. Compare the same data, browser, build mode,
and interaction. Accept the change only when the measured delay improves without
moving the cost to another step.

## Avoid

Do not use development timings as release numbers. Do not remove reactivity,
accessibility, or cleanup code because it looks expensive without a trace that
shows it is the cause.
