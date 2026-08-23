---
title: Relative time
description: Format relative dates such as tomorrow or three days ago.
weight: 45
---

The `relativeTime` filter delegates to `Intl.RelativeTimeFormat`. Its input is
an offset, not a timestamp. The unit defaults to `day`.

```html
<span>{{ -1 | relativeTime:'day':'en' }}</span>
<span>{{ 2 | relativeTime:'hour':'en' }}</span>
```

Missing and nonnumeric values produce an empty string. Calculate the offset in
the model so time-dependent updates have an explicit schedule.
