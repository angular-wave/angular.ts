---
title: 'URL matching and configuration in AngularTS router'
linkTitle: 'URL matching'
weight: 370
description:
  'Configure URL parameters, typed path and query params, hash vs HTML5 mode,
  base href, and custom parameter types in the AngularTS state-based router.'
---

The AngularTS router matches the browser's URL against registered state
declarations and activates the best matching state. URL matching is an optional
layer on top of the state machine—states can be navigated to programmatically
without any URL involvement—but most applications use URLs to make deep-linking
and browser history work correctly.

## How URL matching works

When the browser URL changes (or on initial load), the router syncs registered
URL rules in priority order and finds the best match using a weighted scoring
system. The winning rule's handler calls `$state.go()` with the matched state
and extracted parameter values.

URL rules are created automatically for every state that has a `url` property.
Rules with the same sort order are ranked by weight so the most specific match
wins.

## URL parameters

Parameters are declared in the state's `url` string. The router uses a
`UrlMatcher` compiled from this pattern to test URLs and extract values.

### Path parameters

Use a colon prefix for named path segments:

```js
  name: 'user',
  url: '/users/:userId',
  component: 'UserProfile'
});

// Matches: /users/42 → { userId: '42' }
```

Use curly braces for parameters with inline type annotations or custom regexps:

```js
  name: 'product',
  url: '/products/{productId:int}',
  component: 'ProductDetail'
});

// Matches: /products/123 → { productId: 123 }  (integer, not string)
// Does NOT match: /products/abc
```

Custom regexp:

```js
  name: 'article',
  url: '/articles/{slug:[a-z0-9-]+}',
  component: 'Article'
});
```

### Query parameters

Append a `?` followed by parameter names. Multiple query params are separated by
`&`:

```js
  name: 'search',
  url: '/search?q&page',
  component: 'SearchResults'
});

// Matches: /search?q=angularts&page=2 → { q: 'angularts', page: '2' }
```

Typed query params:

```js
  name: 'messages',
  url: '/messages?{before:date}&{after:date}',
  component: 'MessageList'
});
```

Mixed path and query params:

```js
  name: 'mailbox',
  url: '/messages/:mailboxId?{before:date}&{after:date}',
  component: 'Mailbox'
});
```

### Optional parameters

Give a parameter a default value in the `params` block and set `squash: true` to
make it optional. When the URL is visited without the parameter, the default
value is used. When navigating with the default value, the parameter is omitted
from the URL:

```js
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

The router ships the following built-in parameter types. Specify the type inline
in the URL pattern or in the `params` block:

### string

Default for path parameters. Encodes and decodes as a plain string. Slashes
within the value are encoded as `~2F` in AngularTS's patched path type to avoid
ambiguity in Angular 1's `$location`.

```js
url: '/items/:name';
// { name: 'foo bar' } → /items/foo%20bar
```

### int

Parses URL segments as integers using `parseInt`. The `pattern` is `/\d+/`.

```js
url: '/users/{id:int}';
// /users/42 → { id: 42 }  (number, not string)
```

### bool

Represents boolean values. Encodes `true` as `"1"` and `false` as `"0"`. The
pattern matches `1` or `0`.

```js
url: '/settings/{darkMode:bool}';
// /settings/1 → { darkMode: true }
```

### json

Encodes arbitrary objects as a JSON string in the URL (URL-encoded). Useful for
complex filter objects.

```js
url: '/search?{filters:json}';
// { filters: { status: 'active', role: 'admin' } }
// → /search?filters=%7B%22status%22%3A%22active%22%7D
```

### date

Encodes `Date` objects as `YYYY-MM-DD` strings. Parses the string back to a
`Date` on the way in.

```js
url: '/events?{startDate:date}&{endDate:date}';
// { startDate: new Date('2024-01-15') }
// → /events?startDate=2024-01-15
```

### hash

The internal parameter type used for the `#` (hash/anchor) portion of the URL.
Has `inherit: false` so the hash is not carried forward to child state
transitions.

## URL configuration with `$router`

`$router` config controls global URL matching behavior.

### Case sensitivity

URL matching is case-sensitive by default. Allow case-insensitive matching:

```js
angular.getModule('app').config({
  $router: {
    caseInsensitive: true,
  },
});
```

### Strict mode (trailing slashes)

By default, `/users/` and `/users` are distinct. Disable strict mode to treat
trailing slashes as equivalent:

```js
angular.getModule('app').config({
  $router: {
    strict: false, // /users/ matches /users
  },
});
```

### Default squash policy

Control the global default for how parameters with default values appear in
URLs:

```js
angular.getModule('app').config({
  $router: {
    // 'false' (default): include the default value in the URL
    // 'true': omit default value from URL
    // '~': replace default value with '~' in the URL
    defaultSquash: true,
  },
});
```

### Custom parameter types

Register a custom [`ParamType`](../../../typedoc/classes/ParamType.html) before
using it in state URL patterns. The type must implement `encode`, `decode`,
`is`, `equals`, and optionally `pattern`:

```js
angular.createModule('app', []).config({
  $router: {
    paramTypes: {
      intarray: {
        encode: (values) => values.join('-'),
        decode: (value) => value.split('-').map(Number),
        is: (value) => Array.isArray(value) && value.every(Number.isInteger),
        equals: (a, b) =>
          a.length === b.length && a.every((x, i) => x === b[i]),
        pattern: /[0-9]+(?:-[0-9]+)*/,
      },
    },
  },
});
```

Use the custom type in a state URL:

```js
angular.getModule('app').router({
  name: 'report',
  url: '/reports/{ids:intarray}',
  component: 'Report',
});

// $state.go('report', { ids: [10, 20, 30] }) → /reports/10-20-30
// /reports/10-20-30 → { ids: [10, 20, 30] }
```

Executable sample: [`param-types.html`](/examples/routing/param-types.html)

> **Note:** Register custom types in `$router.paramTypes` **before** any state
> that uses them.

## Hash mode vs HTML5 mode

AngularTS inherits Angular 1's `$location` modes. Configure the mode with
`module.config({ $location: ... })`:

### Hash mode (default)

URLs use a hash fragment: `http://example.com/app/#/contacts/42`. No server
configuration is needed; the hash segment is never sent to the server.

```js
angular.getModule('app').config({
  $location: {
    html5Mode: false,
    hashPrefix: '!', // optional: use #!/ instead of #/
  },
});
```

Generated hrefs are prefixed with `#` (plus the hash prefix) in hash mode.

### HTML5 mode (pushState)

URLs use real paths: `http://example.com/contacts/42`. The server must return
the app's `index.html` for all routes.

```js
angular.getModule('app').config({
  $location: {
    html5Mode: {
      enabled: true,
      requireBase: true, // <base href="..."> must be present in <head>
    },
  },
});
```

In HTML5 mode, generated hrefs use the base path rather than a hash.

## Base href

In HTML5 mode, the base href is read from the `<base>` tag in the document
`<head>`:

```html
<head>
  <base href="/myapp/" />
</head>
```

If no `<base>` tag is present, the runtime falls back to
`window.location.pathname`. The base href is used when constructing absolute
URLs via `$state.href(..., { absolute: true })` and when pushing new history
entries.

## Reading the current URL

Use `$location` to read URL components:

```js
$location.getPath(); // "/contacts/42"
$location.getSearch(); // { tab: 'notes' }
$location.getHash(); // "section1"
$location.getUrl(); // "/contacts/42?tab=notes#section1"
```

## Updating the URL

Use `$location.setUrl(newUrl)` to replace the current URL. The router then syncs
the matching state:

```js
$location.setUrl('/contacts/99?tab=history');
```

## URL rule priority and matching weight

When multiple rules could match the same URL, the router scores each match and
picks the winner:

1. Rules are sorted by a primary sort order (rules created from state
   declarations all share the same group).
2. Within a group, the match with the highest **weight** wins. Weight is
   computed by counting matched segments, typed parameters, and specificity of
   regexps.
3. A state URL like `/users/{id:int}` outweighs `/users/:id` for the path
   `/users/42` because the typed parameter provides a stricter match.

Exact path matches score higher than prefix matches. Query parameters do not
affect path scoring but must all be present if declared without defaults.

## Listening for URL changes

Listen for `$locationChangeSuccess` when code needs URL-level notifications:

```js
const deregister = $rootScope.on('$locationChangeSuccess', () => {
  console.log('URL changed to:', $location.getUrl());
});

// Stop listening
deregister();
```

When loading states asynchronously, register them before enabling navigation
links or calling `$state.go()` for URL-driven destinations:

```js
angular.getModule('app').run([
  '$stateRegistry',
  '$state',
  function ($stateRegistry, $state) {
    fetch('/api/states')
      .then((r) => r.json())
      .then(function (states) {
        states.forEach((s) => $stateRegistry.register(s));
        $state.go('home');
      });
  },
]);
```
