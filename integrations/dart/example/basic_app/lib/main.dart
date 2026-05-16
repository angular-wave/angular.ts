import 'dart:js_interop';

import 'package:angular_ts/angular_ts.dart' as ng;
import 'package:web/web.dart';

/// The todo store token.
final todoStoreToken = ng.token<TodoStore>('todoStore');

@JSExport()

/// Todo item exposed to the AngularTS template.
final class Todo {
  /// Creates a todo item.
  Todo(this.task, {this.done = false});

  /// Text displayed for the item.
  final String task;

  /// Whether the item is complete.
  bool done;
}

/// Dart-owned todo store injected into AngularTS.
final class TodoStore {
  /// Todo items currently known to the application.
  final List<Todo> todos = <Todo>[
    Todo('Learn AngularTS'),
    Todo('Build an AngularTS app'),
  ];

  /// Adds and returns a new todo item.
  Todo add(String title) {
    final todo = Todo(title);
    todos.add(todo);
    return todo;
  }

  /// Removes completed todo items.
  void archiveDone() {
    todos.removeWhere((todo) => todo.done);
  }
}

@JSExport()

/// Controller for the Dart-authored AngularTS todo component.
final class TodoListController {
  /// Creates a todo list controller.
  TodoListController(this.store, this.scope)
      : jsTodos = _toJsTodos(store.todos) {
    _publishScopeState();
  }

  /// Store backing the todo list.
  final TodoStore store;

  /// AngularTS scope used to publish JS arrays and request a refresh.
  final ng.Scope<Object> scope;

  /// JavaScript array consumed by the AngularTS template.
  JSArray<JSAny?> jsTodos;

  /// Todo items exposed to the AngularTS template.
  JSArray<JSAny?> get items => jsTodos;

  /// Current Dart todo models.
  List<Todo> get todos => store.todos;

  /// Adds the submitted task text as a new item.
  void add(String title) {
    final task = title.trim();
    if (task.isEmpty) {
      return;
    }

    store.add(task);
    refresh();
  }

  /// Updates completion state for the item at [index].
  void setDone(num index, bool done) {
    todos[index.toInt()].done = done;
    refresh();
  }

  /// Removes all completed items.
  void archive() {
    store.archiveDone();
    refresh();
  }

  /// Publishes changes made through Dart callbacks.
  void refresh() {
    jsTodos = _toJsTodos(todos);
    _publishScopeState();
  }

  void _publishScopeState() {
    scope.unsafe.set('items', jsTodos);
  }
}

JSArray<JSAny?> _toJsTodos(List<Todo> todos) {
  return [
    for (final todo in todos) createJSInteropWrapper(todo),
  ].toJS;
}

void main() {
  final app = ng.module('dartDemo');

  app.factory(todoStoreToken, ng.inject0(TodoStore.new));

  app.component(
    'todoList',
    ng.Component<JSObject>(
      template: '''
        <section class="todo-app">
          <button type="button" ng-click="ctrl.archive()">Archive</button>

          <ul class="todo-items">
            <li
              class="todo-row"
              ng-repeat="todo in items"
              ng-class="{done: todo.done}"
            >
              <span>{{ todo.task }} {{ todo.done }}</span>
              <label>
                <input
                  type="checkbox"
                  ng-model="todo.done"
                  ng-change="ctrl.setDone(\$index, todo.done)"
                />
              </label>
            </li>
          </ul>

          <form class="todo-entry" ng-submit="ctrl.add(newTodo)">
            <input
              aria-label="Todo title"
              type="text"
              ng-model="newTodo"
              ng-required="true"
            />
            <button type="submit">Add</button>
          </form>
        </section>
      ''',
      controllerAs: 'ctrl',
      controller: ng.inject2(
        todoStoreToken,
        ng.scopeToken,
        (TodoStore store, ng.Scope<Object> scope) => createJSInteropWrapper(
          TodoListController(store, scope),
        ),
      ),
    ),
  );

  ng.bootstrap(document.body!, [app.name]);
}
