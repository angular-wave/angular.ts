---
title: $rest
description: >
  Typed REST resource client
---

The `$rest` service creates typed resource clients on top of `$http`. Use this
page for the usage model and examples. Exact class members, method signatures,
return types, and configuration interfaces live in TypeDoc:

- [`RestService`](../../../typedoc/classes/RestService.html)
- [`RestDefinition`](../../../typedoc/interfaces/RestDefinition.html)
- [`EntityClass`](../../../typedoc/interfaces/EntityClass.html)
- [`HttpService`](../../../typedoc/interfaces/HttpService.html)

## Creating A Resource

Inject `$rest` and call it with a base URL:

```ts
const posts = $rest<Post, number>('/api/posts');
```

The returned `RestService` supports common CRUD workflows:

```ts
const all = await posts.list();
const one = await posts.read(42);
const created = await posts.create({ title: 'Hello' } as Post);
const updated = await posts.update(42, { title: 'Updated' });
const deleted = await posts.delete(42);
```

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
const post = await posts.read(1);
```

When an entity class is supplied, response objects are passed through
`new entityClass(data)` before they are returned.

## Request Options

The third factory argument is merged into every `$http` request created by the
resource. Use it for headers, credentials, cache options, transforms, or custom
param serialization.

```ts
const posts = $rest<Post, number>('/api/posts', Post, {
  headers: { 'X-Tenant': tenantId },
  withCredentials: true,
});
```

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

The `org` value expands into the path. Remaining params are forwarded to
`$http` as query parameters.

## Provider Registration

Register definitions during configuration with `$restProvider.rest()` when a
resource should be available from shared setup code.

```ts
angular.module('app', []).config(($restProvider) => {
  $restProvider.rest('posts', '/api/posts', Post);
});
```

## Related

- [`$http` service]({{< relref "/docs/service/http" >}})
- [REST service guide]({{< relref "/docs/services/rest" >}})
