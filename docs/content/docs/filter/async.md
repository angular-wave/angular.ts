---
title: Async
description: Render a promise result when it settles.
weight: 5
---

The `async` filter returns `undefined` while a promise-like value is pending.
When it settles, AngularTS schedules change detection and returns the resolved
value. A rejection is exposed as the settled value so the view can decide how to
present it.

```html
<p>{{ profilePromise | async }}</p>
```

Keep the same promise instance between render passes. Creating a promise in the
template starts new work repeatedly; create it in a controller or model instead.
