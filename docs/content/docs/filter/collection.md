---
title: Collection filters
description: Read keys, values, and entries from objects and keyed collections.
weight: 15
---

The collection filters accept objects, `Map`, and other values that expose the
corresponding iterable method.

```html
<li ng-repeat="name in team | keys">{{ name }}</li>
<li ng-repeat="member in team | values">{{ member }}</li>
<li ng-repeat="entry in team | entries">{{ entry.key }}: {{ entry.value }}</li>
```

`null`, `undefined`, primitives, and unsupported inputs produce an empty array.
Use `entries` when both the key and value are needed.
