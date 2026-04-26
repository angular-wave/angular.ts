---
title: "Cookies And Browser Storage"
weight: 430
description: "Read and write cookies with $cookie, serialize objects, and use $window.localStorage or sessionStorage for client-side persistence."
---

AngularTS provides `$cookie` for typed, injectable cookie access and `$window` for direct browser storage access. Prefer injected services over globals so unit tests can replace browser APIs without patching `window` or `document`.

Exact cookie API signatures live in TypeDoc:

- [`CookieService`](../../../typedoc/classes/CookieService.html)
- [`CookieOptions`](../../../typedoc/interfaces/CookieOptions.html)
- [`CookieProvider`](../../../typedoc/classes/CookieProvider.html)

## Read Cookies

`$cookie` decodes keys and values, parses `document.cookie`, and caches the parsed cookie map until the browser cookie string changes.

```typescript
const token = $cookie.get("session_token");

const prefs = $cookie.getObject<UserPreferences>("user_prefs");

const all = $cookie.getAll();
```

Use `get()` for raw string values and `getObject()` only for cookies you control and know contain JSON.

## Write Cookies

Use `put()` for strings and `putObject()` for JSON-serializable values.

```typescript
$cookie.put("session_token", "abc123", {
  path: "/",
  secure: true,
  samesite: "Strict",
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

$cookie.putObject(
  "user_prefs",
  { theme: "dark", fontSize: 14 },
  {
    path: "/",
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  },
);
```

Cookie attributes are passed through the `CookieOptions` object. Common options are `path`, `domain`, `expires`, `secure`, and `samesite`.

## Remove Cookies

`remove()` expires the cookie by writing an old expiration date.

```typescript
$cookie.remove("session_token");

$cookie.remove("session_token", {
  path: "/app",
  domain: ".example.com",
});
```

A cookie can only be removed when the `path` and `domain` used for removal match the values used when it was created. If a cookie was created with `path: "/"`, pass the same path when removing it.

## Provider Defaults

Set defaults once when every cookie should share the same attributes.

```typescript
angular.config(($cookieProvider: ng.CookieProvider) => {
  $cookieProvider.defaults = {
    path: "/",
    secure: true,
    samesite: "Lax",
  };
});
```

Per-call options are merged on top of provider defaults, so individual writes can still override a field.

## Local And Session Storage

AngularTS exposes the browser `window` object through `$window`. Inject `$window` when a service needs `localStorage` or `sessionStorage`.

```typescript
class PreferencesStorage {
  static $inject = ["$window"];

  constructor(private $window: Window & typeof globalThis) {}

  saveTheme(theme: string): void {
    this.$window.localStorage.setItem("theme", theme);
  }

  loadTheme(): string {
    return this.$window.localStorage.getItem("theme") ?? "light";
  }

  saveSessionData(key: string, data: unknown): void {
    this.$window.sessionStorage.setItem(key, JSON.stringify(data));
  }

  loadSessionData<T>(key: string): T | null {
    const raw = this.$window.sessionStorage.getItem(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}
```

| Concern | `localStorage` | `sessionStorage` |
| --- | --- | --- |
| Persistence | Until explicitly cleared | Until the browser tab closes |
| Scope | Shared across same-origin tabs | Isolated to the current tab |
| Typical use | Preferences and cached data | Wizard state and temporary form data |

## Storage Events

Listen for storage changes from other tabs through `$window`.

```typescript
angular.run(($window, $rootScope) => {
  $window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === "theme") {
      $rootScope.$broadcast("themeChanged", event.newValue);
      $rootScope.$applyAsync();
    }
  });
});
```

The browser only fires `storage` events in other same-origin tabs or windows, not in the tab that made the change.

## Example: Remember Me

```typescript
class AuthService {
  static $inject = ["$cookie", "$window"];

  constructor(
    private $cookie: ng.CookieService,
    private $window: Window & typeof globalThis,
  ) {}

  login(token: string, rememberMe: boolean) {
    if (rememberMe) {
      this.$cookie.put("auth_token", token, {
        path: "/",
        secure: true,
        samesite: "Strict",
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    } else {
      this.$window.sessionStorage.setItem("auth_token", token);
    }
  }

  getToken(): string | null {
    return (
      this.$cookie.get("auth_token") ??
      this.$window.sessionStorage.getItem("auth_token")
    );
  }

  logout() {
    this.$cookie.remove("auth_token", { path: "/" });
    this.$window.sessionStorage.removeItem("auth_token");
  }
}
```

## Related

- [$http service]({{< relref "/docs/services/http" >}})
- [PubSub messaging]({{< relref "/docs/services/pubsub" >}})
