---
title: Number, currency, and percent
description: Format numeric values with locale-aware browser formatters.
weight: 35
---

AngularTS provides three filters backed by `Intl.NumberFormat`:

- `number` formats a finite number.
- `currency` uses currency style and defaults to USD.
- `percent` uses percentage style.

```html
<span>{{ total | number:'en-US' }}</span>
<span>{{ total | currency:'en-US' }}</span>
<span>{{ completion | percent:'en-US' }}</span>
```

Numeric strings are accepted. Missing, empty, infinite, and nonnumeric values
produce an empty string. Supply an explicit locale and currency for user-facing
output.
