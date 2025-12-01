---
title: $cookieProvider
description: >
  Configuration provider for `$cookie` service.
---

### Description

Instance of [CookieProvider](../../../typedoc/classes/CookieProvider.html) for
configuring the [$cookie](../../../docs/service/cookie) service.

It allows you to set global default options that will apply to all cookies
created, updated, or removed using the `$cookie` service.

### Properties

---

#### $cookieProvider.defaults

The [defaults](../../../typedoc/classes/CookieProvider.html#defaults) property
defines global cookie settings. These values are applied to the `$cookie`
service at initialization, and every cookie created through `$cookie.put()` or
`$cookie.putObject()` will automatically inherit these defaults, unless
overridden per-cookie.

- **Type:** [CookieOptions](../../../typedoc/interfaces/CookieOptions.html)
- **Default:** `{}`
- | **Options:** | Property | Type                                            | Description |
  | ------------ | -------- | ----------------------------------------------- | ----------- |
  | **path**     | `string` | URL path the cookie belongs to. Defaults to the |

  current path. Commonly set to `'/'` to make cookies accessible across the
  entire site. | | **domain** | `string` | The domain the cookie is visible to.
  Useful for subdomains (e.g., `.example.com`). | | **expires** | `Date` |
  Expiration date. If omitted, the cookie becomes a _session cookie_ (deleted on
  browser close). | | **secure** | `boolean` | If `true`, the cookie is only
  sent over HTTPS. | | **samesite** | `"Strict" \| "Lax" \| "None"` | Controls
  cross-site cookie behavior. Required when `secure: true` and cross-site use is
  intended. | | **httponly** | _Not supported._ | Browser JS cannot set
  `HttpOnly` cookies. This must be done on the server. |

- **Example:**
  ```js
  angular.module('demo', []).config(($cookieProvider) => {
    $cookieProvider.defaults = {
      path: '/',
      secure: true,
      samesite: 'Lax',
    };
  });
  ```

---

For service description, see [$cookie](../../../docs/service/cookie).
