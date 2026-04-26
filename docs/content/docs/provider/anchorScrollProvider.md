---
title: "$anchorScrollProvider"
description: "Configure automatic anchor scrolling when the URL hash changes."
---

`$anchorScrollProvider` controls whether `$anchorScroll` reacts automatically
when `$location` changes the URL hash.

Exact signatures live in TypeDoc:

- [`AnchorScrollProvider`](../../../typedoc/classes/AnchorScrollProvider.html)
- [`AnchorScrollService`](../../../typedoc/interfaces/AnchorScrollService.html)

## Disable Automatic Scrolling

```js
angular.module("demo", []).config(($anchorScrollProvider) => {
  $anchorScrollProvider.autoScrollingEnabled = false;
});
```

Disable automatic scrolling when the application needs to coordinate hash
changes with custom routing, animation, or focus management.

For service usage, see [$anchorScroll]({{< relref "/docs/service/anchorScroll" >}}).
