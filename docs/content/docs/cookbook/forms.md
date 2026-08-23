---
title: Build and validate a form
description: Bind fields, show useful errors, and submit valid data
weight: 13
---

## Problem

A form needs reactive values, validation messages, submit state, and a server
request without replacing native form behavior unnecessarily.

## Before you start

The server endpoint must validate independently and return a deliberate success
or error format. Give every submitted native control a name.

## Recipe

Name the form and every control. Bind values with `ng-model` and use native
validation attributes:

<!-- tested-by: src/directive/form/form.spec.ts, src/directive/model/model.spec.ts, src/directive/input/input.spec.ts, src/directive/http/post.spec.ts -->

```html
<form
  name="signupForm"
  ng-post="/api/signup"
  on-success="account = $res"
  on-error="submitError = $res.message"
  loading
  loading-class="is-saving"
>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" ng-model="user.email" required />

  <div ng-messages="signupForm.email.error" ng-show="signupForm.email.dirty">
    <p ng-message="required">Enter your email.</p>
    <p ng-message="email">Enter a valid email.</p>
  </div>

  <p ng-if="submitError" ng-bind="submitError"></p>
  <button type="submit" ng-disabled="signupForm.invalid">Create account</button>
</form>
```

The form name exposes its controller on scope. Each named `ng-model` control has
an [`NgModelController`](../../../typedoc/classes/NgModelController.html).

Use `dirty` or `touched` to avoid showing errors before the user interacts.
Disable submission with `invalid`, but always validate again on the server.

## Submit with ng-post or ng-put

Put `ng-post` on a form when the request creates something or runs an action.
Use `ng-put` when it replaces or updates a resource. Both directives:

1. Listen for the form's `submit` event.
2. Prevent the browser from navigating away.
3. Collect the current form controls.
4. Send the request through `$http`.
5. Run `on-success` for a successful response or `on-error` for a failed one.

The first example sends a JSON object to `/api/signup`. `$res` is the parsed
response body. Assign it explicitly in `on-success`; the directive does not
guess which scope property should receive it.

Use an interpolated URL when updating an existing record:

<!-- tested-by: src/directive/http/put.spec.ts -->

```html
<form
  name="profileForm"
  ng-put="/api/profiles/{{ profile.id }}"
  on-success="profile = $res"
  on-error="saveError = $res.message"
>
  <input name="displayName" ng-model="profile.displayName" required />
  <button type="submit" ng-disabled="profileForm.invalid">Save</button>
</form>
```

### Choose which controls are sent

The request body comes from the form's native controls, not by serializing the
whole scope object. Give every submitted control a `name`. Controls without a
name, disabled controls, and unchecked checkboxes are omitted. This follows the
browser's `FormData` rules.

Without `enctype`, AngularTS converts the collected entries to a JSON object.
Use URL encoding only when the server expects a traditional HTML form body:

<!-- tested-by: src/directive/http/post.spec.ts -->

```html
<form ng-post="/api/contact" enctype="application/x-www-form-urlencoded">
  <input name="email" type="email" ng-model="contact.email" required />
  <textarea name="message" ng-model="contact.message" required></textarea>
  <button type="submit">Send</button>
</form>
```

Use the programmatic `$http` upload shown below for `multipart/form-data`. The
browser must create that request from the original `FormData` and add its
boundary; the declarative form directives convert entries to an object.

### Handle the request lifecycle

`loading` sets `data-loading="true"` on the form while the request is running.
`loading-class="is-saving"` adds and removes that class at the same time. Use
either as a CSS hook for progress feedback.

Use `on-success` and `on-error` when the server returns JSON. If the server
returns HTML, `data-target` and `swap` can replace or append server-rendered
content. See [Swap server-rendered HTML into the
page]({{< relref "/docs/cookbook/swap-server-html" >}}).

### Route after a successful form

A login form can submit JSON, show server validation errors, and open a router
state without a controller or a JavaScript submit handler:

<!-- tested-by: src/directive/http/post.spec.ts -->

```html
<form
  ng-post="/_login"
  data-state-success="dashboard"
  on-error="errors = $res"
  ng-init="errors = {}"
>
  <label ng-class="{ error: errors.email }">
    Email
    <input
      name="email"
      type="email"
      aria-invalid="{{ errors.email !== undefined }}"
      ng-keyup="errors.email = undefined"
      required
    />
    <span ng-if="errors.email">{{ errors.email }}</span>
  </label>

  <label ng-class="{ error: errors.password }">
    Password
    <input
      name="password"
      type="password"
      aria-invalid="{{ errors.password !== undefined }}"
      ng-keyup="errors.password = undefined"
      required
    />
    <span ng-if="errors.password">{{ errors.password }}</span>
  </label>

  <button type="submit">Log in</button>
</form>
```

The inputs do not need `ng-model`. Their `name` and current native values are
enough for `ng-post` to produce this request body:

<!-- tested-by: src/directive/http/post.spec.ts -->

```text
POST /_login
Content-Type: application/json

{"email":"user@example.com","password":"secret"}
```

For invalid credentials, return a `4xx` status and an `application/json` body
whose keys match the form fields:

<!-- tested-by: src/directive/http/post.spec.ts -->

```text
HTTP/1.1 422 Unprocessable Content
Content-Type: application/json

{"email":"Unknown account","password":"Password does not match"}
```

AngularTS parses the JSON and exposes it as `$res`. The inline
`on-error="errors = $res"` expression makes each message available to the
template. Editing a field clears only that field's message.

For a `2xx` response, AngularTS ignores the error expression and calls
`$state.go('dashboard')` through `data-state-success`. The `dashboard` state
must already be registered with the application's router. The successful
response may be empty when the next state loads everything it needs.

`ng-get` and `ng-delete` can listen to a form submission, but they do not send
the form controls as a request body. Put their parameters in the URL, or use
them on a button. Use `ng-post` or `ng-put` when the form fields must be sent.

For search fields, debounce model updates instead of building a timer:

<!-- tested-by: src/directive/form/form.spec.ts, src/directive/model/model.spec.ts, src/directive/input/input.spec.ts, src/directive/http/post.spec.ts -->

```html
<input
  type="search"
  ng-model="filters.query"
  ng-model-options="{ debounce: 250 }"
/>
```

## Upload a file

A file input writes its native `FileList` to `ng-model`. Send the selected
`File` in native `FormData`; do not set `Content-Type` because the browser must
add the multipart boundary.

The fetch transport supports cancellation through a promise-valued `timeout`,
but it does not currently expose upload progress. Use [Cancel a file upload and
handle server rejection]({{< relref "/docs/cookbook/upload-cancel" >}}) for the
complete controller, cancellation, abort, retry, and server-validation pattern.

## Failure path

Native and AngularTS validation improve feedback but never replace server
validation. Preserve entered values on `4xx` responses and prevent duplicate
destructive submissions.

## Apply it now

Take the smallest real form in your application. Give each submitted control a
name, add `ng-post` or `ng-put`, and make the server return one realistic `4xx`
JSON error body. Confirm the page renders those errors without a controller and
that a `2xx` response performs the intended update or router transition.

## Verify

Submit valid, invalid, slow, cancelled, and server-rejected requests. Confirm
named controls form the body, errors remain editable, and success performs
exactly one update.
