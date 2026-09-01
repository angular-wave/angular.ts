---
title: 'Build your first application'
linkTitle: 'First application'
weight: 30
description:
  'Build a task list from one HTML file while learning modules, controllers,
  state, events, forms, and reactive rendering.'
---

## What you will build

You will build a task list that accepts text, adds tasks, marks them complete,
and shows the remaining count. The whole application fits in one HTML file.

## Before you start

Complete [installation]({{< relref "/docs/get-started/installation" >}}) or use
the CDN script shown below. Create `index.html`.

## Create the application

```html
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/@angular-wave/angular.ts/dist/angular-ts.umd.min.js"></script>
  </head>
  <body ng-app="todoApp" ng-controller="TodoController">
    <form ng-submit="addTodo()">
      <input ng-model="draft" placeholder="What needs doing?" required />
      <button>Add</button>
    </form>
    <p>{{ remaining() }} remaining</p>
    <ul>
      <li ng-repeat="todo in todos">
        <input type="checkbox" ng-model="todo.done" /> {{ todo.title }}
      </li>
    </ul>
    <!-- Add the script below here. -->
  </body>
</html>
```

Place this script before the closing `body` tag, where the comment appears:

```html
<script>
  angular.createModule('todoApp', []).controller('TodoController', [
    '$scope',
    ($scope) => {
      $scope.draft = '';
      $scope.todos = [{ title: 'Learn AngularTS', done: false }];
      $scope.addTodo = () => {
        if (!$scope.draft.trim()) return;
        $scope.todos.push({ title: $scope.draft.trim(), done: false });
        $scope.draft = '';
      };
      $scope.remaining = () => $scope.todos.filter((todo) => !todo.done).length;
    },
  ]);
</script>
```

Open the file in a browser. Enter a task and press Add. The list and count
change without a page reload.

## Understand each part

`ng-app="todoApp"` starts the named module. A module is the application
container. `ng-controller` connects behavior and state to this part of the DOM.
The injected `$scope` is the reactive state visible to the HTML template.

`ng-model` keeps an input and state property synchronized. `ng-submit` runs a
function when the form is submitted. `ng-repeat` creates one list item per task.
`{{ remaining() }}` displays an expression and refreshes when its reactive
inputs change.

## Make a change

Change the initial task title, reload the page, and add two tasks. Then open the
browser console and resolve any reported error before continuing.

## Next step

Read [how AngularTS works]({{< relref "/docs/get-started/how-angular-works" >}})
to connect the code to the framework lifecycle.
