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
same URL share a promise. The default JSON response transform is removed so
template text remains text; explicit `httpOptions` can override the transforms.

`$compile.resourceUrlPolicy` validates or rewrites URLs before lookup or fetch,
including direct `$templateRequest` calls. The `$http` security policy also
applies to network requests.

See the [$http guide]({{< relref "/docs/services/http" >}}) for cancellation,
credentials, and errors.
