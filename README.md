## AngularTS

![Build status](https://github.com/angular-wave/angular.ts/actions/workflows/ci.yml/badge.svg)
[![stats](https://data.jsdelivr.com/v1/package/npm/@angular-wave/angular.ts/badge?style=rounded)](https://www.jsdelivr.com/package/npm/@angular-wave/angular.ts)

This project preserves, modernises and expands the original [AngularJS](https://angularjs.org/)
framework. AngularTS is "AngularJS: The Good Parts". It takes the three core pillars of the original &ndash; a string-interpolation engine,
dependency injection, two-way data-binding &ndash; and adds a reactive change-detection model on top of modern build tooling with strong typechecking of TypeScript.

With AngularJS, you get a decade-long optimization effort of Angular Team at Google, plus a massive testing suite, required for applications like Google Cloud and Kubernetes.
AngularTS adds:

- a fully reactive change-detection model without digests or virtual DOMs, like `Vue`
- access to native DOM APIs at component and directive level (no `JQuery`or `JQLite`)
- access to native Promises API (no `$q` or `$timetout`)
- built-in enterprise-level router (`ui-router` ported as `ng-router`)
- built-in animations (`animate`)
- new directives, inspired by `HTMX`
- new injectables for REST resources, persistent stores, Web Workers and WASM modules

The result is a high-performance, buildless, progressive and battle-tested JS framework that stays as close to Web standards as possible.
If you write server-rendered web applications for desktop and mobile, and do not wish to leave the comfort of your tech-stack, this is your new secret weapon.

### Getting started

#### Install

```bash
$ npm i @angular-wave/angular.ts

```

or

```html
<script src="
    https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js
"></script>
```

Initialize your app

```html
<div ng-app ng-init="x='world'">Hello {{ x }}</div>
```

Or check out the updated [Angular seed](https://github.com/angular-wave/angular-seed), which can serve as a solid starting point
or a source of inspiration for new ideas.

## Documentation

Go to https://angular-wave.github.io/angular.ts/
