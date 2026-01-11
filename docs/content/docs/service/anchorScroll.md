---
title: $anchorScroll
description: >
  Anchor scroll service
---

### Description 

`$anchorScroll` service scrolls to the element hash or (if omitter) to the current value of [$location.getHash()](../../../typedoc/classes/Location.html#gethash), according to the rules speciffied in the [HTML spec](https://html.spec.whatwg.org/multipage/browsing-the-web.html#scrolling-to-a-fragment).

It also watches the URL hash and automatically scrolls to any matched anchor whenever it is changed by [$location](../../../docs/service/location/). This can be disabled by a setting on [$anchorScrollProvider](../../../docs/provider/anchorscrollprovider/#anchorscrollproviderautoscrollingenabled).

Additionally, you can use the `yOffset` property to specify a vertical scroll-offset (either fixed or dynamic).

#### Example

{{< showhtml src="examples/anchorscroll/anchor-scroll.html" >}}

{{< showjs src="examples/anchorscroll/anchor-scroll.js" >}}

---

#### Demo

{{< showraw src="examples/anchorscroll/anchor-scroll.html" >}}

<script>
{{< showraw src="examples/anchorscroll/anchor-scroll.js" >}}
</script>
---

The example below illustrates the use of a vertical scroll-offset (specified as a fixed value).

#### Example

{{< showhtml src="examples/anchorscroll/anchor-scroll2.html" >}}

{{< showjs src="examples/anchorscroll/anchor-scroll2.js" >}}

---

#### Demo

{{< showraw src="examples/anchorscroll/anchor-scroll2.html" >}}

<script>
{{< showraw src="examples/anchorscroll/anchor-scroll2.js" >}}
</script>

---

For detailed method description, see [$anchorScroll](../../../typedoc/interfaces/AnchorScrollService.html).