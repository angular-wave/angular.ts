---
title: "HTTP Directives: ng-get, ng-post, ng-put, ng-sse"
linkTitle: "HTTP Directives"
weight: 280
description: "Make HTTP requests and stream SSE from HTML using ng-get, ng-post, ng-put, ng-delete, and ng-sse — no JavaScript required for common data-fetching patterns."
---
AngularTS ships a family of declarative HTTP directives inspired by HTMX. Rather than wiring up `$http` calls in a controller, you attach `ng-get`, `ng-post`, `ng-put`, `ng-delete`, or `ng-sse` directly to HTML elements. The directives handle the request lifecycle, DOM insertion, loading states, error handling, and explicit response assignment — all configured through HTML attributes.
## How they differ from `$http`

When you use `$http` directly you write controller code: define the request, subscribe to the promise, update scope properties, handle errors, and trigger a digest. The HTTP directives do all of this declaratively:

```html
<button ng-click="loadUser()">Load user</button>
<p>{{ user.name }}</p>
```

```javascript
  $http.get('/api/user/1').then(function(res) {
    $scope.user = res.data;
  });
};
```

```html
<button ng-get="/api/user/1" on-success="user = $res">Load user</button>
<p>{{ user.name }}</p>
```

JSON is available to `on-success` as `$res`; it never mutates scope implicitly.
HTML responses are compiled and inserted using the configured swap strategy.

***
## ng-get

`ng-get` fires a GET request when the configured event occurs (default: `click` for buttons, `change` for inputs, `submit` for forms).

```html
<button ng-get="/api/weather?city=London"
        on-success="weather = $res">
  Get weather
</button>
{{ weather.temperature }}°C — {{ weather.description }}
```

```html
<button ng-get="/partials/user-card.html"
        data-swap="outerHTML"
        data-target="#user-area">
  Show profile
</button>
<div id="user-area"></div>
```
### Automatic trigger

Use `trigger="load"` to fire the request immediately when the element is linked (no user interaction required):

```html
<div ng-get="/api/dashboard/stats"
     trigger="load"
     on-success="stats = $res">
  <span ng-bind="stats.users"></span> users
</div>
```
### Polling with interval

```html
<div ng-get="/api/live-count"
     trigger="load"
     on-success="status = $res"
     interval="5000">
  {{ count }} online
</div>
```

***
## ng-post

`ng-post` fires a POST request. On `<form>` elements, the default trigger is `submit` and the form data is collected via `FormData`. On buttons and other elements, the trigger defaults to `click`.

```html
<form ng-post="/api/contact" name="contactForm">
  <input name="email" type="email" ng-model="contact.email" required />
  <textarea name="message" ng-model="contact.message" required></textarea>
  <button type="submit" ng-disabled="contactForm.$invalid">Send</button>
</form>
```

```html
<button ng-post="/api/cart/add"
        on-success="cartMessage = $res.message"
        on-error="cartError = $res.error">
  Add to cart
</button>
```

When the form element has an `enctype` attribute, the request body is URL-encoded using `Content-Type: application/x-www-form-urlencoded`. Without `enctype`, form data is sent as a JSON object.

***
## ng-put

`ng-put` fires a PUT request. Use it to update resources:

```html
      name="profileForm"
      on-success="profileSaved = true"
      data-state-success="dashboard">
  <input name="name" ng-model="user.name" required />
  <input name="email" type="email" ng-model="user.email" required />
  <button type="submit">Save changes</button>
</form>
```

***
## ng-delete

`ng-delete` fires a DELETE request. It shares all the same modifier attributes as `ng-get`:

```html
<li>
  <span>{{ item.name }}</span>
  <button ng-delete="/api/items/{{ item.id }}"
          data-swap="delete"
          data-target="#item-{{ item.id }}">
    Delete
  </button>
</li>
```

***
## ng-sse

`ng-sse` opens a persistent Server-Sent Events connection using the `$sse` service. Incoming JSON is available to `on-success` as `$res`; HTML strings are inserted using the configured swap strategy.

```html
<div ng-sse="/api/events/notifications"
     swap="beforeend">
</div>
```

```html
<div ng-sse="/api/events/market"
     trigger="load"
     on-success="market = $res">
  <p>{{ market.price | currency }}</p>
  <p>{{ market.change }}%</p>
</div>
```

The connection is torn down automatically when the scope is destroyed (e.g., when navigating away). Reconnect behaviour and error logging are provided by the `$sse` service.

```javascript
app.get('/api/events/market', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ price: 42.50, change: 0.3 })}\n\n`);
  }, 2000);

  req.on('close', () => clearInterval(interval));
});
```

***
## Shared modifier attributes

All HTTP directives accept the same set of modifier attributes to control their behaviour:
#### `swap`

- **Type:** `string`
- **Default:** `innerHTML`

Controls how the response HTML is inserted. Possible values:

* `innerHTML` — replaces the element's inner content (default)
* `outerHTML` — replaces the entire element
* `textContent` — inserts plain text without HTML parsing
* `beforebegin` — inserts immediately before the element
* `afterbegin` — inserts inside the element, before its first child
* `beforeend` — inserts inside the element, after its last child
* `afterend` — inserts immediately after the element
* `delete` — removes the target element entirely
* `none` — performs no DOM insertion
#### `data-target`

- **Type:** `CSS selector`

A `querySelector` selector for the element that receives the response. When omitted, the directive element itself is the target.

```html
<button ng-get="/api/user" data-target="#profile-card">Load</button>
<div id="profile-card"></div>
```
#### `trigger`

- **Type:** `DOM event name`

The DOM event that fires the request. Defaults to `click` for buttons and generic elements, `change` for inputs/selects/textareas, and `submit` for forms. Use `"load"` to trigger immediately on link.
#### `latch`

- **Type:** `interpolated expression`

Re-fires the request every time the interpolated value changes.

```html
<div ng-get="/api/search" latch="{{ query }}" swap="innerHTML">
  {{ results.length }} results
</div>
```
#### `interval`

- **Type:** `number`

Fires the request immediately and then repeats every N milliseconds. The interval is cleared when the scope is destroyed.

```html
<div ng-get="/api/status" interval="10000">{{ status }}</div>
```
#### `delay`

- **Type:** `number`

Wait N milliseconds before sending the request after the trigger event fires.
#### `throttle`

- **Type:** `number`

Ignore subsequent trigger events for N milliseconds after the request fires.
#### `loading`

- **Type:** `none`

When present, sets `data-loading="true"` on the element while the request is in flight and `data-loading="false"` when it completes. Useful as a CSS hook.

```html
<button ng-get="/api/data" loading>Load</button>
```

```css
button[data-loading="true"] {
  opacity: 0.6;
  cursor: wait;
}
```
#### `loading-class`

- **Type:** `string`

A CSS class toggled on the element while the request is in flight.

```html
<button ng-get="/api/data" loading-class="is-loading">Load</button>
```
#### `on-success`

- **Type:** `expression`

Expression evaluated when the response has a 2xx status code. The response data is available as `$res`.

```html
<button ng-get="/api/items" on-success="items = $res">Fetch</button>
```
#### `on-error`

- **Type:** `expression`

Expression evaluated when the response has a 4xx or 5xx status code. The response data is available as `$res`.

```html
<button ng-post="/api/login"
        on-success="redirect('/dashboard')"
        on-error="loginError = $res.message">
  Log in
</button>
```
#### `data-state-success`

- **Type:** `string`

Router state name to navigate to on success (calls `$state.go`).
#### `data-state-error`

- **Type:** `string`

Router state name to navigate to on error (calls `$state.go`).
#### `animate`

- **Type:** `none`

When present, enables `$animate` transitions for the swap operation. Requires the `$animate` CSS hooks to be defined.
#### `enctype`

- **Type:** `string`

Sets the `Content-Type` request header and URL-encodes form data. Use `"application/x-www-form-urlencoded"` to replicate a native HTML form submission.

***
## Practical examples
### Loading a data table on mount

```html
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
      <th>Joined</th>
    </tr>
  </thead>
  <tbody ng-get="/api/users"
         trigger="load"
         swap="innerHTML">
    <!-- Populated with server-rendered rows -->
  </tbody>
</table>
```
### Infinite scroll

```html
  <li ng-repeat="post in posts">{{ post.title }}</li>
</ul>

<button ng-get="/api/posts?page={{ nextPage }}"
        ng-viewport
        on-enter="loadMore()"
        data-swap="beforeend"
        data-target="#post-list">
  Load more
</button>
```
### Real-time notifications via SSE

```html
  <span ng-bind="notifications.unread"></span>
</div>

<div ng-sse="/api/events/notifications"
     trigger="load"
     on-success="notifications = $res">
</div>
```
### Form submission with redirect on success

```html
      ng-post="/api/auth/login"
      data-state-success="app.dashboard"
      on-error="authError = $res.message">
  <input type="email" name="email" ng-model="credentials.email" required />
  <input type="password" name="password" ng-model="credentials.password" required />
  <p ng-if="authError" ng-bind="authError"></p>
  <button type="submit" ng-disabled="loginForm.$invalid">Log in</button>
</form>
```
