---
title: $templateRequest
description: >
  Template request service
---

`$templateRequest` fetches templates through `$http` and stores successful
responses in `$templateCache`.

Configure template request defaults before bootstrap with
`module.config({ $templateRequest: ... })`.

`httpOptions` uses the current `$http` request options, including Fetch
`credentials`, numeric `timeout`, and a native `signal`. A shared signal affects
all uncached requests using it; once aborted it cannot be reused. Completion and
failure are observed through the returned promise.

```js
angular.createModule('demo', []).config({
  $templateRequest: {
    httpOptions: {
      headers: {
        'X-Template': 'configured',
      },
      credentials: 'include',
    },
  },
});
```

Executable sample:
[`template-request.html`](/examples/config/template-request.html)

## Usage

```js
const template = await $templateRequest('./panel.html');
```

Successful templates are cached automatically, and concurrent requests for the
same URL share a download. Calls without a signal also share the same promise. The default JSON response transform is removed so
template text remains text; explicit `httpOptions` can override the transforms.

## Cancel one consumer

Pass a native signal in the second argument to stop waiting for a template:

```js
const controller = new AbortController();
const template = $templateRequest('./panel.html', { signal: controller.signal });
controller.abort();
try {
  await template;
} catch (error) {
  if (!controller.signal.aborted) throw error;
}
```

Cancellation rejects that consumer's promise with `signal.reason`. A concurrent
consumer of the same URL can still receive the template. The shared download is
aborted only after every consumer has cancelled; any call without a signal
keeps it alive. An already-aborted signal starts no download. Failed or abandoned
downloads are not cached, so a later call can retry.

`ng-include` cancels its consumer when its source changes or its scope is
destroyed. The router cancels template waits for aborted, failed, and superseded
transitions and on runtime destruction. Intentional include cancellation does
not report a template error, and router rejections retain their abort or
supersession category. These rules also apply when an include and route share
the same template URL.

`$compile.resourceUrlPolicy` validates or rewrites URLs before lookup or fetch,
including direct `$templateRequest` calls. The `$http` security policy also
applies to network requests.

See the [$http guide]({{< relref "/docs/services/http" >}}) for cancellation,
credentials, and errors.
