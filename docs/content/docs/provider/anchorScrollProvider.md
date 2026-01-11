---
title: $anchorScrollProvider
description: >
  Configuration provider for `$anchorScroll` service.
---

### Description

Instance of [AnchorScrollProvider](../../../typedoc/classes/AnchorScrollProvider.html) for
configuring the [$anchorScroll](../../../docs/service/anchorscroll/) service.

Used to enable or disable automatic scrolling when URL hash is changed by [$location](../../../docs/service/location/) service.

### Properties

---

#### $anchorScrollProvider.autoScrollingEnabled

Enable or disable automatic scrolling on URL hash change 

- **Type:** Boolean
- **Default:** true

- **Example:**

  ```js
  angular.module('demo', [])
    .config([
      "$anchorScrollProvider",
      /** @param {ng.AnchorScrollProvider} $anchorScrollProvider */
      ($anchorScrollProvider) => {
        anchorScrollProvider.autoScrollingEnabled = false;
      }
    ]);
  ```

---

For service description, see [$anchorScroll](../../../docs/service/anchorscroll).