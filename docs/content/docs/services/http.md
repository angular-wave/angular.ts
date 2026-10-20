---
title: 'Making HTTP requests with the $http service'
linkTitle: 'HTTP requests'
weight: 380
description:
  'Send requests with the $http service and configure defaults, transforms,
  interceptors, and XSRF behavior.'
---

Use the Fetch-based `$http` service for application HTTP calls when you need
request configuration, response transforms, interceptors, or integration with
AngularTS services.

This guide focuses on workflows. Exact call signatures and exported interfaces
live in TypeDoc:

- [`HttpService`](../../../typedoc/interfaces/HttpService.html)
- [`HttpRequestConfig`](../../../typedoc/interfaces/HttpRequestConfig.html)
- [`HttpRequestOptions`](../../../typedoc/interfaces/HttpRequestOptions.html)
- [`HttpDefaults`](../../../typedoc/interfaces/HttpDefaults.html)
- [`HttpResponse`](../../../typedoc/interfaces/HttpResponse.html)
- [`HttpError`](../../../typedoc/classes/HttpError.html)
- [`HttpInterceptor`](../../../typedoc/interfaces/HttpInterceptor.html)

## Basic Requests

```ts
$http.get<User>('/api/users/42').then(({ data }) => {
  this.user = data;
});
```

Use a full request config when method, URL, headers, params, timeout, response
type, credentials, or cancellation signals need to be assembled together.

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
  headers: { 'Content-Type': undefined },
});
```

Fetch does not expose upload progress events. Use the returned promise to track
completion or failure. The browser supplies the multipart boundary for
`FormData`. Clear `$http`'s default JSON `Content-Type` header as above; do not
supply a multipart header yourself. For a raw `File` or `Blob`, clear the header
to let Fetch use the payload's MIME type, or set the endpoint's expected content
type explicitly.

## Cancellation And Timeouts

Pass a native `AbortSignal` to cancel a request. `timeout` accepts milliseconds
and remains active until the buffered response body has been read. A positive
timeout rejects with `transportStatus: 'timeout'`; cancellation through `signal`
rejects with `transportStatus: 'abort'`, including when the signal is already
aborted.

```ts
const controller = new AbortController();
const request = $http.get('/api/search', {
  signal: controller.signal,
  timeout: 5000,
});

controller.abort();
await request.catch((error) => {
  if (error.transportStatus !== 'abort') throw error;
});
```

Zero and negative timeout values disable the timer. With
`responseType: 'stream'`, the timer ends when the stream is returned, so it does
not limit later stream consumption. The signal can still cancel the underlying
response body while you consume it. Create a new controller for each
independently cancellable operation; an aborted signal cannot be reused for a
later request.

## Credentials

`credentials` accepts Fetch's `'omit'`, `'same-origin'`, and `'include'` modes.

| Mode            | Browser-managed credentials                                    |
| --------------- | -------------------------------------------------------------- |
| `'omit'`        | Excluded, even for the current origin                          |
| `'same-origin'` | Included for the current origin; the default                   |
| `'include'`     | Included for cross-origin requests when browser policy permits |

```ts
const { data } = await $http.get<User>('https://api.example.com/me', {
  credentials: 'include',
});
```

The API server must permit credentialed CORS requests, and browser cookie
policies still apply. This setting does not remove an `Authorization` header you
explicitly supplied.

## Headers And Defaults

Set application-wide defaults during module configuration:

```ts
angular.createModule('app', []).config({
  $http: {
    defaults: {
      headers: {
        common: {
          Authorization: 'Bearer token',
        },
      },
      credentials: 'include',
    },
  },
});
```

Defaults cover headers, credentials, transforms, caching, parameter
serialization, and XSRF names. `timeout`, `signal`, and `responseType` belong to
individual requests, not `$http.defaults`.

Runtime defaults are available through `$http.defaults`:

```ts
angular.getModule('app').run([
  '$http',
  ($http) => {
    $http.defaults.headers.common['X-App-Version'] = '2.1.0';
  },
]);
```

Per-request headers override defaults case-insensitively. Set a header to
`undefined` or `null` to omit it. Header factory functions receive the request
configuration; returning `undefined` or `null` omits that header too.

## Response Readers And Transforms

The default reader produces text, then the default response transform strips the
JSON protection prefix and parses JSON responses. It parses JSON objects and
arrays even without a JSON content type. A response declaring JSON with invalid
JSON rejects instead of silently returning the text.

Choose a `responseType` for a different body shape:

| `responseType`      | Body before response transforms               |
| ------------------- | --------------------------------------------- |
| `'text'` or omitted | String                                        |
| `'json'`            | Parsed JSON, or `null` for an empty body      |
| `'blob'`            | Blob                                          |
| `'arraybuffer'`     | ArrayBuffer                                   |
| `'document'`        | HTML document parsed with DOMParser           |
| `'stream'`          | Readable response body, or `null` when absent |

Setting `responseType: 'text'` does not disable JSON transforms. Preserve raw
text explicitly:

```ts
const { data: text } = await $http.get<string>('/api/raw-export', {
  responseType: 'text',
  transformResponse: [],
});
```

`transformRequest` and `transformResponse` accept a function or an array. A
request-level pipeline replaces the default; append to
`$http.defaults.transformResponse` when the default parsing must run first:

```ts
const defaults = $http.defaults.transformResponse ?? [];
const transforms = Array.isArray(defaults) ? defaults : [defaults];

const { data } = await $http.get<User[]>('/api/users', {
  transformResponse: [
    ...transforms,
    (body) => (body as { items: User[] }).items,
  ],
});
```

For `responseType: 'stream'`, `$http` skips implicit response transforms and
resolves when the body stream is available. Consume it through `$stream` or a
native reader, and handle errors during consumption separately. An explicitly
supplied response transform still runs.

## Cache GET Requests

Use `cache: true` to reuse successful GET responses and share pending requests
for the same URL, including serialized params. That cache does not include
headers in its key. `cache: false` overrides a default cache; write requests are
not cached.

For a strategy and optional store, use
[`HttpCacheConfig`](../../../typedoc/interfaces/HttpCacheConfig.html):

```ts
const { data } = await $http.get('/api/catalog', {
  cache: { strategy: 'network-first', store: catalogCache },
});
```

See [Cache REST reads]({{< relref "/docs/cookbook/caching" >}}) for reusable
resource caching and invalidation.

## Interceptors

Interceptors centralize cross-cutting request and response behavior such as auth
headers, retries, logging, and redirects.

Request hooks run in registration order; response hooks run in reverse order.
Each hook may return a value or a promise. Error hooks recover by returning a
configuration or response; throwing or returning a rejected promise keeps the
failure in the chain.

```ts
angular.createModule('app', []).config({
  $http: {
    interceptors: [
      () => ({
        request(config) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          };
          return config;
        },

        responseError(rejection) {
          if (
            rejection !== null &&
            typeof rejection === 'object' &&
            'status' in rejection &&
            rejection.status === 401
          ) {
            window.location.href = '/login';
          }

          return Promise.reject(rejection);
        },
      }),
    ],
  },
});
```

## Error Handling

HTTP and transport failures reject with
[`HttpError`](../../../typedoc/classes/HttpError.html), an `Error` exposing the
response fields directly and through `error.response`. Use `status` for HTTP
errors and `transportStatus` for transport outcomes. A server's 4xx or 5xx
response has `transportStatus: 'complete'`: the transport completed, but the
HTTP status caused rejection.

```ts
$http.get<User>('/api/users/99').catch((error) => {
  if (error.transportStatus === 'timeout') {
    this.error = 'Request timed out.';
  } else if (error.transportStatus === 'abort') {
    return;
  } else if (error.status === 404) {
    this.error = 'User not found.';
  } else {
    throw error;
  }
});
```

`'error'` covers transport/body-reader failures and security-policy rejection.
There is no positive HTTP status when Fetch fails before a response is
available. Configuration, transform, and interceptor failures can reject with
other error types, so avoid assuming every error has HTTP metadata.

## XSRF

`$http` can read a configured XSRF cookie and send it in a configured request
header. The current origin is trusted automatically. The default names are
`XSRF-TOKEN` for the cookie and `X-XSRF-TOKEN` for the header. Cross-origin APIs
must be listed as trusted origins before AngularTS sends the token to them.

```ts
angular.createModule('app', []).config({
  $http: {
    xsrfTrustedOrigins: ['https://api.example.com'],
  },
});
```

Trust applies to every path on that origin. It does not enable CORS or select
`credentials`; configure those independently.

## Migrating From Legacy HTTP Options

- Replace promise-valued `timeout` cancellation with `signal` from an
  `AbortController`, and call `abort()` to cancel. Numeric timeouts still work.
- Replace `withCredentials: true` with `credentials: 'include'`, and `false`
  with `'same-origin'`. Use `'omit'` to exclude browser credentials entirely.
- Read `transportStatus` on responses and errors instead of `xhrStatus`.
- Replace `eventHandlers` with promise handlers or `await` and `try`/`catch`.
  `uploadEventHandlers` has been removed because Fetch does not support it.

These are breaking replacements; the old HTTP option names are not aliases. The
separate `$sse` service retains `withCredentials` because it uses native
EventSource rather than Fetch. HTTP directive success/error expressions and SSE
lifecycle events remain available.

## Next Steps

- [$http behavior reference]({{< relref "/docs/service/http" >}}) for response
  semantics, headers, and transport status values.
- [HTTP directives]({{< relref "/docs/directives/http" >}}) for declarative
  request attributes in HTML.
- [`$rest` service]({{< relref "/docs/service/rest" >}}) for typed CRUD
  resources built on `$http`.
