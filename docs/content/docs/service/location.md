---
title: '$location'
description:
  'Normalize and update browser URLs across HTML5 and hashbang modes.'
---

`$location` parses the browser URL into path, search, hash, and state pieces.
Changes made through `$location` update the browser address bar, and browser
navigation updates the service.

Exact signatures live in TypeDoc:

- [`Location`](../../../typedoc/classes/Location.html)
- [`Html5Mode`](../../../typedoc/interfaces/Html5Mode.html)

## Read The Current URL

```ts
$location.getPath();
$location.getSearch();
$location.getHash();
$location.getUrl();
$location.absUrl;
```

## Update The URL

```ts
$location.setPath('/settings').setSearch({ tab: 'profile' }).setHash('details');
```

Setter methods return `$location`, so updates can be chained. Changes made in
one turn are applied asynchronously as one history entry and one navigation
event pair. A `$locationChangeStart` listener can cancel or redirect that
update.

Use `setSearchParam()` when only one query parameter should change. Passing
`null` or `undefined` removes that parameter.

```ts
$location.setSearchParam('page', 2);
$location.setSearchParam('filter', null);
```

## History State

In HTML5 mode, `setState()` schedules a history update even when the URL stays
the same. The browser clones the state when the update commits; `getState()`
then returns the committed state.

```ts
$location.setState({ selectedTab: 'profile' });
```

Hash mode keeps routing in the fragment and rejects `setState()`. Both modes use
the native History API and follow browser Back and Forward navigation. Initial
URL normalization replaces the current entry and preserves its state. Router
transitions using `{ location: "replace" }` also replace the current entry in
either mode without treating the replacement flag as history state.

Query strings retain bare flags (`?debug`) and repeated parameters
(`?tag=one&tag=two`). Path, query, and fragment encoding remain distinct.

## Navigation Events

`$locationChangeStart` is broadcast on `$rootScope` before the URL changes. Call
`event.preventDefault()` from a listener to cancel the navigation.

`$locationChangeSuccess` is broadcast after the URL changes. In HTML5 mode,
listeners also receive the new and old history state values. Failed history
writes restore the previous URL and state, report the error through
`$exceptionHandler`, and do not emit a success event.

```ts
$rootScope.on('$locationChangeStart', (event, newUrl, oldUrl) => {
  if (shouldBlock(newUrl, oldUrl)) {
    event.preventDefault();
  }
});

$rootScope.on('$locationChangeSuccess', (_event, newUrl) => {
  analytics.track('page_view', { url: newUrl });
});
```

## Configure

Use `module.config({ $location: ... })` for application-wide URL policy.

```js
angular.createModule('app', []).config({
  $location: {
    html5Mode: {
      enabled: true,
      requireBase: false,
      rewriteLinks: true,
    },
    hashPrefix: '!',
  },
});
```

`html5Mode` may also be a boolean when only the `enabled` flag should change:

```js
angular.createModule('app', []).config({
  $location: {
    html5Mode: false,
  },
});
```

Executable sample: [`location.html`](/examples/config/location.html)
