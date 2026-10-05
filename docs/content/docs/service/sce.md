---
title: Binding policies
description: Destination-specific HTML, URL, and script binding policies
---

# Binding policies

AngularTS uses synchronous callbacks configured through `$compile` to sanitize
or validate values at their DOM destination. The former `$sce` and
`$sceDelegate` services and their configuration keys have been removed.

## Configuration

Each callback receives a string and must return a string or throw to reject it.
Omitted callbacks retain the framework defaults.

| Configuration callback | Destination | Default |
| --- | --- | --- |
| `htmlPolicy` | `ng-bind-html` and HTML properties | Reject nonempty strings |
| `urlPolicy` | Link URLs | Block dangerous schemes |
| `mediaUrlPolicy` | Media URLs and each `srcset` candidate | Allow supported media schemes and image data URLs |
| `resourceUrlPolicy` | Templates and embedded resources | Allow same-origin HTTP(S) resources |
| `scriptPolicy` | Executable JavaScript source | Reject nonempty strings |
| `scriptUrlPolicy` | Script-loading URLs | Allow same-origin HTTP(S) resources |

```js
angular.createModule("app", []).config({
  $compile: {
    htmlPolicy: (html) => DOMPurify.sanitize(html),
    resourceUrlPolicy: (value) => {
      const url = new URL(value, document.baseURI);
      if (url.origin !== location.origin) {
        throw new Error("External resource rejected");
      }
      return value;
    },
  },
});
```

Supply your application's sanitizer implementation, such as DOMPurify, before
using this configuration. A policy callback is responsible for the values it
approves. Policies are configured before bootstrap and are not injectable
services.

Native `TrustedHTML`, `TrustedScript`, and `TrustedScriptURL` values are
supported at their corresponding destinations. The framework does not create
browser Trusted Types policies for the application.

Executable sample: [`sce.html`](/examples/config/sce.html).
