---
title: Load server data
weight: 30
description:
  Own AngularTS HTTP requests, cancellation, stale-result protection, and
  explicit screen states.
---

## Represent request state explicitly

Do not use `tasks.length === 0` to mean both “not loaded” and “loaded empty.”

```ts
type LoadState = 'idle' | 'loading' | 'ready' | 'error';

class TaskList {
  state: LoadState = 'idle';
  tasks: Task[] = [];
  error = '';
}
```

## Put transport behavior in a repository

```ts
app.factory('taskRepository', [
  '$http',
  ($http) => ({
    list: (cancelled) =>
      $http
        .get('/api/tasks', { timeout: cancelled })
        .then((response) => response.data),
  }),
]);
```

The timeout promise should resolve when the component is destroyed or a newer
query supersedes the request. Cancellation saves work; a request sequence or
identity check still protects against transports that complete while
cancellation is racing.

Set loading before starting. On success, replace the collection property so
typed readers observe the commit. In `finally`, clear loading only if the
completing request is still current. Render loading, stale data, empty success,
recoverable error, and permission failure deliberately.

Use the [`$http` guide](/docs/services/http/) for interceptors, defaults,
caching, and response contracts.
