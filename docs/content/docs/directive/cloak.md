---
title: ng-cloak
description: >
  Hide interpolated templates
---

### Description

The `ng-cloak` directive is used to prevent the HTML template from being briefly
displayed by the browser in its raw (uncompiled) form while your application is
loading. Use this directive to avoid the undesirable flicker effect caused by
the HTML template display.

The directive can be applied to the `<body>` element, but the preferred usage is
to apply multiple `ng-cloak` directives to small portions of the page to permit
progressive rendering of the browser view.

`ng-cloak` works in cooperation with the following CSS rule:

```css
@charset "UTF-8";

[ng-cloak],
[data-ng-cloak],
.ng-cloak,
.ng-hide:not(.ng-hide-animate) {
  display: none !important;
}

.ng-animate-shim {
  visibility: hidden;
}

.ng-anchor {
  position: absolute;
}
```

CSS styles are available in npm distribution:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular.css"
/>
```

### Example

```html
<style>
  @charset "UTF-8";
  .ng-cloak,
  .ng-hide:not(.ng-hide-animate),
  [data-ng-cloak],
  [ng-cloak] {
    display: none !important;
  }
  .ng-animate-shim {
    visibility: hidden;
  }
  .ng-anchor {
    position: absolute;
  }
</style>
<section ng-app ng-cloak>These tags are invisible {{ hello }}</section>
```

### Demo

<style>@charset "UTF-8";.ng-cloak,.ng-hide:not(.ng-hide-animate),[data-ng-cloak],[ng-cloak]{display:none!important}.ng-animate-shim{visibility:hidden}.ng-anchor{position:absolute}</style>
<section ng-app ng-cloak> These tags are invisible {{ hello }} </section>

---
