---
title: Read and write REST resources
description: Define a typed endpoint once and use it for CRUD operations
weight: 14
---

## Problem

Several screens call the same endpoint and repeat URL construction, response
mapping, and CRUD request code.

## Before you start

Register `$rest` and `$http` in the application that owns the data. Define
stable resource IDs and the server methods supported by the endpoint.

## Recipe

Create one typed resource with `$rest`:

<!-- tested-by: src/services/rest/rest.spec.ts -->

```ts
interface Task {
  id: number;
  title: string;
  complete: boolean;
}

class TaskRepository {
  static $inject = ['$rest'];

  private tasks: ng.RestService<Task, number>;

  constructor($rest: ng.RestFactory) {
    this.tasks = $rest<Task, number>('/api/tasks');
  }

  list() {
    return this.tasks.list();
  }

  get(id: number) {
    return this.tasks.get(id);
  }
}
```

[`RestService`](../../../typedoc/classes/RestService.html) provides `list()`,
`get()`, `create()`, `update()`, and `delete()`. Writes stay close to HTTP:

<!-- tested-by: src/services/rest/rest.spec.ts -->

```ts
const created = await tasks.create({
  title: 'Write release notes',
  complete: false,
});
if (!created) throw new Error('Task response was empty');

await tasks.update(created.id, {
  ...created,
  complete: true,
});

await tasks.delete(created.id);
```

`create()` sends `POST`, `update()` sends `PUT`, and `delete()` sends `DELETE`.

## Prefetch data before the user clicks

Start a JSON request when the pointer enters a preview, but keep the result
hidden until the user asks for it:

<!-- tested-by: src/directive/http/prefetch.spec.ts -->

```html
<div
  ng-get="/api/products/42/preview"
  data-trigger="mouseenter"
  data-throttle="60000"
  on-success="preview = $res"
>
  <button type="button" ng-click="showPreview = true">Show preview</button>

  <div
    ng-if="showPreview && !preview"
    ng-get="/api/products/42/preview"
    data-trigger="load"
    on-success="preview = $res"
  >
    Loading preview...
  </div>

  <section ng-if="showPreview && preview">
    <h3>{{ preview.name }}</h3>
    <p>{{ preview.summary }}</p>
  </section>
</div>
```

`mouseenter` starts the first request without revealing anything. AngularTS
parses the JSON response and `on-success` stores it on scope. When the user
clicks, `ng-click` changes only `showPreview`; if `preview` is ready, `ng-if`
renders it immediately without another request.

The inner `ng-get` is the fallback for keyboard, touch, and fast clicks. It is
created only when the preview is requested but no prefetched value is ready, and
`data-trigger="load"` starts the request immediately. A click made while the
hover request is still in flight can briefly create a second GET request. Use a
shared cached service when request deduplication matters.

Prefer `mouseenter` to `mouseover` for prefetching. `mouseover` bubbles when the
pointer crosses children and can issue repeated requests. The throttle limits
later pointer-triggered refreshes, but it is not a durable cache. Errors reject
normally, so the caller decides how to render retry and error states.

## Failure path

Treat empty create responses, conflicts, cancellation, and stale replies
explicitly. Do not assume every successful write returns an entity body.

## Apply it now

Identify data users often need immediately after hovering, focusing, or opening
a panel. Measure the normal click-to-content delay, add intent prefetching, and
measure it again. Decide what touch and keyboard users should trigger, how long
the result may stay fresh, and whether a duplicate in-flight GET is acceptable.

## Verify

Inspect request methods and bodies for list, create, update, and delete. Repeat
the prefetched interaction with mouse, keyboard, touch emulation, and a delayed
response.
