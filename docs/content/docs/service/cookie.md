---
title: $cookie
description: >
  Provides read/write access to browser's cookies
---

### Description

The **`$cookie`** service offers a simple API for interacting with browser
cookies in AngularTS applications. It allows you to:

- Read existing cookies
- Write new cookies
- Delete cookies
- Store and retrieve JavaScript objects (via JSON serialization)
- Automatically URI-encode and decode values

#### Example

```js
angular.module('app').controller(
  'UserCtrl',
  /** @param {ng.CookieService} $cookie */
  ["$cookie", function ($cookie) {
    // Write cookie
    $cookie.put('session_id', 'abc123');

    // Read cookie
    const session = $cookie.get('session_id');

    // Store object
    $cookie.putObject('profile', { name: 'Alice', admin: true });

    // Read object
    const profile = $cookie.getObject('profile');

    // Remove cookie
    $cookie.remove('session_id');
  }],
);
```

Cookie behavior can be customized globally with
`module.config({ $cookie: ... })`.

```js
angular.module("app", []).config({
  $cookie: {
    defaults: {
      path: "/",
      secure: true,
      samesite: "Lax",
    },
  },
});
```

Defaults are merged into `$cookie.put()`, `$cookie.putObject()`, and
`$cookie.remove()` calls. Per-call options still override configured defaults.

Cookies are limited to roughly 4 KB, including key and value, so avoid storing
large objects; prefer identifiers or short tokens.

Executable sample:
[`log-cookie.html`](/examples/config/log-cookie.html)

For detailed method description, see
[CookieService](../../../typedoc/classes/CookieService.html)
