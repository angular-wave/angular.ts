---
title: "Typed REST Resources"
weight: 410
description: "Define typed CRUD endpoints once and use $rest for list, read, create, update, and delete flows backed by $http."
---

`$rest` wraps `$http` with a small typed resource client. Use it when several parts of an application need the same CRUD endpoint and you want the request shape, base URL, entity mapping, and default request options in one place.

Exact method signatures live in TypeDoc:

- [`RestService`](../../../typedoc/classes/RestService.html)
- [`RestDefinition`](../../../typedoc/interfaces/RestDefinition.html)
- [`EntityClass`](../../../typedoc/interfaces/EntityClass.html)
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

  readUser(id: number) {
    return this.users.read(id);
  }
}
```

## Use URI templates

`$rest` expands RFC 6570 templates before sending a request. Template variables are taken from the params object you pass to `list()` or `read()`.

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
const article = await articles.read(42);

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

## Related

- [$http service]({{< relref "/docs/services/http" >}})
- [Routing]({{< relref "/docs/services/routing" >}})
