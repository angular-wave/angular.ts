---
title: $rest
description: >
  Typed REST resource client
---

The `$rest` service creates typed resource clients on top of a REST backend. Use
this page for the usage model and examples. Exact class members, method
signatures, return types, and configuration interfaces live in TypeDoc:

- [`RestService`](../../../typedoc/classes/RestService.html)
- [`EntityClass`](../../../typedoc/types/EntityClass.html)
- [`RestBackend`](../../../typedoc/interfaces/RestBackend.html)
- [`RestCacheStore`](../../../typedoc/interfaces/RestCacheStore.html)
- [`CachedRestBackend`](../../../typedoc/classes/CachedRestBackend.html)
- [`HttpService`](../../../typedoc/interfaces/HttpService.html)

## Creating A Resource

Inject `$rest` and call it with a base URL:

```ts
const posts = $rest<Post, number>('/api/posts');
```

The returned [`RestService`](../../../typedoc/classes/RestService.html) supports
common CRUD workflows:

```ts
const all = await posts.list();
const one = await posts.get(42);
const created = await posts.create({ title: 'Hello' } as Post);
const updated = await posts.update(42, { title: 'Updated' });
await posts.delete(42);
```

`get()`, `create()`, and `update()` return `null` when the backend returns no
entity. `delete()` resolves with no value. All backend failures reject instead
of being converted into fallback values.

## Entity Mapping

Pass an entity class when raw JSON should be converted into richer objects.

```ts
class Post {
  id!: number;
  title!: string;
  createdAt: Date;

  constructor(raw: any) {
    Object.assign(this, raw);
    this.createdAt = new Date(raw.created_at);
  }
}

const posts = $rest<Post, number>('/api/posts', Post);
const post = await posts.get(1);
```

When an entity class is supplied, response objects are passed through
`new entityClass(data)` before they are returned.

## Request Options

The third factory argument is merged into backend requests. With the default
HTTP backend, use it for headers, credentials, cache options, transforms, or
custom param serialization.

```ts
const posts = $rest<Post, number>('/api/posts', Post, {
  headers: { 'X-Tenant': tenantId },
  withCredentials: true,
});
```

Pass `backend` when a resource should use a custom backend. The backend receives
a normalized [`RestRequest`](../../../typedoc/interfaces/RestRequest.html) with
expanded URLs, params, request data, collection URL, and resource id. This is
the extension point for tests, local persistence, IndexedDB, the browser Cache
API, or composed network/cache behavior.

For cached reads, wrap the HTTP backend with
[`CachedRestBackend`](../../../typedoc/classes/CachedRestBackend.html):

```ts
const posts = $rest<Post, number>('/api/posts', Post, {
  backend: new CachedRestBackend({
    network: new HttpRestBackend($http),
    cache: appCache,
    strategy: 'network-first',
  }),
});
```

`createRestCacheKey()` is used internally by
[`CachedRestBackend`](../../../typedoc/classes/CachedRestBackend.html); it is
not part of the top-level AngularTS namespace. Cache stores receive the final
key string through the
[`RestCacheStore`](../../../typedoc/interfaces/RestCacheStore.html) methods and
should treat it as opaque.

## Request Bodies

When the default HTTP backend is used, request data is serialized by `$http`.
Scope proxies are deproxied before JSON serialization, so proxy helper
properties such as `_target`, `_handler`, and `_proxy` are not sent to the
server. AngularTS-generated repeat identity is stored in internal metadata, not
on the object, so it is not included in write payloads either.

Explicit application-owned fields are still normal data. If your model defines a
property such as `$hashKey`, `$rest` does not remove it.

## URI Templates

Resource URLs support RFC 6570 URI templates. Variables wrapped in braces are
expanded from the params passed to methods such as `list()`.

```ts
const repos = $rest<Repo>('/api/{org}/repos');

const angularRepos = await repos.list({
  org: 'angular-wave',
  type: 'public',
});
```

The `org` value expands into the path. Remaining params are forwarded to `$http`
as query parameters.

## Shared Defaults

Configure shared request defaults before bootstrap when a group of resources
should use the same backend behavior.

```ts
angular.createModule('app', []).config({
  $rest: {
    defaults: {
      withCredentials: true,
      timeout: 5000,
    },
  },
});
```

## Demo

The CRUD demo at `/src/services/rest/rest-crud-demo.html` talks to the Go demo
backend through `/api/tasks`. It uses `ng-repeat` for rows, `$rest` for CRUD
operations, and a cache strategy toggle for `network-first`, `cache-first`, and
`stale-while-revalidate`.

## Related

- [`$http` service]({{< relref "/docs/service/http" >}})
- [REST service guide]({{< relref "/docs/services/rest" >}})
