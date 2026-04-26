---
title: "Making HTTP requests with the $http service"
weight: 380
description: "Send requests with the $http service and configure defaults, transforms, interceptors, and XSRF behavior."
---

Use `$http` for application HTTP calls when you need request configuration,
response transforms, interceptors, or integration with AngularTS services.

This guide focuses on workflows. Exact call signatures and exported interfaces
live in TypeDoc:

- [`HttpService`](../../../typedoc/interfaces/HttpService.html)
- [`RequestConfig`](../../../typedoc/interfaces/RequestConfig.html)
- [`HttpResponse`](../../../typedoc/interfaces/HttpResponse.html)
- [`HttpInterceptor`](../../../typedoc/interfaces/HttpInterceptor.html)

## Basic Requests

```ts
$http.get<User>('/api/users/42').then(({ data }) => {
  this.user = data;
});
```

Use a full request config when method, URL, headers, params, timeout, response
type, or upload handlers need to be assembled together.

```ts
$http({
  method: 'POST',
  url: '/api/users',
  data: { name: 'Ada' },
  headers: { 'X-Trace': traceId },
}).then(({ data }) => {
  this.user = data;
});
```

## Query Parameters

`params` are appended to the URL using `$httpParamSerializer`.

```ts
$http.get<Article[]>('/api/articles', {
  params: {
    category: 'news',
    tags: ['featured', 'breaking'],
  },
});
```

The default serializer repeats array keys, JSON-encodes object values, sorts
keys alphabetically, and omits `null`, `undefined`, and function values.

## Request Bodies

Plain objects are JSON serialized by default. `FormData`, `Blob`, and `File`
values are sent as native browser payloads.

```ts
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

$http.post('/api/users/42/avatar', formData, {
  uploadEventHandlers: {
    progress(event: ProgressEvent) {
      this.progress = Math.round((event.loaded / event.total) * 100);
    },
  },
});
```

## Headers And Defaults

Set application-wide defaults during module configuration:

```ts
angular.module('app', []).config(($httpProvider) => {
  $httpProvider.defaults.headers.common.Authorization = 'Bearer token';
  $httpProvider.defaults.withCredentials = true;
});
```

Runtime defaults are available through `$http.defaults`:

```ts
angular.module('app').run(($http) => {
  $http.defaults.headers.common['X-App-Version'] = '2.1.0';
});
```

## Interceptors

Interceptors centralize cross-cutting request and response behavior such as auth
headers, retries, logging, and redirects.

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

## Error Handling

Rejected requests use the same response object shape as successful requests.
Use `status` for HTTP errors and `xhrStatus` for transport outcomes such as
timeouts and aborts.

```ts
$http.get<User>('/api/users/99').catch((error) => {
  if (error.xhrStatus === 'timeout') {
    this.error = 'Request timed out.';
  } else if (error.status === 404) {
    this.error = 'User not found.';
  } else if (error.status === 0) {
    this.error = 'Network error.';
  }
});
```

## XSRF

`$http` can read a configured XSRF cookie and send it in a configured request
header. Cross-origin APIs must be listed as trusted origins before AngularTS
sends the token to them.

```ts
angular.module('app', []).config(($httpProvider) => {
  $httpProvider.xsrfTrustedOrigins.push('https://api.example.com');
});
```

## Next Steps

- [HTTP directives]({{< relref "/docs/directives/http" >}}) for declarative
  request attributes in HTML.
- [`$rest` service]({{< relref "/docs/service/rest" >}}) for typed CRUD
  resources built on `$http`.
