---
title: "URL matching and configuration in AngularTS router"
weight: 370
description: "Configure URL parameters, typed path and query params, hash vs HTML5 mode, base href, and custom parameter types in the AngularTS state-based router."
---
The AngularTS router matches the browser's URL against registered state declarations and activates the best matching state. URL matching is an optional layer on top of the state machine—states can be navigated to programmatically without any URL involvement—but most applications use URLs to make deep-linking and browser history work correctly.
## How URL matching works

When the browser URL changes (or on initial load), the `UrlService` calls `sync()`. It iterates all registered URL rules in priority order and finds the best match using a weighted scoring system. The winning rule's handler is called, which calls `$state.go()` with the matched state and extracted parameter values.

URL rules are created automatically for every state that has a `url` property. You can also register custom URL rules directly on `$urlService._rules`.

`UrlService.match(url)` accepts a `UrlParts` object (`{ path, search, hash }`) and returns a `MatchResult` with the matching rule, the match data, and the match weight. Rules with the same sort order are ranked by weight so the most specific match wins.
## URL parameters

Parameters are declared in the state's `url` string. The router uses a `UrlMatcher` compiled from this pattern to test URLs and extract values.
### Path parameters

Use a colon prefix for named path segments:

```javascript
  name: 'user',
  url: '/users/:userId',
  component: 'UserProfile'
});

// Matches: /users/42 → { userId: '42' }
```

Use curly braces for parameters with inline type annotations or custom regexps:

```javascript
  name: 'product',
  url: '/products/{productId:int}',
  component: 'ProductDetail'
});

// Matches: /products/123 → { productId: 123 }  (integer, not string)
// Does NOT match: /products/abc
```

Custom regexp:

```javascript
  name: 'article',
  url: '/articles/{slug:[a-z0-9-]+}',
  component: 'Article'
});
```
### Query parameters

Append a `?` followed by parameter names. Multiple query params are separated by `&`:

```javascript
  name: 'search',
  url: '/search?q&page',
  component: 'SearchResults'
});

// Matches: /search?q=angularts&page=2 → { q: 'angularts', page: '2' }
```

Typed query params:

```javascript
  name: 'messages',
  url: '/messages?{before:date}&{after:date}',
  component: 'MessageList'
});
```

Mixed path and query params:

```javascript
  name: 'mailbox',
  url: '/messages/:mailboxId?{before:date}&{after:date}',
  component: 'Mailbox'
});
```
### Optional parameters

Give a parameter a default value in the `params` block and set `squash: true` to make it optional. When the URL is visited without the parameter, the default value is used. When navigating with the default value, the parameter is omitted from the URL:

```javascript
  name: 'userList',
  url: '/users/:page',
  params: {
    page: {
      value: '1',   // default value
      squash: true  // remove from URL when value equals default
    }
  },
  component: 'UserList'
});

// /users/    → { page: '1' }  (squashed)
// /users/3   → { page: '3' }
```
## Built-in parameter types

The `UrlConfigProvider` ships the following built-in parameter types. Specify the type inline in the URL pattern or in the `params` block:

### string

Default for path parameters. Encodes and decodes as a plain string. Slashes within the value are encoded as `~2F` in AngularTS's patched path type to avoid ambiguity in Angular 1's `$location`.

```javascript
url: '/items/:name'
// { name: 'foo bar' } → /items/foo%20bar
```

### int

Parses URL segments as integers using `parseInt`. The `pattern` is `/\d+/`.

```javascript
url: '/users/{id:int}'
// /users/42 → { id: 42 }  (number, not string)
```

### bool

Represents boolean values. Encodes `true` as `"1"` and `false` as `"0"`. The pattern matches `1` or `0`.

```javascript
url: '/settings/{darkMode:bool}'
// /settings/1 → { darkMode: true }
```

### json

Encodes arbitrary objects as a JSON string in the URL (URL-encoded). Useful for complex filter objects.

```javascript
url: '/search?{filters:json}'
// { filters: { status: 'active', role: 'admin' } }
// → /search?filters=%7B%22status%22%3A%22active%22%7D
```

### date

Encodes `Date` objects as `YYYY-MM-DD` strings. Parses the string back to a `Date` on the way in.

```javascript
url: '/events?{startDate:date}&{endDate:date}'
// { startDate: new Date('2024-01-15') }
// → /events?startDate=2024-01-15
```

### hash

The internal parameter type used for the `#` (hash/anchor) portion of the URL. Has `inherit: false` so the hash is not carried forward to child state transitions.
## URL configuration with UrlConfigProvider

`UrlConfigProvider` (injected as `$urlConfigProvider` in config blocks, or accessed via `$url._config` at runtime) controls global URL matching behavior.
### Case sensitivity

URL matching is case-sensitive by default. Allow case-insensitive matching:

```javascript
  .config(function ($urlConfigProvider) {
    $urlConfigProvider.caseInsensitive(true);
  });
```
### Strict mode (trailing slashes)

By default, `/users/` and `/users` are distinct. Disable strict mode to treat trailing slashes as equivalent:

```javascript
  .config(function ($urlConfigProvider) {
    $urlConfigProvider.strictMode(false); // /users/ matches /users
  });
```
### Default squash policy

Control the global default for how parameters with default values appear in URLs:

```javascript
  .config(function ($urlConfigProvider) {
    // 'false' (default): include the default value in the URL
    // 'true': omit default value from URL
    // '~': replace default value with '~' in the URL
    $urlConfigProvider.defaultSquashPolicy(true);
  });
```
### Custom parameter types

Register a custom `ParamType` before using it in state URL patterns. The type must implement `encode`, `decode`, `is`, `equals`, and optionally `pattern`:

```javascript
  .config(function ($urlConfigProvider) {

    // Encodes an array of integers as a dash-separated string
    $urlConfigProvider.type('intarray', {
      encode: function (array) {
        return array.join('-');
      },
      decode: function (str) {
        return str.split('-').map(function (x) { return parseInt(x, 10); });
      },
      is: function (val) {
        return Array.isArray(val) && val.every(function (x) {
          return typeof x === 'number' && !isNaN(x);
        });
      },
      equals: function (a, b) {
        return a.length === b.length &&
          a.every(function (x, i) { return x === b[i]; });
      },
      pattern: /[0-9]+(?:-[0-9]+)*/
    });

  });
```

Use the custom type in a state URL:

```javascript
  name: 'report',
  url: '/reports/{ids:intarray}',
  component: 'Report'
});

// $state.go('report', { ids: [10, 20, 30] }) → /reports/10-20-30
// /reports/10-20-30 → { ids: [10, 20, 30] }
```

> **Note:** Register custom types **before** any state that uses them. `UrlConfigProvider.type()` returns the provider itself for chaining.
## Hash mode vs HTML5 mode

AngularTS inherits Angular 1's `$location` modes. Configure the mode on `$locationProvider`:

### Hash mode (default)

URLs use a hash fragment: `http://example.com/app/#/contacts/42`. No server configuration is needed; the hash segment is never sent to the server.

```javascript
angular.module('app')
  .config(function ($locationProvider) {
    $locationProvider.html5Mode(false);
    $locationProvider.hashPrefix('!'); // optional: use #!/ instead of #/
  });
```

The `UrlService.href()` method prepends `#` (plus the hash prefix) when generating hrefs in hash mode.

### HTML5 mode (pushState)

URLs use real paths: `http://example.com/contacts/42`. The server must return the app's `index.html` for all routes.

```javascript
angular.module('app')
  .config(function ($locationProvider) {
    $locationProvider.html5Mode({
      enabled: true,
      requireBase: true  // <base href="..."> must be present in <head>
    });
  });
```

In HTML5 mode, `UrlService.href()` prepends the base path (stripped of its last segment) rather than a hash.
## Base href

In HTML5 mode, the base href is read from the `<base>` tag in the document `<head>`:

```html
  <base href="/myapp/">
</head>
```

`UrlService.baseHref()` returns the current base href. If no `<base>` tag is present it falls back to `window.location.pathname`. The base href is used when constructing absolute URLs via `$state.href(..., { absolute: true })` and when pushing new history entries.

```javascript
var base = $url.baseHref(); // "/myapp/"
```
## Reading the current URL

`UrlService` provides three methods to read URL components:

```javascript

$url.getPath();   // "/contacts/42"
$url.getSearch(); // { tab: 'notes' }
$url.getHash();   // "section1"

// All three at once
var parts = $url.parts();
// { path: '/contacts/42', search: { tab: 'notes' }, hash: 'section1' }

// The full normalized URL (strips base, adds hash prefix in hash mode)
$url.url(); // "/contacts/42?tab=notes#section1"
```
## Updating the URL

`UrlService.url(newUrl)` replaces the current URL. The router then calls `sync()` to find and activate the matching state:

```javascript
$url.url('/contacts/99?tab=history');
```

`UrlService.push()` is the internal method used by the built-in `onSuccess` hook to update the browser address bar after a successful state transition:

```javascript
$url.push(state.navigable.url, $state.params, { replace: false });
```
## URL rule priority and matching weight

When multiple rules could match the same URL, the router scores each match and picks the winner:

1. Rules are sorted by a primary sort order (rules created from state declarations all share the same group).
2. Within a group, the match with the highest **weight** wins. Weight is computed by counting matched segments, typed parameters, and specificity of regexps.
3. A state URL like `/users/{id:int}` outweighs `/users/:id` for the path `/users/42` because the typed parameter provides a stricter match.

Exact path matches score higher than prefix matches. Query parameters do not affect path scoring but must all be present if declared without defaults.
## Listening for URL changes

`UrlService.onChange(callback)` registers a low-level listener that fires on every `$locationChangeSuccess` event. The listener receives the Angular scope event:

```javascript
  console.log('URL changed to:', $url.url());
});

// Stop listening
deregister();
```

`UrlService.listen(false)` stops the router from responding to URL changes entirely. Call `listen(true)` to resume. This is useful when loading states asynchronously and you want to defer URL-driven navigation until the states are registered:

```javascript
  .run(function ($url, $stateRegistry) {
    $url.listen(false);

    fetch('/api/states')
      .then(r => r.json())
      .then(function (states) {
        states.forEach(s => $stateRegistry.register(s));
        $url.listen(true);
        $url.sync(); // activate the state matching the current URL
      });
  });
```
