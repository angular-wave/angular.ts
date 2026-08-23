---
title: Date
description: Format dates with the browser's locale-aware formatter.
weight: 25
---

The `date` filter accepts a `Date`, timestamp, or date string. It delegates to
`Intl.DateTimeFormat`, so locale and formatting options follow the browser
standard.

```html
<time>{{ task.dueAt | date:'en-GB' }}</time>
```

A missing or invalid input produces an empty string. Store real dates or
unambiguous timestamps in application state.
