---
title: Internationalization
description:
  Design AngularTS message ownership, locale formatting, asynchronous catalogs,
  and bidirectional layouts.
weight: 95
---

Use stable message identifiers and named placeholders. Do not concatenate
translated fragments or use English text as an identifier. Choose plural forms
from locale rules rather than `count === 1`.

AngularTS formatting filters delegate to `Intl`. Pass the application locale and
explicit currency or time-zone policy; browser defaults may differ from user
settings.

```html
<span>{{ total | currency:user.locale }}</span>
<time>{{ dueAt | date:user.locale }}</time>
```

A locale service should deduplicate catalog requests, cache by locale and
catalog version, and expose loading and fallback state. Do not render raw
message identifiers while loading.

Set document or feature `lang` and `dir`. Prefer logical CSS properties. Test
long labels, narrow screens, mixed-direction names, non-Latin input, plural edge
cases, currency minor units, and dates around daylight-saving transitions.

Locale switching should invalidate message and formatter readers without
rebuilding unrelated domain state.
