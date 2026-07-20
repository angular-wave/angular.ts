---
title: $sce
description: >
  Strict Contextual Escaping service
---

# `$sce` Documentation

## Configuration

Use module config to configure the [`$sce`](#sce) service and its resource URL
delegate before the application runs.

- Enable/disable Strict Contextual Escaping (SCE) in a module
- Override the default implementation with a custom delegate

```js
angular.module("app", []).config({
  $sce: {
    enabled: true,
  },
});

angular.module("app").config({
  $sceDelegate: {
    trustedResourceUrlList: ["self", "https://cdn.example.com/templates/**"],
    bannedResourceUrlList: ["https://cdn.example.com/templates/private/**"],
  },
});
```

Executable sample:
[`sce.html`](/examples/config/sce.html)

Read more about [Strict Contextual Escaping (SCE)](#strict-contextual-escaping).

---

## `$sce`

`$sce` is a service that provides **Strict Contextual Escaping (SCE)** services
to AngularTS.

---

## Strict Contextual Escaping

### Overview

Strict Contextual Escaping (SCE) is a mode in which AngularTS constrains
bindings to only render trusted values. Its goal is to:

- Help you write **secure-by-default** code.
- Simplify **auditing for vulnerabilities** such as XSS and clickjacking.

By default, AngularTS treats **all values as untrusted** in HTML or sensitive
URL bindings. When binding untrusted values, AngularTS will:

- Sanitize or validate them based on context.
- Or throw an error if it cannot guarantee safety.

Example — `ng-bind-html` renders its value directly as HTML (its “context”). If
the input is untrusted, AngularTS will sanitize or reject it.

To bypass sanitization, you must mark a value as trusted before binding it.

> **Note:** Since version 1.2, AngularTS ships with SCE **enabled by default**.

---

### Example: Binding in a Privileged Context

```html
<input ng-model="userHtml" aria-label="User input" />
<div ng-bind-html="userHtml"></div>
```

If SCE is disabled, this allows arbitrary HTML injection — a serious XSS risk.

To safely render user content, you should sanitize the HTML (on the server or
client) **before** binding it.

SCE ensures that only trusted, validated, or sanitized values are rendered.

You can mark trusted values explicitly using:

```js
$sce.trustAs(context, value);
```

or shorthand methods such as:

```js
$sce.trustAsHtml(value);
$sce.trustAsUrl(value);
$sce.trustAsResourceUrl(value);
```

---

### How It Works

Directives and Angular internals bind trusted values using:

```js
$sce.getTrusted(context, value);
```

Example: the `ngBindHtml` directive uses `$sce.parseAsHtml` internally:

```js
let ngBindHtmlDirective = [
  '$sce',
  function ($sce) {
    return function (scope, element, attr) {
      scope.$watch($sce.parseAsHtml(attr.ngBindHtml), function (value) {
        element.html(value || '');
      });
    };
  },
];
```

---

### Impact on Loading Templates

SCE affects both:

- The [`ng-include`](https://docs.angularjs.org/api/ng/directive/ngInclude)
  directive
- The `templateUrl` property in directives

By default, AngularTS loads templates **only** from the same domain and protocol
as the main document.  
It uses:

```js
$sce.getTrustedResourceUrl(url);
```

To allow templates from other domains, use:

- `module.config({ $sceDelegate: { trustedResourceUrlList: [...] } })`
- Or `$sce.trustAsResourceUrl(url)`

> **Note:** Browser CORS and Same-Origin policies still apply.

---

### Is This Too Much Overhead?

SCE applies only to **interpolation expressions**.

Constant literals are automatically trusted, e.g.:

```html
<div ng-bind-html="'<b>implicitly trusted</b>'"></div>
```

If the `ngSanitize` module is included, `$sceDelegate` will use `$sanitize` to
clean untrusted HTML automatically.

AngularTS’ default `$sceDelegate` allows loading from your app’s domain,
blocking others unless explicitly whitelisted.

This small overhead provides major security benefits and simplifies auditing.

---

### Supported Trusted Contexts

| Context             | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `$sce.HTML`         | Safe HTML (used by `ng-bind-html`).                        |
| `$sce.CSS`          | Safe CSS. Currently unused.                                |
| `$sce.MEDIA_URL`    | Safe media URLs (auto-sanitized).                          |
| `$sce.URL`          | Safe navigable URLs.                                       |
| `$sce.RESOURCE_URL` | Safe resource URLs (used in `ng-include`, `iframe`, etc.). |
| `$sce.JS`           | Safe JavaScript for execution.                             |

> ⚠️ Before AngularTS 1.7.0, `a[href]` and `img[src]` sanitized directly.  
> As of 1.7.0, these now use `$sce.URL` and `$sce.MEDIA_URL` respectively.

---

### Resource URL List Patterns

Trusted and banned resource URL lists accept:

- `'self'` → matches same domain & protocol
- Strings with wildcards:
  - `*` → matches within a single path segment
  - `**` → matches across path segments (use carefully)
- Regular expressions (`RegExp`)

> **Caution:** Regex patterns are powerful but harder to maintain — use only
> when necessary.

---

### Disabling SCE (Not Recommended)

You can disable SCE globally — though this is strongly discouraged.

```js
angular.module("myAppWithSceDisabled", []).config({
  $sce: {
    // Completely disable SCE. For demonstration purposes only!
    // Do not use in new projects or libraries.
    enabled: false,
  },
});
```
