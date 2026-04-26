---
title: $http
description: >
  HTTP client service
---

The `$http` service is AngularTS's built-in HTTP client. Use this page for the
behavioral model and common examples. For exact method signatures, parameters,
return types, and interfaces, use the generated TypeDoc reference:

- [`HttpService`](../../../typedoc/interfaces/HttpService.html)
- [`RequestConfig`](../../../typedoc/interfaces/RequestConfig.html)
- [`RequestShortcutConfig`](../../../typedoc/interfaces/RequestShortcutConfig.html)
- [`HttpResponse`](../../../typedoc/interfaces/HttpResponse.html)
- [`HttpInterceptor`](../../../typedoc/interfaces/HttpInterceptor.html)

## Usage

Call `$http` with a full request configuration when you need explicit control:

```ts
$http<User>({
  method: 'GET',
  url: '/api/users/42',
}).then((response) => {
  user = response.data;
});
```

For common HTTP verbs, use shorthand methods:

```ts
$http.get<User>('/api/users/42').then(({ data }) => {
  user = data;
});

$http.post<User>('/api/users', {
  name: 'Ada',
  email: 'ada@example.com',
});
```

## Request Behavior

Plain objects are serialized as JSON by the default request transform. `File`,
`Blob`, and `FormData` values are sent as-is so the browser can set the correct
transport headers.

Query parameters are serialized by `$httpParamSerializer`. Arrays produce
repeated keys, objects are JSON encoded, and `null`, `undefined`, and functions
are omitted.

```ts
$http.get<Article[]>('/api/articles', {
  params: {
    category: 'news',
    tags: ['featured', 'breaking'],
  },
});
```

## Response Behavior

Successful 2xx responses resolve with an `HttpResponse<T>`. Non-2xx responses,
timeouts, aborts, and network errors reject with the same response shape, so
error handlers can inspect `status`, `statusText`, `headers`, `config`, and
`xhrStatus`.

```ts
$http.get<User>('/api/users/99').catch((error) => {
  if (error.xhrStatus === 'timeout') {
    message = 'Request timed out.';
  } else if (error.status === 404) {
    message = 'User not found.';
  }
});
```

## Defaults

Configure defaults before bootstrap with `$httpProvider.defaults`, or mutate
runtime defaults through `$http.defaults`.

```ts
angular.module('app', []).config(($httpProvider) => {
  $httpProvider.defaults.headers.common.Authorization = 'Bearer token';
  $httpProvider.defaults.withCredentials = true;
});
```

Default response transforms strip AngularJS JSON protection prefixes and parse
JSON responses automatically.

## Interceptors

Interceptors are registered with `$httpProvider.interceptors`. Request hooks run
in registration order; response hooks run in reverse order.

```ts
angular.module('app', []).config(($httpProvider) => {
  $httpProvider.interceptors.push(() => ({
    request(config) {
      config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
      return config;
    },

    responseError(rejection) {
      if (rejection.status === 401) {
        window.location.href = '/login';
      }

      return Promise.reject(rejection);
    },
  }));
});
```

## XSRF

`$http` reads the configured XSRF cookie and sends it in the configured XSRF
header for trusted origins. Add cross-origin APIs explicitly:

```ts
angular.module('app', []).config(($httpProvider) => {
  $httpProvider.xsrfTrustedOrigins.push('https://api.example.com');
});
```

## Related

- [HTTP directive guide]({{< relref "/docs/directives/http" >}})
- [REST service guide]({{< relref "/docs/services/rest" >}})
- [`$rest` service]({{< relref "/docs/service/rest" >}})
