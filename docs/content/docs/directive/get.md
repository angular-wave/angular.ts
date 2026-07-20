---
title: ng-get
description: >
  Initiates a GET request
---

### Description

The `ng-get` directive allows you to fetch content via `$http` service from a
remote URL and insert, replace, or manipulate it into the DOM. For DOM
manipulation to work, the response must be HTML content. If the server endpoint
returns JSON, the response is available to `on-success` as `$res`. JSON never
mutates the current scope implicitly, and the swap strategy is ignored.

#### Example

```html
<section>
  <div ng-get="/json" on-success="person = $res">Get</div>
  <!-- Endpoint returns {name: 'Bob'} -->
  {{ person.name }}
</section>
```

String error responses use the configured DOM swap. JSON errors are available
to `on-error` as `$res` and require explicit assignment.

#### Example

```html
<section>
  <div ng-get="/json" on-error="requestError = $res">Get</div>
  <!-- Endpoint returns 404 with {error: 'Not found'} -->
  {{ requestError.error }}
</section>
```

Additional options for request and response handling can be modified with
attributes provided below.

### Parameters

---

#### `ng-get`

- **Type:** `string`
- **Description:** A URL to issue a GET request to
- **Example:**

  ```html
  <div ng-get="/example">get</div>
  ```

---

### Modifiers

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
  <div ng-get="/example" trigger="mouseover">Get</div>
  ```

---

#### `data-latch`

- **Type:** `string`
- **Description:** Triggers a request whenever its value changes. This attribute
  can be used with interpolation (e.g., {{ expression }}) to observe reactive
  changes in the scope.
- **Example:**

  ```html
  <div ng-get="/example" latch="{{ latch }}" ng-mouseover="latch = !latch">
    Get
  </div>
  ```

---

#### `data-swap`

- **Type:** [SwapMode](../../../typedoc/variables/SwapMode.html)
- **Description:** Controls how the response is inserted
- **Example:**

  ```html
  <div ng-get="/example" swap="outerHTML">Get</div>
  ```

---

#### `data-target`

- **Type:**
  [selectors](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector#selectors)
- **Description:** Specifies the DOM element where a string response should be
  rendered.
- **Example:**

  ```html
  <div ng-get="/example" data-target=".test">Get</div>
  <div ng-get="/json" on-success="person = $res">{{ person.name }}</div>
  ```

---

#### `data-delay`

- **Type:**
  [delay](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#delay)
- **Description:** Delay request by N millisecond
- **Example:**

  ```html
  <div ng-get="/example" delay="1000">Get</div>
  ```

---

#### `data-interval`

- **Type:**
  [delay](https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval#delay)
- **Description:** Repeat request every N milliseconds
- **Example:**

  ```html
  <div ng-get="/example" interval="1000">Get</div>
  ```

---

#### `data-throttle`

- **Type:**
  [delay](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#delay)
- **Description:** Ignores subsequent requests for N milliseconds
- **Example:**

  ```html
  <div ng-get="/example" throttle="1000">Get</div>
  ```

---

#### `data-loading`

- **Type:** N/A
- **Description:** Adds a data-loading="true/false" flag during request
  lifecycle.
- **Example:**

  ```html
  <div ng-get="/example" data-loading>Get</div>
  ```

---

#### `data-loading-class`

- **Type:** `string`
- **Description:** Toggles the specified class on the element while loading.
- **Example:**

  ```html
  <div ng-get="/example" data-loading-class="red">Get</div>
  ```

---

#### `on-success`

- **Type:** [Expression](../../../typedoc/types/Expression.html)
- **Description:** Evaluates expression when request succeeds. Response data is
  available as a `$res` property on the scope.
- **Example:**

  ```html
  <div ng-get="/example" on-success="message = $res">Get {{ message }}</div>
  ```

---

#### `on-error`

- **Type:** [Expression](../../../typedoc/types/Expression.html)
- **Description:** Evaluates expression when request fails. Response data is
  available as a `$res` property on the scope.
- **Example:**

  ```html
  <div ng-get="/example" on-error="errormessage = $res">
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
  <div ng-get="/example" data-state-success="account">Get</div>
  ```

---

#### `data-state-error`

- **Type:** `string`
- **Description:** Name of the state to nagitate to when request fails
- **Example:**

  ```html
  <ng-view></ng-view>
  <div ng-get="/example" data-state-error="login">Get</div>
  ```

---
