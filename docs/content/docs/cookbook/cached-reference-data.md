---
title: Cache reference data without sharing user data
description: Cache stable lookup lists and invalidate them deliberately
weight: 29
---

## Problem

Country, currency, or category lists are downloaded repeatedly even though they
change rarely and are identical for every user.

## Before you start

Provide an application cache implementing the linked cache-store contract.
Confirm the endpoint is independent of user identity before sharing entries.

## Working example

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```ts
import {
  CachedRestBackend,
  HttpRestBackend,
} from '@angular-wave/angular.ts/services/rest';

const referenceBackend = new CachedRestBackend({
  network: new HttpRestBackend($http),
  cache: appCache,
  policy: ({ url }) =>
    url.startsWith('/api/reference/') ? 'cache-first' : 'network-first',
});

const countries = $rest<Country, string>('/api/reference/countries', Country, {
  backend: referenceBackend,
});
```

<!-- tested-by: src/docs-examples/cookbook-patterns.test.ts -->

```html
<label>
  Country
  <select
    ng-model="shipping.country"
    ng-options="country.code as country.name for country in countries"
  ></select>
</label>
```

The cached result is ordinary application state. Bind it like any other list;
the template does not need to know which cache policy supplied it.

## Server contract

The endpoint returns stable IDs, supports conditional HTTP caching, and never
varies by the signed-in user. Publish a version change when administrators
update the list.

## What AngularTS wires

The cached backend reads through the supplied
[`RestCacheStore`](../../../typedoc/interfaces/RestCacheStore.html). Successful
writes invalidate matching collection and entity entries automatically.

## Failure path

Do not place account, permission, price, or personalized responses in a shared
cache. Use `network-first` when stale data can block a current operation.

## Apply it now

Find a repeated GET in the Network panel. Prove its response is
user-independent, choose an acceptable stale lifetime, and identify the write
that invalidates it.

## Verify

Load the same form twice, test offline fallback, update the reference list, and
sign in as another user. Confirm the cache never crosses a user-specific
boundary.
