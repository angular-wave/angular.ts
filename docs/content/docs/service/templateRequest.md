---
title: $templateRequest
description: >
  Template request service
---

`$templateRequest` fetches templates through `$http` and stores successful
responses in `$templateCache`.

Configure template request defaults before bootstrap with
`module.config({ $templateRequest: ... })`.

```js
angular.module("demo", []).config({
  $templateRequest: {
    httpOptions: {
      headers: {
        "X-Template": "configured",
      },
      withCredentials: true,
    },
  },
});
```

Executable sample:
[`template-request.html`](/examples/config/template-request.html)

## Usage

```js
$templateRequest("./panel.html").then((template) => {
  $templateCache.set("panel.html", template);
});
```

`$templateRequest` assumes template URLs are trusted by the caller. Security
policy for resource URLs belongs to `$sce` and `$sceDelegate`.
