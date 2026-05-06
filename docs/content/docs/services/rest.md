---
title: "Typed REST Resources"
weight: 410
description: "Define typed REST endpoints once and use $rest for list, get, create, update, and delete flows backed by pluggable backends."
---

`$rest` wraps a REST backend with a small typed resource client. By default it uses `$http`; pass a custom backend when a resource should read from another data source or compose network and cache behavior.

Exact method signatures live in TypeDoc:

- [`RestService`](../../../typedoc/classes/RestService.html)
- [`RestDefinition`](../../../typedoc/interfaces/RestDefinition.html)
- [`EntityClass`](../../../typedoc/interfaces/EntityClass.html)
- [`RestBackend`](../../../typedoc/interfaces/RestBackend.html)
- [`RestCacheStore`](../../../typedoc/interfaces/RestCacheStore.html)
- [`CachedRestBackend`](../../../typedoc/classes/CachedRestBackend.html)
- [`HttpService`](../../../typedoc/interfaces/HttpService.html)

## Register a resource

Register shared resources in a config block. The provider stores resource definitions before the application starts, then the `$rest` factory uses the live `$http` service at runtime.

```typescript
class User {
  id: number;
  name: string;
  createdAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = new Date(data.created_at);
  }
}

angular.config(($restProvider: ng.RestProvider) => {
  $restProvider.rest("users", "/api/users", User, {
    timeout: 5000,
    withCredentials: true,
  });
});
```

The resource name is informational in the current API. The URL can be a plain path or an RFC 6570 URI template.

## Create a resource at runtime

Inject `$rest` anywhere you need a resource client. This keeps controllers and services focused on the workflow instead of repeating request setup.

```typescript
class UserRepository {
  static $inject = ["$rest"];

  private users: ng.RestService<User, number>;

  constructor($rest: ng.RestFactory) {
    this.users = $rest<User, number>("/api/users", User);
  }

  listAdmins() {
    return this.users.list({ role: "admin" });
  }

  getUser(id: number) {
    return this.users.get(id);
  }
}
```

## Use URI templates

`$rest` expands RFC 6570 templates before sending a request. Template variables are taken from the params object you pass to `list()` or `get()`.

```typescript
const issues = $rest<Issue>(
  "/api/repos/{owner}/{repo}/issues{?labels*}",
  Issue,
);

const openBugs = await issues.list({
  owner: "angular-wave",
  repo: "angular.ts",
  labels: ["bug", "ui"],
});
```

Params that are not consumed by the template are forwarded to `$http` as query params.

## Map server data to classes

Pass an entity class when the raw response needs normalization, computed properties, or methods.

```typescript
class Article {
  id: number;
  title: string;
  publishedAt: Date;

  constructor(data: any) {
    this.id = data.id;
    this.title = data.title;
    this.publishedAt = new Date(data.published_at);
  }

  get isPublished() {
    return this.publishedAt.getTime() <= Date.now();
  }
}

const articles = $rest<Article, number>("/api/articles", Article);
const article = await articles.get(42);

if (article?.isPublished) {
  // article is a real Article instance.
}
```

If you omit the entity class, `$rest` returns the parsed response data as-is.

## Handle writes

`create()` sends `POST`, `update()` sends `PUT`, and `delete()` sends `DELETE`. The methods intentionally stay close to HTTP semantics so errors and interceptors still flow through `$http`.

```typescript
class ArticleController {
  static $inject = ["$rest"];

  private articles: ng.RestService<Article, number>;
  items: Article[] = [];

  constructor($rest: ng.RestFactory) {
    this.articles = $rest<Article, number>("/api/articles", Article);
  }

  async publish(draft: Partial<Article>) {
    const created = await this.articles.create(draft as Article);
    this.items.unshift(created as Article);
  }

  async rename(id: number, title: string) {
    const updated = await this.articles.update(id, { title });
    if (updated) {
      this.items = this.items.map((item) =>
        item.id === id ? (updated as Article) : item,
      );
    }
  }

  async remove(id: number) {
    if (await this.articles.delete(id)) {
      this.items = this.items.filter((item) => item.id !== id);
    }
  }
}
```

`$rest` does not perform framework-property cleanup itself. With the default
HTTP backend, `$http` deproxies scope payloads before JSON serialization, so
proxy helpers such as `$target`, `$handler`, and `$proxy` do not reach the
server. Generated repeat identity is stored as internal metadata rather than on
your model object, so it is not included in request bodies. Explicit
application-owned properties remain part of the payload.

## Use a cached backend

`CachedRestBackend` wraps a network backend and an async cache store. The default HTTP backend remains available through `HttpRestBackend`, while cache storage can be memory, IndexedDB, the Cache API, or any object that implements `RestCacheStore`.

```typescript
import {
  CachedRestBackend,
  HttpRestBackend,
} from "@angular-wave/angular.ts/services/rest";
import type {
  RestCacheStore,
  RestResponse,
} from "@angular-wave/angular.ts/services/rest";

class MapRestCacheStore implements RestCacheStore {
  private cache = new Map<string, RestResponse<unknown>>();

  async get<T>(key: string): Promise<RestResponse<T> | undefined> {
    return this.cache.get(key) as RestResponse<T> | undefined;
  }

  async set<T>(key: string, response: RestResponse<T>): Promise<void> {
    this.cache.set(key, response as RestResponse<unknown>);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePrefix(prefix: string): Promise<void> {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new MapRestCacheStore();
const backend = new CachedRestBackend({
  network: new HttpRestBackend($http),
  cache,
  strategy: "network-first",
});

const articles = $rest<Article, number>("/api/articles", Article, {
  backend,
});
```

Supported read strategies are `cache-first`, `network-first`, and `stale-while-revalidate`. Writes always go to the network backend first; successful writes invalidate cached collection and entity keys for the resource.

Cache keys are generated by `CachedRestBackend`. A `RestCacheStore` receives the
final key string in `get()`, `set()`, `delete()`, and `deletePrefix()` and should
treat that key as opaque. `createRestCacheKey()` is an internal REST module
helper, not a top-level namespace API.

## Write a custom backend

A custom backend implements `RestBackend`. It receives normalized requests and
returns raw response data for `RestService` to map.

```typescript
class IndexedDbRestBackend implements ng.RestBackend {
  async request<T>(request: ng.RestRequest): Promise<ng.RestResponse<T>> {
    if (request.method === "GET") {
      return { data: (await readFromDb(request.url)) as T };
    }

    throw new Error(`Unsupported method: ${request.method}`);
  }
}

const articles = $rest<Article, number>("/api/articles", Article, {
  backend: new IndexedDbRestBackend(),
});
```

Use `HttpRestBackend` when the backend should delegate to `$http`, and wrap it
with `CachedRestBackend` when reads should use one of the cache strategies.

## CRUD demo

The demo at `/src/services/rest/rest-crud-demo.html` uses the Express demo
server through `/api/tasks`. It shows `list()`, `get()`, `create()`, `update()`,
and `delete()` against a real HTTP endpoint, renders rows with `ng-repeat`, and
includes a cache strategy toggle for `network-first`, `cache-first`, and
`stale-while-revalidate`.

## Related

- [$http service]({{< relref "/docs/services/http" >}})
- [Routing]({{< relref "/docs/services/routing" >}})
