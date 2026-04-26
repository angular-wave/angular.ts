---
title: "Build your first AngularTS app"
weight: 30
description: "A step-by-step guide to creating modules, controllers, and directives in AngularTS — with a counter example and a complete todo list application."
---
AngularTS apps are built from HTML and JavaScript — no compilation required. This guide walks through creating a module, wiring up a controller, and using directives to bind data to the DOM. By the end you will have a working counter and a functional todo list.

### Add AngularTS to your page

Create an HTML file and include the AngularTS script from the CDN. This single tag is all you need to get the full framework:

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>My AngularTS App</title>
    <script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
  </head>
  <body>
    <!-- application markup goes here -->
  </body>
</html>
```

If you are using npm, install the package and import the singleton instead:

```bash
npm install @angular-wave/angular.ts
```

```javascript
import { angular } from "@angular-wave/angular.ts";
```

### Create a module

A module is the top-level container for your application. It holds controllers, services, directives, and filters. Create one by calling `angular.module()` with a name and an empty dependency array:

```javascript
const app = angular.module("myApp", []);
```

The first argument is the module name. The second argument lists other modules your module depends on — an empty array means no dependencies. You reference this name in the `ng-app` attribute to tell AngularTS which module to bootstrap.

Connect the module to your HTML by adding `ng-app` to a container element:

```html
<body ng-app="myApp">
  <!-- AngularTS controls everything inside this element -->
</body>
```

### Add a controller

Controllers attach behavior to a region of the DOM. They receive a `$scope` object — a plain JavaScript object that acts as the data model for their template. Anything you put on `$scope` becomes available in the HTML template.

```javascript
const app = angular.module("myApp", []);

app.controller("CounterController", function ($scope) {
  $scope.count = 0;

  $scope.increment = function () {
    $scope.count++;
  };

  $scope.decrement = function () {
    if ($scope.count > 0) {
      $scope.count--;
    }
  };
});
```

Attach the controller to a DOM element with `ng-controller`:

```html
<body ng-app="myApp">
  <div ng-controller="CounterController">
    <p>Count: {{ count }}</p>
    <button ng-click="increment()">+</button>
    <button ng-click="decrement()">-</button>
  </div>
</body>
```

The `{{ count }}` expression is AngularTS's interpolation syntax — it renders the current value of `$scope.count` and updates automatically whenever the value changes. `ng-click` binds a click event to the controller method.

### Use directives in your template

Directives are the building blocks of AngularTS templates. They extend HTML with behavior declared as attributes or element names. The core library ships over 50 directives covering data binding, conditional rendering, list rendering, forms, and HTTP requests.

Here is a complete counter example using only HTML attributes and no separate JavaScript file:

```html
<!doctype html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
  </head>
  <body>
    <section ng-app ng-cloak>
      <button ng-init="count = 0" ng-click="count++">
        Count is: {{ count }}
      </button>
    </section>
  </body>
</html>
```

Key directives used here:

* `ng-app` — designates the root element of the application and triggers auto-bootstrap
* `ng-cloak` — hides the element until AngularTS has compiled the template, preventing a flash of unrendered `{{ }}` expressions
* `ng-init` — initializes a scope variable inline; useful for simple cases without a controller
* `ng-click` — evaluates an expression when the element is clicked
## Complete example: todo list

The following example demonstrates a more complete application using a named module, a controller, two-way binding with `ng-model`, list rendering with `ng-repeat`, and conditional display with `ng-show`. Everything runs from a single HTML file.

```html
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Todo List</title>
    <script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
    <style>
      .done { text-decoration: line-through; color: #999; }
    </style>
  </head>
  <body ng-app="todoApp">
    <div ng-controller="TodoController">
      <h1>Todo List</h1>

      <!-- Add new item -->
      <form ng-submit="addTodo()">
        <input
          ng-model="newTodo"
          placeholder="What needs doing?"
          required
        />
        <button type="submit">Add</button>
      </form>

      <!-- Remaining count -->
      <p ng-show="todos.length > 0">
        {{ remaining() }} of {{ todos.length }} remaining
      </p>

      <!-- List of todos -->
      <ul>
        <li ng-repeat="todo in todos">
          <input type="checkbox" ng-model="todo.done" />
          <span ng-class="{ done: todo.done }">{{ todo.text }}</span>
          <button ng-click="removeTodo($index)">Remove</button>
        </li>
      </ul>

      <!-- Clear completed -->
      <button ng-click="clearDone()" ng-show="todos.length > remaining()">
        Clear completed
      </button>
    </div>

    <script>
      angular.module("todoApp", []).controller("TodoController", function ($scope) {
        $scope.todos = [
          { text: "Learn AngularTS", done: true },
          { text: "Build something", done: false },
        ];

        $scope.newTodo = "";

        $scope.addTodo = function () {
          if ($scope.newTodo.trim()) {
            $scope.todos.push({ text: $scope.newTodo.trim(), done: false });
            $scope.newTodo = "";
          }
        };

        $scope.removeTodo = function (index) {
          $scope.todos.splice(index, 1);
        };

        $scope.remaining = function () {
          return $scope.todos.filter(function (t) {
            return !t.done;
          }).length;
        };

        $scope.clearDone = function () {
          $scope.todos = $scope.todos.filter(function (t) {
            return !t.done;
          });
        };
      });
    </script>
  </body>
</html>
```

This example uses:

| Directive   | Purpose                                                      |
| ----------- | ------------------------------------------------------------ |
| `ng-model`  | Two-way binding between the input value and `$scope.newTodo` |
| `ng-submit` | Calls `addTodo()` when the form is submitted                 |
| `ng-repeat` | Renders a `<li>` for each item in `$scope.todos`             |
| `ng-class`  | Adds the `done` CSS class when `todo.done` is `true`         |
| `ng-show`   | Shows the element only when the expression is truthy         |
| `ng-click`  | Calls a scope function when the element is clicked           |
## Using TypeScript

If you are working with npm and TypeScript, annotate the controller function using the `ng.Scope` type:

```typescript

interface TodoItem {
  text: string;
  done: boolean;
}

interface TodoScope extends ng.Scope {
  todos: TodoItem[];
  newTodo: string;
  addTodo(): void;
  remaining(): number;
}

angular.module("todoApp", []).controller(
  "TodoController",
  function ($scope: TodoScope) {
    $scope.todos = [{ text: "Learn AngularTS", done: false }];
    $scope.newTodo = "";

    $scope.addTodo = function () {
      if ($scope.newTodo.trim()) {
        $scope.todos.push({ text: $scope.newTodo.trim(), done: false });
        $scope.newTodo = "";
      }
    };

    $scope.remaining = function () {
      return $scope.todos.filter((t) => !t.done).length;
    };
  }
);
```

> **Note:** TypeScript declarations ship with the package under `@types/`. No separate `@types/angular-wave__angular.ts` package is needed.
## Next steps

#### [Core concepts]({{< relref "/docs/concepts/modules" >}})

Understand how modules, dependency injection, and scopes work together.

#### [Directives reference]({{< relref "/docs/directives/overview" >}})

Browse all 50+ built-in directives with examples.

#### [Routing]({{< relref "/docs/routing/overview" >}})

Add state-based routing with nested views and URL matching.

#### [Services]({{< relref "/docs/services/http" >}})

Use built-in services for HTTP, WebSockets, REST, and more.
