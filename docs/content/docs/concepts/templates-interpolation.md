---
title: "Templates, interpolation, and expression parsing"
weight: 230
description: "Master the {{ }} interpolation syntax, one-time bindings, filter pipes, and how $interpolate and $parse power programmatic expression evaluation."
---
Templates in AngularTS are ordinary HTML files augmented with a handful of special syntax forms. The most fundamental is **interpolation**: the `{{ expression }}` delimiters that tell the template compiler to evaluate an expression against the current scope and render its result as text. The `$interpolate` service handles this translation at compile time, and the reactive proxy system ensures the DOM re-renders whenever the underlying data changes.
## Interpolation syntax

Place any valid AngularTS expression between `{{` and `}}` to render its current value:

```html
<p>Hello, {{ user.name }}!</p>

<!-- Method call -->
<p>Total: {{ cart.getTotal() }}</p>

<!-- Arithmetic -->
<p>Items: {{ items.length }}</p>

<!-- Ternary -->
<p>Status: {{ isActive ? 'Online' : 'Offline' }}</p>

<!-- String concatenation -->
<p>{{ firstName + ' ' + lastName }}</p>
```

The expression is parsed by `$parse`, evaluated against the current scope, and the result is stringified and inserted into the text node. If the expression throws, `$interpolate` catches and routes the error through `$exceptionHandler`.
## What expressions can contain

AngularTS expressions are a safe subset of JavaScript. They support:

#### Property access

`user.profile.name`, `items[0].label`

#### Method calls

`format(date)`, `list.filter(fn)`

#### Arithmetic and comparison

`count * price`, `score >= 100`

#### Logical operators

`isAdmin || isMod`, `name && name.length`

#### Ternary

`flag ? 'yes' : 'no'`

#### Array and object literals

`[a, b, c]`, `{ key: value }`

Expressions cannot contain `new`, `delete`, `typeof`, `void`, assignment operators, or any access to the global scope. This sandbox keeps templates safe against inadvertent or malicious code execution.
## Filters in templates

Apply a filter to an expression using the pipe character `|`. Filters transform the value before it is rendered. You can chain multiple filters:

```html
<p>Price: {{ product.price | currency:'USD' }}</p>

<!-- Sort a list by a property -->
<li ng-repeat="item in items | orderBy:'name'">{{ item.name }}</li>

<!-- Limit a list and filter it by a search term -->
<li ng-repeat="item in items | filter:search | limitTo:10">
  {{ item.title }}
</li>

<!-- Date formatting -->
<span>{{ event.date | date:'longDate' }}</span>

<!-- Chained filters -->
<p>{{ message | uppercase | limitTo:50 }}</p>
```

Filters receive the value as their first argument and any parameters after the colon as subsequent arguments. They are pure functions — given the same input, they always produce the same output, which lets the reactive system cache their results.
## One-time bindings

Prefix an expression with `::` to evaluate it once and then release the binding. This is a performance optimization for data that is set during initialization and never changes:

```html
<h1>{{ ::pageTitle }}</h1>
<p>User ID: {{ ::user.id }}</p>

<!-- Inside ng-repeat — binds each item once -->
<li ng-repeat="item in ::staticList">{{ ::item.name }}</li>
```

> **Tip:** Use one-time bindings for any data that is effectively constant after initialization: configuration values, user identity, translated strings, or items loaded once at startup. They reduce the number of active watchers and improve scroll performance in long lists.
## The `$interpolate` service

The `$interpolate` service is what `$compile` uses internally to process interpolation expressions in templates. You can use it directly when you need to evaluate an interpolation string programmatically.

```typescript
  '$scope', '$interpolate',
  function ($scope, $interpolate) {
    // Compile a template string into a reusable function
    const greetFn = $interpolate('Hello, {{ name }}! You have {{ count }} messages.');

    $scope.name = 'Alice';
    $scope.count = 5;

    // Evaluate the template against a context object
    const result = greetFn($scope);
    // → "Hello, Alice! You have 5 messages."

    // The interpolation function exposes the raw expressions it found
    console.log(greetFn.expressions); // ['name', 'count']
    console.log(greetFn.exp);         // 'Hello, {{ name }}! You have {{ count }} messages.'
  },
]);
```
### `$interpolate` parameters

```typescript
  text: string,
  mustHaveExpression?: boolean,  // return undefined if no {{ }} found
  trustedContext?: SceContext,   // SCE context for security checking
  allOrNothing?: boolean,        // return undefined if any expression is undefined
): InterpolationFunction | undefined
```

The returned `InterpolationFunction` is callable with `(context, cb?)`. When `cb` is provided, `$interpolate` sets up `$watch` calls on the scope so `cb` is invoked whenever any expression in the template changes.

```typescript

// Watch mode: cb fires on every change
fn($scope, (newValue) => {
  titleElement.textContent = newValue;
});
```
### Customizing the delimiters

The default delimiters are `{{` and `}}`. Configure them via `$interpolateProvider` in a config block:

```typescript
  $interpolateProvider.startSymbol = '{[';
  $interpolateProvider.endSymbol = ']}';
}]);
```

After this change, templates use `{[ expression ]}` instead. This is useful when you are embedding AngularTS in a server-side template engine that already uses `{{` (such as Jinja2 or Handlebars).
## The `$parse` service

`$parse` is the lower-level primitive beneath `$interpolate`. It compiles a single expression string into a `CompiledExpression` function that can be called with a context:

```typescript
  '$scope', '$parse',
  function ($scope, $parse) {
    $scope.user = { name: 'Bob', score: 42 };

    // Compile once, call many times
    const getScore = $parse('user.score');

    console.log(getScore($scope));  // 42

    // Expressions with assign support two-way binding
    const nameParse = $parse('user.name');
    nameParse.assign($scope, 'Carol');
    console.log($scope.user.name); // 'Carol'

    // Parsed expressions are cached — repeated calls with the same
    // string return the same compiled function object
    const getScore2 = $parse('user.score');
    console.log(getScore === getScore2); // true
  },
]);
```
### Compiled expression properties

| Property         | Type        | Description                                                     |
| ---------------- | ----------- | --------------------------------------------------------------- |
| `_constant`      | `boolean`   | `true` if the expression is a literal constant                  |
| `_literal`       | `boolean`   | `true` if the expression is a simple literal                    |
| `_assign`        | `function?` | Present for l-value expressions; assigns a value to the context |
| `_inputs`        | `any[]?`    | Sub-expressions tracked for change detection                    |
| `_decoratedNode` | `BodyNode`  | The annotated AST for this expression                           |
## Security and SCE

When binding HTML content directly into the DOM, AngularTS enforces **Strict Contextual Escaping (SCE)**. Plain interpolation always produces text, never HTML. To bind HTML you must use `ng-bind-html` with a trusted value:

```html
<p>{{ userComment }}</p>

<!-- To render HTML, mark it as trusted first -->
<p ng-bind-html="trustedHtml"></p>
```

```typescript
  '$scope', '$sce',
  function ($scope, $sce) {
    // Explicitly trust HTML from a known-safe source
    $scope.trustedHtml = $sce.trustAsHtml('<strong>Bold</strong> text');
  },
]);
```

> **Warning:** Never call `$sce.trustAsHtml()` on user-provided input. Only use it on HTML that your application controls — such as server-rendered content that has already been sanitized.
## Escaping interpolation delimiters

If you need to display literal `{{` in a template without triggering interpolation, escape each character with a backslash:

```html
<p>The syntax is \{\{ expression \}\}</p>
```

`$interpolate` unescapes these sequences before returning the final string.
