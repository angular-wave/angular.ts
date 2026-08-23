---
title: Pass server data with ng-init or ng-setter
description:
  Initialize scope state once or keep it synchronized with server-rendered
  content
weight: 7
---

## Problem

The server already knows values that the browser needs, such as the current
locale, a record ID, or the initial result count. You want AngularTS to use
those values without making another request.

## Before you start

The server template must safely serialize and HTML-encode the initial value.
Decide whether the value is fixed at compilation or can change when another
system replaces element content.

## Recipe

Render an `ng-init` expression with the page:

<!-- tested-by: src/directive/init/init.spec.ts, src/directive/setter/setter.spec.ts -->

```html
<main
  ng-app="catalog"
  ng-init='page = {"locale":"en","productId":42,"resultCount":8}'
>
  <p>Found {{ page.resultCount }} products.</p>
  <button ng-click="page.resultCount += 1">Add result</button>
</main>
```

AngularTS evaluates `ng-init` while it compiles the element. The resulting
`page` object becomes normal reactive scope state.

The HTML and initial JSON arrive in one server response. This avoids a separate
REST request, its network round trip, and an extra loading state. Use this when
the server already loaded the data while rendering the page.

Inspect it from DevTools by selecting the `main` element:

<!-- tested-by: src/directive/init/init.spec.ts, src/directive/setter/setter.spec.ts -->

```js
const scope = angular.getScope($0);

scope.page.productId;
scope.page.resultCount = 12;
```

The paragraph updates when `resultCount` changes.

## Keep scope data synchronized with ng-setter

Use `ng-setter` when the element's content can change after the initial page
render:

<!-- tested-by: src/directive/init/init.spec.ts, src/directive/setter/setter.spec.ts -->

```html
<section ng-app="catalog">
  <span ng-setter="availability">In stock</span>
  <p>Current availability: {{ availability }}</p>
</section>
```

AngularTS initially sets `scope.availability` to `'In stock'`. If server-driven
rendering or another integration later changes the `span` content, AngularTS
updates `scope.availability` again.

`ng-setter` observes the element for content changes. It assigns the trimmed
`innerHTML` string to the expression named by the directive:

<!-- tested-by: src/directive/init/init.spec.ts, src/directive/setter/setter.spec.ts -->

```html
<div ng-setter="serverMessage">Order accepted</div>
```

The scope receives:

<!-- tested-by: src/directive/init/init.spec.ts, src/directive/setter/setter.spec.ts -->

```js
scope.serverMessage === 'Order accepted';
```

## Choose between them

| Use         | Behavior                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ng-init`   | Evaluates an AngularTS expression once during compilation. Use it for JSON objects, numbers, booleans, and other initial values. |
| `ng-setter` | Copies an element's trimmed HTML into scope as a string and updates it whenever that content changes.                            |

Both can place server-rendered data in the first HTML response and avoid an
extra REST request. Use `ng-setter` when later element updates must also reach
the scope.

## Render the value on the server

The final HTML sent to the browser should contain the serialized value:

<!-- tested-by: src/directive/init/init.spec.ts, src/directive/setter/setter.spec.ts -->

```html
<main ng-init='page = {"locale":"lv","productId":108}'></main>
```

Use your server framework's HTML attribute encoder when inserting serialized
data. Do not build the attribute by joining untrusted strings.

Serialize the value to JSON on the server, encode it for an HTML attribute, and
write it into `ng-init`. The browser can use the data as soon as AngularTS
compiles the page instead of waiting for another endpoint.

Use `ng-init` for small values already needed by the page. Keep large records in
the server-rendered HTML or load them through an application service when the
user requests them.

## Failure path

Malformed or unsafely encoded JSON can break the containing attribute. Encode on
the server and keep large or sensitive records out of HTML attributes.

## Apply it now

Find one request the browser makes for data the server already loaded while
rendering the page. Move the smallest useful value into `ng-init`. If the value
comes from HTML that another system may replace later, use `ng-setter` and
change the element once in DevTools to confirm the scope follows it.

## Verify

Inspect the first document response and confirm the initial value needs no
follow-up request. Change an `ng-setter` element and confirm scope follows it.
