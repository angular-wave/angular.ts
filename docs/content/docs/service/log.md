---
title: $log
description: >
  Logging service
---

### Using `$log`

Default implementation of
[LogService](../../../typedoc/interfaces/LogService.html) safely writes the
message into the browser's
[console](https://developer.mozilla.org/en-US/docs/Web/API/console) (if
present). The main purpose of this service is to simplify debugging and
troubleshooting, while allowing the developer to modify the defaults for live
environments.

##### **Example\***

```js
angular.module('demo').controller('MyController', ($log) => {
  $log.log('log');
  $log.info('info');
  $log.warn('warn!');
  $log.error('error');
  $log.debug('debug');
});
```

To reveal the location of the calls to `$log` in the JavaScript console, you can
"blackbox" the AngularTS source in your browser:

- [Mozilla description of blackboxing](https://developer.mozilla.org/en-US/docs/Tools/Debugger/How_to/Black_box_a_source).
- [Chrome description of blackboxing](https://developer.chrome.com/devtools/docs/blackboxing).

> Note: Not all browsers support blackboxing.  
> The default is to suppress `debug` messages unless logging config enables
> them.

### Configure

Use `module.config({ $log: ... })` for application-wide logging policy.

```js
angular.module('demo', []).config({
  $log: {
    debug: true,
  },
});
```

`debug` controls whether `$log.debug(...)` writes to the console. The default is
`false`.

#### Beacon delivery

Selected log levels can also be delivered through the browser's Beacon API.
Beacon delivery is disabled unless an endpoint is configured and defaults to the
`error` level when `levels` is omitted.

```js
angular.module('demo', []).config({
  $log: {
    beacon: {
      url: '/api/client-logs',
      levels: ['warn', 'error'],
    },
  },
});
```

The default serializer sends an `application/json` `Blob` containing
`timestamp`, `level`, and `args`. Applications that need redaction or additional
metadata can register and select a serializer:

```js
angular
  .module('demo')
  .factory(
    'clientLogSerializer',
    () => (entry) =>
      JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        message: String(entry.args[0]),
      }),
  )
  .config({
    $log: {
      beacon: {
        url: '/api/client-logs',
        serializer: 'clientLogSerializer',
      },
    },
  });
```

Beacon queueing has no response callback or delivery acknowledgement. AngularTS
does not retry or persist rejected entries. Failures produce a local warning by
default; set `failure: "ignore"` to suppress it.

Beacon delivery automatically participates in `$security`; there is no separate
logging security switch. AngularTS checks the endpoint and configured request
credentials before serializing an entry. A denied remote delivery never
suppresses the local log call, and repeated policy denials produce at most one
local warning.

Beacon requests cannot carry application-defined `Authorization` headers, so
Bearer and Basic credential policies deny Beacon delivery. Use a cookie endpoint
for authenticated Beacon logging. If the endpoint requires custom headers, use
`$http` or `fetch()` with `keepalive: true` instead. Redaction and payload
shaping remain the responsibility of the configured serializer.

You can also replace the logger implementation:

```js
angular.module('demo', []).config({
  $log: {
    logger: () => ({
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    }),
  },
});
```

Executable sample: [`log-cookie.html`](/examples/config/log-cookie.html)

### Decorating `$log`

You can also override any `$log` service method with `module.decorator()`. Below
is a simple example that overrides default `$log.error` to log errors to both
console and a backend endpoint.

##### **Example\***

```js
angular
  .module('demo')
  .decorator('$log', ($delegate, $http, $exceptionHandler) => {
    const originalError = $delegate.error;
    $delegate.error = () => {
      originalError.apply($delegate, arguments);
      const errorMessage = Array.prototype.slice.call(arguments).join(' ');
      $http.post('/api/log/error', { message: errorMessage });
    };
    return $delegate;
  });
```

### Overriding `console`

If your application is already heavily reliant on default
[console](https://developer.mozilla.org/en-US/docs/Web/API/console) logging or
you are using a third-party library where logging cannot be overriden, you can
still take advantage of Angular's services by modifying the globals at runtime.
Below is an example that overrides default `console.error` to logs errors to
both console and a backend endpoint.

##### **Example\***

```js
angular.module('demo').run(($http) => {
  /**
   * Decorate console.error to log error messages to the server.
   */
  const $delegate = window.console.error;
  window.console.error = (...args) => {
    try {
      const errorMessage = args
        .map((arg) => (arg instanceof Error ? arg.stack : JSON.stringify(arg)))
        .join(' ');
      $delegate.apply(console, args);
      $http.post('/api/log/error', { message: errorMessage });
    } catch (e) {
      console.warn(e);
    }
  };

  /**
   * Detect errors thrown outside Angular and report them to the server.
   */
  window.addEventListener('error', (e) => {
    window.console.error(e.error || e.message, e);
  });

  /**
   * Optionally: Capture unhandled promise rejections
   */
  window.addEventListener('unhandledrejection', (e) => {
    window.console.error(e.reason || e);
  });
});
```

Combining both `$log` decoration and `console.log` overriding provides a robust
and flexible error reporting strategy that can adapt to your use-case.

\* array notation and HTTP error handling omitted for brevity
