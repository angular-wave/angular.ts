---
title: "Cookies and browser storage in AngularTS"
weight: 430
description: "Read and write cookies with $cookie, serialize objects with putObject, and use $window.localStorage or sessionStorage for client-side persistence."
---
AngularTS provides the `$cookie` service for typed, high-level cookie access and integrates with `$window` for direct access to `localStorage` and `sessionStorage`. Both approaches are dependency-injectable, which means they can be mocked in unit tests without patching globals.
## `$cookie` service

`$cookie` wraps `document.cookie` with a parsed, cached layer. It handles `encodeURIComponent`/`decodeURIComponent` for both keys and values, provides separate helpers for JSON-serialized objects, and exposes full cookie attribute control through an options object.
### Reading cookies

```typescript
const token = $cookie.get("session_token");

// Get a cookie and parse it as JSON
const prefs = $cookie.getObject<UserPreferences>("user_prefs");

// Get all cookies as a key-value map
const all = $cookie.getAll();
// { session_token: "abc123", user_prefs: "{\"theme\":\"dark\"}", ... }
```
#### `get(key)`

- **Type:** `string | null`

Returns the raw (URL-decoded) cookie value for `key`, or `null` if not set.
#### `getObject<T>(key)`

- **Type:** `T | null`

Calls `get()` then `JSON.parse()` on the result. Throws `SyntaxError` if the cookie is not valid JSON.
#### `getAll()`

- **Type:** `Record<string, string>`

Returns a snapshot of all cookies as a plain object. The result is cached per-request against `document.cookie` — repeated calls are cheap when the cookie string hasn't changed.
### Writing cookies

```typescript
$cookie.put("session_token", "abc123", {
  path: "/",
  secure: true,
  samesite: "Strict",
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
});

// Set a JSON-serialized object
$cookie.putObject("user_prefs", { theme: "dark", fontSize: 14 }, {
  path: "/",
  expires: 365, // days as a number, or a Date, or a date string
});
```
#### `Parameter`

- **Type:** `string`
- **Required:** yes

Cookie name. URL-encoded before writing to `document.cookie`.
#### `Parameter`

- **Type:** `string`
- **Required:** yes

Cookie value. URL-encoded before writing.
#### `Parameter`

- **Type:** `string`

Cookie path. Restricts which URLs the cookie is sent to. Default: the current path if not set in `$cookieProvider.defaults`.
#### `Parameter`

- **Type:** `string`

Cookie domain. Use `.example.com` (leading dot) to share across subdomains.
#### `Parameter`

- **Type:** `Date | string | number`

Expiry date. Pass a `Date` object, an ISO date string, or a number (interpreted as a timestamp via `new Date(value)`). Omit to create a session cookie.
#### `Parameter`

- **Type:** `boolean`

Restrict the cookie to HTTPS connections.
#### `Parameter`

- **Type:** `Lax" | "Strict" | "None`

SameSite policy. Use `"None"` together with `secure: true` for cross-site cookies. Default: unset (browser default applies).
### Removing cookies

```typescript
$cookie.remove("session_token");

// Remove with specific path/domain to match how it was set
$cookie.remove("session_token", { path: "/app", domain: ".example.com" });
```

> **Note:** A cookie can only be removed when the `path` and `domain` used in `remove()` match the values used when it was created. If you set a cookie with `path: "/"` and remove it with the default path, the removal will silently fail.
### Provider defaults

Set defaults that apply to all `put()` and `remove()` calls:

```typescript
  $cookieProvider.defaults = {
    path: "/",
    secure: true,
    samesite: "Lax",
  };
});
```

Individual calls can still override any field in the options object — per-call options are merged on top of the provider defaults.
### Cookie options summary

| Option     | Type                          | Description               |
| ---------- | ----------------------------- | ------------------------- |
| `path`     | `string`                      | URL path scope            |
| `domain`   | `string`                      | Domain scope              |
| `expires`  | `Date \| string \| number`    | Expiry date or timestamp  |
| `secure`   | `boolean`                     | HTTPS only                |
| `samesite` | `"Lax" \| "Strict" \| "None"` | Cross-site sending policy |

***
## `$window.localStorage` and `$window.sessionStorage`

AngularTS exposes the browser `window` object through the `$window` service. Injecting `$window` rather than accessing `window` directly keeps your service layer testable — in tests you can swap `$window` for a plain object without touching `window`.
### Basic usage

```typescript
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

  clear(): void {
    this.$window.localStorage.clear();
    this.$window.sessionStorage.clear();
  }
}
```
### `localStorage` vs `sessionStorage`

|               | `localStorage`                             | `sessionStorage`                   |
| ------------- | ------------------------------------------ | ---------------------------------- |
| Persistence   | Until explicitly cleared                   | Until the browser tab is closed    |
| Scope         | Shared across all tabs for the same origin | Isolated to the current tab        |
| Typical use   | User preferences, cached data              | Wizard state, tab-scoped form data |
| Storage limit | \~5–10 MB                                  | \~5 MB                             |
### Storage events

Listen for storage changes made by other tabs via `$window`:

```typescript
  $window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === "theme") {
      $rootScope.$broadcast("themeChanged", event.newValue);
      $rootScope.$applyAsync();
    }
  });
});
```

> **Warning:** `storage` events are only fired in other tabs/windows of the same origin — not in the tab that made the change.

***
## Practical examples

### Remember me

```typescript
class AuthService {
  static $inject = ["$cookie", "$window"];

  constructor(
    private $cookie: ng.CookieService,
    private $window: Window & typeof globalThis,
  ) {}

  login(token: string, rememberMe: boolean) {
    if (rememberMe) {
      // Persist across browser sessions with a 30-day cookie
      this.$cookie.put("auth_token", token, {
        path: "/",
        secure: true,
        samesite: "Strict",
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    } else {
      // Session only — clear on tab close
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

### User preferences

```typescript
interface Preferences {
  theme: "light" | "dark";
  language: string;
  fontSize: number;
}

class PreferencesController {
  static $inject = ["$cookie", "$scope"];
  prefs: Preferences;

  constructor($cookie: ng.CookieService, $scope: ng.Scope) {
    // Load saved preferences
    this.prefs = $cookie.getObject<Preferences>("prefs") ?? {
      theme: "light",
      language: "en",
      fontSize: 14,
    };

    // Persist on every change
    $scope.$watch(
      () => this.prefs,
      (newPrefs) => {
        $cookie.putObject("prefs", newPrefs, {
          path: "/",
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      },
      true, // deep watch
    );
  }
}
```

### XSRF token

```typescript
// $http reads the XSRF-TOKEN cookie and sends it in X-XSRF-TOKEN automatically.
// You can also read it manually for non-$http requests:

class ApiClient {
  static $inject = ["$cookie"];
  private xsrfToken: string | null;

  constructor($cookie: ng.CookieService) {
    this.xsrfToken = $cookie.get("XSRF-TOKEN");
  }

  fetchWithXsrf(url: string) {
    return fetch(url, {
      method: "POST",
      headers: {
        "X-XSRF-TOKEN": this.xsrfToken ?? "",
      },
    });
  }
}
```

#### [$http service]({{< relref "/docs/services/http" >}})

`$http` reads `XSRF-TOKEN` from cookies automatically.

#### [PubSub messaging]({{< relref "/docs/services/pubsub" >}})

Broadcast preference changes across controllers without tight coupling.
