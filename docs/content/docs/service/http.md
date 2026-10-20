---
title: $http
description: >
  HTTP client service
---

The `$http` service is AngularTS's Fetch-based HTTP client. Use this page for
the behavioral model and common examples. For exact method signatures,
parameters, return types, and interfaces, use the generated TypeDoc reference:

- [`HttpService`](../../../typedoc/interfaces/HttpService.html)
- [`HttpRequestConfig`](../../../typedoc/interfaces/HttpRequestConfig.html)
- [`HttpRequestOptions`](../../../typedoc/interfaces/HttpRequestOptions.html)
- [`HttpDefaults`](../../../typedoc/interfaces/HttpDefaults.html)
- [`HttpResponse`](../../../typedoc/interfaces/HttpResponse.html)
- [`HttpError`](../../../typedoc/classes/HttpError.html)
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

Plain objects and arrays are serialized as JSON by the default request
transform. `File`, `Blob`, and `FormData` values are sent as native browser
payloads. POST, PUT, and PATCH default to
`Content-Type: application/json;charset=utf-8`. Clear that default for multipart
uploads so Fetch can supply the boundary:

```ts
const body = new FormData();
body.append('avatar', file);

await $http.post('/api/users/42/avatar', body, {
  headers: { 'Content-Type': undefined },
});
```

For a raw file or blob, either clear the header to use its MIME type or set the
content type expected by the endpoint. Fetch does not expose upload progress;
use the returned promise to track completion and failure.

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

Successful 2xx responses resolve with an
[`HttpResponse<T>`](../../../typedoc/interfaces/HttpResponse.html). Non-2xx
responses, timeouts, aborts, and network errors reject with an
[`HttpError`](../../../typedoc/classes/HttpError.html). It extends `Error`,
exposes `data`, `status`, `statusText`, `headers`, `config`, and
`transportStatus` directly, and retains the response object as `error.response`.

| `transportStatus` | Meaning                                                             | Promise outcome                              |
| ----------------- | ------------------------------------------------------------------- | -------------------------------------------- |
| `'complete'`      | An HTTP response was received and its selected body reader finished | Resolves for 2xx; rejects for other statuses |
| `'error'`         | Fetch/body reading failed, or a security policy blocked the request | Rejects                                      |
| `'timeout'`       | The numeric timeout expired                                         | Rejects                                      |
| `'abort'`         | The supplied signal cancelled the request                           | Rejects                                      |

Use `status` to distinguish HTTP errors such as 404 from transport failures.
Configuration, transform, and interceptor failures can reject with other error
types; `transportStatus` is not guaranteed on every rejection.

```ts
$http.get<User>('/api/users/99').catch((error) => {
  if (error.transportStatus === 'timeout') {
    message = 'Request timed out.';
  } else if (error.status === 404) {
    message = 'User not found.';
  } else {
    throw error;
  }
});
```

`headers('Content-Type')` reads a response header case-insensitively and returns
an empty string when absent. `headers()` returns all available response headers
with lowercase names.

## Cancellation And Credentials

Pass a native `AbortSignal` to cancel a request. `timeout` accepts a number of
milliseconds; only positive values start a timer. A pre-aborted signal rejects
without starting Fetch.

```ts
const controller = new AbortController();
const request = $http.get('/api/search', {
  signal: controller.signal,
  timeout: 5000,
});

// Cancel when the user leaves or a newer search replaces this one.
controller.abort();
await request.catch((error) => {
  if (error.transportStatus !== 'abort') throw error;
});
```

The timer covers Fetch and buffered response reading. With
`responseType: 'stream'`, it ends when the stream is returned; the supplied
signal can still cancel the underlying body during consumption.

`credentials` accepts `'omit'`, `'same-origin'` (the default), or `'include'`.
Cross-origin credentialed requests also require the server's CORS and cookie
configuration to permit them.

## Body Readers And Transforms

The default body reader reads text. Default response transforms remove the JSON
protection prefix and parse JSON when the content type is JSON or the text looks
like a JSON object or array. Invalid JSON declared as JSON rejects.

Use `responseType` to select `text`, `json`, `blob`, `arraybuffer`, `document`,
or `stream`. `text` still runs default transforms; set `transformResponse: []`
when text must stay text. `document` parses HTML with `DOMParser`; `stream`
returns a readable body (or `null` for a bodyless response) and skips implicit
response transforms. Explicit transforms still run.

Request and response transform options accept a function or an array. A
request-level transform replaces the default pipeline. See the [HTTP workflow
guide]({{< relref "/docs/services/http" >}}) for examples.

## Defaults

Configure defaults before bootstrap with `module.config({ $http: ... })`, or
mutate runtime defaults through `$http.defaults`.

[`HttpDefaults`](../../../typedoc/interfaces/HttpDefaults.html) supports
headers, credentials, transforms, caching, parameter serialization, and XSRF
names. Set `signal`, `timeout`, and `responseType` on each request; they are not
service-level defaults.

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

Executable sample: [`http.html`](/examples/config/http.html)

## Caching

`cache: true` caches successful GET responses by URL, including serialized query
parameters, and shares an in-flight request for the same URL. Headers are not
part of that key. Use a strategy or
[`HttpCacheConfig`](../../../typedoc/interfaces/HttpCacheConfig.html) for
strategy-aware caching. Other methods are not cached, and `cache: false`
overrides the default. Clear or isolate cached user data when credentials
change.

## Interceptors

Interceptors are registered with `module.config({ $http: ... })`. Request hooks
run in registration order; response hooks run in reverse order. Hooks may return
values or promises. `requestError` and `responseError` can recover by returning
a configuration or response; reject or throw to propagate a failure.

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

## XSRF

`$http` reads the configured XSRF cookie and sends it in the configured XSRF
header for the current origin and explicitly trusted additional origins. The
defaults are cookie `XSRF-TOKEN` and header `X-XSRF-TOKEN`. Add cross-origin
APIs explicitly:

```ts
angular.createModule('app', []).config({
  $http: {
    xsrfTrustedOrigins: ['https://api.example.com'],
  },
});
```

Trust is origin-wide, including every path on that scheme, host, and port. This
setting does not enable CORS or change `credentials`.

## Related

- [HTTP workflow and migration guide]({{< relref "/docs/services/http" >}})
- [HTTP directive guide]({{< relref "/docs/directives/http" >}})
- [REST service guide]({{< relref "/docs/services/rest" >}})
- [`$rest` service]({{< relref "/docs/service/rest" >}})
