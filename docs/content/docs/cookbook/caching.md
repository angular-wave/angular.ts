---
title: Cache REST reads
description: Add cache-first, network-first, or stale-while-revalidate behavior
weight: 16
---

## Problem

Reference data is requested repeatedly even though it changes infrequently.

## Before you start

Provide a [`RestCacheStore`](../../../typedoc/interfaces/RestCacheStore.html)
implementation and classify the response as public, user-specific, mutable, or
immutable before selecting a policy.

## Recipe

Start with a cache store. This in-memory version lasts until the page reloads:

<!-- tested-by: src/services/rest/rest.spec.ts -->

```js
class MemoryRestCache {
  entries = new Map();

  async get(key) {
    return this.entries.get(key);
  }
  async set(key, value) {
    this.entries.set(key, value);
  }
  async delete(key) {
    this.entries.delete(key);
  }
  async deletePrefix(prefix) {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }
}

const appCache = new MemoryRestCache();
```

The object implements
[`RestCacheStore`](../../../typedoc/interfaces/RestCacheStore.html). Replace it
with IndexedDB or another persistent store when cached data must survive a page
reload. Then wrap the HTTP REST backend:

<!-- tested-by: src/services/rest/rest.spec.ts -->

```ts
import {
  CachedRestBackend,
  HttpRestBackend,
} from '@angular-wave/angular.ts/services/rest';

const backend = new CachedRestBackend({
  network: new HttpRestBackend($http),
  cache: appCache,
  policy: ({ url }) =>
    url.startsWith('/api/catalog') ? 'stale-while-revalidate' : 'network-first',
});

const products = $rest<Product, number>('/api/catalog/products', Product, {
  backend,
});
```

[`CachedRestBackend`](../../../typedoc/classes/CachedRestBackend.html) accepts
any [`RestCacheStore`](../../../typedoc/interfaces/RestCacheStore.html). Use
memory for one-page reuse, IndexedDB for durable structured data, or the Cache
API for HTTP-style storage.

Choose the strategy by what stale data means:

| Strategy                 | Use it when                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `cache-first`            | Data is effectively immutable and startup speed matters most.     |
| `network-first`          | Fresh data matters, but cached data is a useful offline fallback. |
| `stale-while-revalidate` | Showing cached data now is better than waiting for a refresh.     |

Writes always go to the network first. Successful writes invalidate cached
collection and entity keys for that resource.

## Failure path

The wrong policy can expose another user’s data or preserve an invalid value.
Partition private caches and invalidate after every relevant write.

## Apply it now

Open the Network panel and find a GET that repeats during one normal task. Pick
a policy from the consequence of stale data: use `cache-first` for an immutable
country list, `network-first` for active orders, or `stale-while-revalidate` for
a product catalog. Perform a write and confirm the affected collection and
entity entries are invalidated. Never share user-specific cached responses
between signed-in users.

## Verify

Compare network requests before and after caching, then perform a write and an
offline read. Confirm invalidation and stale behavior match the selected policy.
