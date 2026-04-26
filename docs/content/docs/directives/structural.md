---
title: "Structural Directives: ng-if, ng-repeat, ng-switch"
weight: 300
description: "Master AngularTS structural directives including ng-if, ng-show, ng-hide, ng-repeat with track by, ng-switch, ng-include, and ng-non-bindable."
---
Structural directives reshape the DOM by adding, removing, or repeating elements. Unlike attribute directives that modify an existing element, structural directives use transclusion to stamp out or remove entire sections of the template. They run at high priority (600–1000) and set `terminal: true` so that lower-priority directives do not compile until the structure is resolved.
## ng-if

`ng-if` conditionally includes or removes a DOM element based on a scope expression. When the expression becomes falsy, the element and its entire subtree — including child scopes and event listeners — are destroyed. When it becomes truthy again, a fresh element and child scope are created.

```html
<div ng-if="user.role === 'admin'">
  <h2>Admin Panel</h2>
  <p>Welcome, {{ user.name }}. You have full access.</p>
</div>
```

```html
<div ng-if="isLoggedIn">
  <p>Welcome back, {{ user.name }}!</p>
  <button ng-click="logout()">Log out</button>
</div>
<div ng-if="!isLoggedIn">
  <p>Please <a href="/login">sign in</a> to continue.</p>
</div>
```

The implementation uses `transclude: "element"` at priority 600, which means the compiler replaces the element with a comment placeholder and hands the element template to the transclusion function. When the expression turns truthy, the transclusion function clones the template and inserts it after the comment. When it turns falsy, the child scope is destroyed and the clone is removed.

If the `$animate` service is available on the element, `ng-if` delegates to `$animate.enter` and `$animate.leave` to trigger CSS transition hooks.

> **Note:** **`ng-if` vs `ng-show`**: `ng-if` completely removes the element from the DOM (destroying the child scope), while `ng-show` keeps the element in the DOM and toggles an `ng-hide` CSS class. Use `ng-if` when the hidden content is expensive to keep around or when it should not run watchers while invisible.
### Parameters
#### `ng-if`

- **Type:** `expression`
- **Required:** yes

An expression evaluated on each digest. When truthy, the element is inserted into the DOM in a new child scope. When falsy, the element and its child scope are destroyed.

***
## ng-show / ng-hide

`ng-show` and `ng-hide` toggle element visibility without removing the element from the DOM. They work by adding or removing the `ng-hide` CSS class, which sets `display: none`.

### ng-show

Removes `ng-hide` when the expression is truthy, showing the element.

```html
<div ng-show="form.submitted">
  <p>Thank you! Your form was submitted successfully.</p>
</div>
```

### ng-hide

Adds `ng-hide` when the expression is truthy, hiding the element.

```html
<div ng-hide="isLoading">
  <p>Content is ready.</p>
</div>
<div ng-show="isLoading">
  <p>Loading...</p>
</div>
```

Both directives integrate with `$animate`. When the animate service detects the element has animation hooks, they call `$animate.addClass` or `$animate.removeClass` with the temporary class `ng-hide-animate` for the duration of the animation.

```css
.my-panel.ng-hide {
  opacity: 0;
}
.my-panel.ng-hide-animate {
  transition: opacity 0.3s ease;
}
```
#### `ng-show`

- **Type:** `expression`
- **Required:** yes

When truthy, `ng-hide` class is removed from the element, making it visible.
#### `ng-hide`

- **Type:** `expression`
- **Required:** yes

When truthy, `ng-hide` class is added to the element, hiding it.

***
## ng-repeat

`ng-repeat` iterates over a collection (array or object) and stamps a copy of the template for each item. Each copy gets its own child scope populated with the iteration variables below.
### Special scope properties

| Variable  | Type    | Description                               |
| --------- | ------- | ----------------------------------------- |
| `$index`  | number  | Zero-based index of the current iteration |
| `$first`  | boolean | `true` for the first item                 |
| `$last`   | boolean | `true` for the last item                  |
| `$middle` | boolean | `true` when neither first nor last        |
| `$even`   | boolean | `true` when `$index` is even              |
| `$odd`    | boolean | `true` when `$index` is odd               |
### Repeating over an array

```html
  <li ng-repeat="product in products">
    <strong>{{ product.name }}</strong> — ${{ product.price }}
    <span ng-if="$first">(newest)</span>
    <span ng-if="$last">(oldest)</span>
  </li>
</ul>
```
### Repeating over an object

Use the `(key, value)` tuple syntax to iterate over an object's own enumerable properties. Keys starting with `$` are excluded automatically.

```html
  <dt ng-repeat="(key, value) in user">{{ key }}</dt>
  <dd>{{ value }}</dd>
</dl>
```
### Track by

By default, `ng-repeat` tracks items by identity (`hashKey`). When the collection changes, AngularTS tries to reuse existing DOM nodes by matching on the track key. The `track by` clause lets you provide a stable identity for items, which dramatically improves performance when working with large lists or when items are replaced by new objects from the server.

```html
<div ng-repeat="user in users">{{ user.name }}</div>

<!-- With track by id — DOM nodes for unchanged users are reused -->
<div ng-repeat="user in users track by user.id">{{ user.name }}</div>

<!-- Track by $index — useful for arrays of primitives -->
<div ng-repeat="tag in tags track by $index">{{ tag }}</div>
```
### Alias with `as`

The `as` clause aliases the filtered collection to a new scope variable. This is useful when you apply filters to the collection and need the filtered count.

```html
<p>{{ filtered.length }} of {{ products.length }} items</p>
<ul>
  <li ng-repeat="product in products | filter:searchText as filtered">
    {{ product.name }}
  </li>
</ul>
```
### Animation support

Add the `animate` attribute to enable `$animate.enter` / `$animate.leave` on items:

```html
  {{ item.name }}
</li>
```

```css
  opacity: 0;
  transition: opacity 0.3s;
}
.list-item.ng-enter-active {
  opacity: 1;
}
.list-item.ng-leave {
  opacity: 1;
  transition: opacity 0.3s;
}
.list-item.ng-leave-active {
  opacity: 0;
}
```

> **Warning:** Duplicate track keys in the same repeater throw an `ngRepeat:dupes` error. Use `track by $index` or a unique property like `track by item.id` to guarantee uniqueness.
#### `ng-repeat`

- **Type:** `string`
- **Required:** yes

Expression in one of the forms:

* `item in collection`
* `(key, value) in object`
* `item in collection track by expression`
* `item in collection | filter as alias`

***
## ng-switch

`ng-switch` renders exactly one child block matching the current value of a watched expression. It is the structural equivalent of a JavaScript `switch` statement.

```html
  <div ng-switch-when="active">
    <p>Account is active. Welcome, {{ user.name }}!</p>
  </div>
  <div ng-switch-when="suspended">
    <p>Your account has been suspended. Please contact support.</p>
  </div>
  <div ng-switch-when="pending">
    <p>Your account is awaiting verification.</p>
  </div>
  <div ng-switch-default>
    <p>Unknown account status.</p>
  </div>
</div>
```

`ng-switch-when` registers its transclusion function under the key `!value` (to avoid collisions with `$`-prefixed keys) using an internal `NgSwitchController`. When the watched expression changes, the currently shown block has its scope destroyed (with an optional `$animate.leave`) and the matching block is transcluded into place.
### Multiple values on one case

The `ng-switch-when-separator` attribute allows a single `ng-switch-when` to match multiple values:

```html
  <div ng-switch-when="Saturday Sunday" ng-switch-when-separator=" ">
    Weekend!
  </div>
  <div ng-switch-default>Weekday</div>
</div>
```
#### `ng-switch`

- **Type:** `expression`
- **Required:** yes

The expression whose value is compared against `ng-switch-when` values.
#### `ng-switch-when`

- **Type:** `string`
- **Required:** yes

The literal string value to match against the `ng-switch` expression.
#### `ng-switch-default`

- **Type:** `none`

Rendered when no `ng-switch-when` matches the current value.

***
## ng-include

`ng-include` fetches an external HTML template, compiles it in the current scope (or a new child scope), and inserts it into the DOM. It watches the URL expression and replaces the content whenever the URL changes.

```html
<div ng-include="'/partials/user-profile.html'"></div>

<!-- Include a dynamic template based on user role -->
<div ng-include="'/partials/nav-' + user.role + '.html'"></div>
```

The directive emits three events on the scope:

* **`$includeContentRequested`** — when the template request begins
* **`$includeContentLoaded`** — when the template is compiled and inserted
* **`$includeContentError`** — when the template request fails

```html
<div ng-include="templateUrl"
     ng-init="templateUrl = '/partials/home.html'"
     onload="onTemplateLoaded()">
</div>
```

```javascript
  console.log('Template inserted successfully');
};
```
#### `ng-include`

- **Type:** `expression`
- **Required:** yes

Expression evaluating to the URL of the template to load. The URL is fetched via `$templateRequest` (which uses the template cache if available).
#### `onload`

- **Type:** `expression`

Expression evaluated after the template is compiled and inserted.
#### `autoscroll`

- **Type:** `expression`

When truthy, calls `$anchorScroll` after the template is inserted.

***
## ng-non-bindable

`ng-non-bindable` tells the AngularTS compiler to skip the element and all its descendants entirely. No interpolation, directives, or watches are set up inside the marked section.

```html
<pre ng-non-bindable>
  &lt;p&gt;Use {{ expression }} to interpolate values.&lt;/p&gt;
  &lt;div ng-bind="myValue"&gt;&lt;/div&gt;
</pre>
```

```html
<div ng-non-bindable>
  {% raw %}{{ jinja_template_variable }}{% endraw %}
</div>
```

> **Note:** `ng-non-bindable` is essential when displaying code documentation, Jinja/Twig snippets, or any content that uses `{{ }}` but should not be treated as AngularTS expressions.
