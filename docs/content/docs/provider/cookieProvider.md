---
title: "$cookieProvider"
description: "Configure default attributes for cookies written by the $cookie service."
---

`$cookieProvider` configures defaults that are merged into every `$cookie.put()`,
`$cookie.putObject()`, and `$cookie.remove()` call.

Exact signatures live in TypeDoc:

- [`CookieProvider`](../../../typedoc/classes/CookieProvider.html)
- [`CookieOptions`](../../../typedoc/interfaces/CookieOptions.html)

## Set Defaults

```js
angular.module("demo", []).config(($cookieProvider) => {
  $cookieProvider.defaults = {
    path: "/",
    secure: true,
    samesite: "Lax",
  };
});
```

Use provider defaults for application-wide settings such as cookie path,
HTTPS-only behavior, and SameSite policy. Per-call options still override these
defaults.

For service usage, see [$cookie]({{< relref "/docs/service/cookie" >}}).
