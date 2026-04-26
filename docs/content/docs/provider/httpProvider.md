---
title: $httpProvider
description: >
  Configure defaults and interceptors for $http.
---

Use `$httpProvider` during module configuration to set application-wide HTTP
behavior before any request is made.

Exact provider members are documented in TypeDoc:

- [HttpProvider](../../../typedoc/functions/HttpProvider.html)
- [HttpProviderDefaults](../../../typedoc/interfaces/HttpProviderDefaults.html)
- [HttpInterceptor](../../../typedoc/interfaces/HttpInterceptor.html)

## Defaults

Use defaults for headers, credentials, transforms, XSRF names, caching, and
parameter serialization.

```js
angular.module('app', []).config(($httpProvider) => {
  $httpProvider.defaults.headers.common.Authorization = 'Bearer token';
  $httpProvider.defaults.withCredentials = true;
});
```

## Interceptors

Register interceptors to add cross-cutting request and response behavior.

```js
angular.module('app', []).config(($httpProvider) => {
  $httpProvider.interceptors.push(() => ({
    request(config) {
      config.headers['X-Timestamp'] = Date.now();
      return config;
    },
  }));
});
```

## XSRF

Add trusted origins before AngularTS sends XSRF headers to cross-origin APIs.

```js
angular.module('app', []).config(($httpProvider) => {
  $httpProvider.xsrfTrustedOrigins.push('https://api.example.com');
});
```

See also [$http](../../../docs/service/http).
