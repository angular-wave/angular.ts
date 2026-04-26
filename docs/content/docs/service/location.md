---
title: "$location"
description: "Normalize and update browser URLs across HTML5 and hashbang modes."
---

`$location` parses the browser URL into path, search, hash, and state pieces.
Changes made through `$location` update the browser address bar, and browser
navigation updates the service.

Exact signatures live in TypeDoc:

- [`Location`](../../../typedoc/classes/Location.html)
- [`LocationProvider`](../../../typedoc/classes/LocationProvider.html)
- [`Html5Mode`](../../../typedoc/interfaces/Html5Mode.html)

## Read The Current URL

```typescript
$location.path();
$location.search();
$location.hash();
$location.url();
$location.absUrl();
```

## Update The URL

```typescript
$location
  .path("/settings")
  .search({ tab: "profile" })
  .hash("details");
```

Setter methods return `$location`, so updates can be chained.

## Navigation Events

`$locationChangeStart` is broadcast on `$rootScope` before the URL changes. Call
`event.preventDefault()` from a listener to cancel the navigation.

`$locationChangeSuccess` is broadcast after the URL changes. In HTML5 mode,
listeners may also receive the new and old history state values when the browser
supports the History API.

```typescript
$rootScope.$on("$locationChangeStart", (event, newUrl, oldUrl) => {
  if (shouldBlock(newUrl, oldUrl)) {
    event.preventDefault();
  }
});

$rootScope.$on("$locationChangeSuccess", (_event, newUrl) => {
  analytics.track("page_view", { url: newUrl });
});
```

For provider configuration, see [$locationProvider]({{< relref "/docs/provider/locationProvider" >}}).
