---
title: ng-post
description: >
  Initiates a POST request
---

### Description

The `ng-post` directive allows you to send data via `$http` service to a remote
URL and insert, replace, or manipulate the server's response into the DOM. The
directive assumes a response will be HTML content. If the server endpoint
returns JSON, the response is available to `on-success` as `$res` and requires
explicit assignment. The swap strategy is ignored for JSON. Unlike its sister
`ng-get` directive, `ng-post` assumes it is attached to a `form`, `input`,
`textarea`, or `select` element, which act as the source of data for the request
payload:

#### Example

```html
<form ng-post="/register">
  <input name="username" type="text" />
</form>
```

With `form` elements, the directive can be registered anywhere inside a form:

#### Example

```html
<form>
  <input name="username" type="text" />
  <button ng-post="/register">Send</button>
</form>
```

In case of error, the directive displays a string error in place of the success
result. JSON errors are available to `on-error` as `$res`. The behavior can
be combined with other directivs to create complex form-handling strategies.
Below is a form that dissappears in case of success or adds error state in case
of validation errors.

#### Example

```html
<form
  ng-post="/register"
  ng-if="$ctrl.success === false"
  on-success="$ctrl.success = true"
>
  <h2>Register form</h2>

  <label ng-class="{ error: errors.username }">
    Username
    <input
      name="username"
      type="text"
      aria-invalid="{{ errors.username !== undefined}}"
      ng-keyup="errors.username = undefined"
    />
    <span>{{ errors.username }}</span>
  </label>

  <button type="submit">Sign up</button>
</form>
```

For other input elements, the directive adds form-like behavior. The example
below showcases an input acting as a search form:

```html
<input
  name="seach"
  ng-post="/search"
  data-target="#output"
  trigger="keyup"
  placeholder="Search..."
/>
```

Additional options for request and response handling can be modified with
attributes provided below.

### Parameters

---

#### `ng-post`

- **Type:** `string`
- **Description:** A URL to issue a GET request to
- **Example:**

  ```html
  <div ng-post="/example">post</div>
  ```

---

### Modifiers

#### `data-enctype`

- **Type:** `string`
- **Description:** Specifies the content type of form. Defaults to
  `application/json`. To send regular URL-encoded data form, use
  `application/x-www-form-urlencoded`.
- **Example:**

  ```html
  <form ng-post="/urlencoded" enctype="application/x-www-form-urlencoded">
    <input type="text" name="name" />
  </form>
  ```

---

#### `data-form`

- **Type:** `string`
- **Description:** If placed outside a `form` element, specifies `id` of the
  form to use for datasource.
- **Example:**

  ```html
  <button ng-post="/register" form="register">Send</button>
  <form id="register">
    <input name="username" type="text" />
  </form>
  ```

---

#### `data-trigger`

- **Type:** `string`
- **Description:** Specifies the DOM event for triggering a request (default is
  `click`). For a complete list, see
  [UI Events](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events). To
  eagerly execute a request without user interaction, use the "load" event,
  which is triggered syntheticaly on any element by the directive linking
  function. This is in contract to the native
  [load](https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event),
  which executes lazily only for `window` object and certain resource elements.
- **Example:**

  ```html
  <div ng-post="/example" trigger="mouseover">Get</div>
  ```

---

#### `data-latch`

- **Type:** `string`
- **Description:** Triggers a request whenever its value changes. This attribute
  can be used with interpolation (e.g., {{ expression }}) to observe reactive
  changes in the scope.
- **Example:**

  ```html
  <div ng-post="/example" latch="{{ latch }}" ng-mouseover="latch = !latch">
    Get
  </div>
  ```

---

#### `data-swap`

- **Type:** [SwapMode](../../../typedoc/variables/SwapMode.html)
- **Description:** Controls how the response is inserted
- **Example:**

  ```html
  <div ng-post="/example" swap="outerHTML">Get</div>
  ```

---

#### `data-target`

- **Type:**
  [selectors](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector#selectors)
- **Description:** Specifies the DOM element where a string response should be
  rendered.
- **Example:**

  ```html
  <div ng-post="/example" data-target=".test">Post</div>
  <div ng-post="/json" on-success="person = $res">{{ person.name }}</div>
  ```

---

#### `data-delay`

- **Type:**
  [delay](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#delay)
- **Description:** Delay request by N millisecond
- **Example:**

  ```html
  <div ng-post="/example" delay="1000">Get</div>
  ```

---

#### `data-interval`

- **Type:**
  [delay](https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval#delay)
- **Description:** Repeat request every N milliseconds
- **Example:**

  ```html
  <div ng-post="/example" interval="1000">Get</div>
  ```

---

#### `data-throttle`

- **Type:**
  [delay](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#delay)
- **Description:** Ignores subsequent requests for N milliseconds
- **Example:**

  ```html
  <div ng-post="/example" throttle="1000">Get</div>
  ```

---

#### `data-loading`

- **Type:** N/A
- **Description:** Adds a data-loading="true/false" flag during request
  lifecycle.
- **Example:**

  ```html
  <div ng-post="/example" data-loading>Get</div>
  ```

---

#### `data-loading-class`

- **Type:** `string`
- **Description:** Toggles the specified class on the element while loading.
- **Example:**

  ```html
  <div ng-post="/example" data-loading-class="red">Get</div>
  ```

---

#### `on-success`

- **Type:** [Expression](../../../typedoc/types/Expression.html)
- **Description:** Evaluates expression when request succeeds. Response data is
  available as a `$res` property on the scope.
- **Example:**

  ```html
  <div ng-post="/example" on-success="message = $res">Get {{ message }}</div>
  ```

---

#### `on-error`

- **Type:** [Expression](../../../typedoc/types/Expression.html)
- **Description:** Evaluates expression when request fails. Response data is
  available as a `$res` property on the scope.
- **Example:**

  ```html
  <div ng-post="/example" on-error="errormessage = $res">
    Get {{ errormessage }}
  </div>
  ```

---

#### `data-state-success`

- **Type:** `string`
- **Description:** Name of the state to nagitate to when request succeeds
- **Example:**

  ```html
  <ng-view></ng-view>
  <div ng-post="/example" data-state-success="account">Get</div>
  ```

---

#### `data-state-error`

- **Type:** `string`
- **Description:** Name of the state to nagitate to when request fails
- **Example:**

  ```html
  <ng-view></ng-view>
  <div ng-post="/example" data-state-error="login">Get</div>
  ```

---
