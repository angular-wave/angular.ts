---
title: "$anchorScroll"
description: "Scroll to document anchors and coordinate hash-driven scrolling."
---

`$anchorScroll` scrolls to the element identified by a hash or, when omitted,
to the current value of
[$location.getHash()](../../../typedoc/classes/Location.html#gethash),
according to the rules specified in the
[HTML spec](https://html.spec.whatwg.org/multipage/browsing-the-web.html#scrolling-to-a-fragment).

It also watches the URL hash and automatically scrolls to any matched anchor
whenever it is changed by [$location](../../../docs/service/location/).

Exact signatures live in TypeDoc:

- [`AnchorScrollService`](../../../typedoc/interfaces/AnchorScrollService.html)

## Configure

Use `module.config({ $anchorScroll: ... })` for application-wide scroll policy.

```js
angular.module("app", []).config({
  $anchorScroll: {
    autoScrolling: false,
  },
});
```

Executable sample:
[`anchor-scroll.html`](/examples/config/anchor-scroll.html)

## Manual Scrolling

```js
$location.hash("details");
$anchorScroll("details");
```

When automatic scrolling is disabled, call `$anchorScroll(...)` directly after
coordinating routing, animation, or focus.

## Vertical Offset

Use the `yOffset` property to specify a fixed or dynamic vertical scroll offset.
This is useful when the application has sticky headers.

#### Example

{{< showhtml src="examples/anchorscroll/anchor-scroll2.html" >}}

{{< showjs src="examples/anchorscroll/anchor-scroll2.js" >}}

{{< showraw src="examples/anchorscroll/anchor-scroll2.html" >}}

<script>
{{< showraw src="examples/anchorscroll/anchor-scroll2.js" >}}
</script>

---

For detailed method description, see [$anchorScroll](../../../typedoc/interfaces/AnchorScrollService.html).
