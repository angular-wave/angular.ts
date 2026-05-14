package org.angular.ts.demo.j2cl;

import jsinterop.annotations.JsConstructor;
import jsinterop.annotations.JsFunction;
import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsType;
import jsinterop.base.Js;
import jsinterop.base.JsPropertyMap;

/** AngularTS controller implemented in Java and compiled with J2CL. */
@JsType(namespace = JsPackage.GLOBAL, name = "J2clTodoController")
public final class TodoController {
  private final JsPropertyMap<Object> scope;
  private double nextId = 3;
  private String greeting = "J2CL Todo App";
  private String newTodo = "";
  private double remainingCount = 2;
  private Todo[] tasks = {
    new Todo(1, "Learn AngularTS", false),
    new Todo(2, "Compile the todo app with J2CL", false)
  };

  @JsConstructor
  public TodoController(Object scope) {
    this.scope = Js.asPropertyMap(scope);
    syncTemplateState();
  }

  private void addTodo(String task) {
    String value = task == null ? "" : task.trim();

    if (value.isEmpty()) {
      return;
    }

    Todo[] nextTasks = new Todo[tasks.length + 1];
    System.arraycopy(tasks, 0, nextTasks, 0, tasks.length);
    nextTasks[tasks.length] = new Todo(nextId++, value, false);
    tasks = nextTasks;
    newTodo = "";
    syncRemaining();
    syncTemplateState();
  }

  private void toggleTodo(Todo todo) {
    todo.setDone(!todo.isDone());
    syncRemaining();
    syncTemplateState();
  }

  private void archiveTodos() {
    int activeCount = 0;

    for (Todo todo : tasks) {
      if (!todo.isDone()) {
        activeCount++;
      }
    }

    Todo[] active = new Todo[activeCount];
    int cursor = 0;

    for (Todo todo : tasks) {
      if (!todo.isDone()) {
        active[cursor++] = todo;
      }
    }

    tasks = active;
    syncRemaining();
    syncTemplateState();
  }

  private void syncRemaining() {
    int remaining = 0;

    for (Todo todo : tasks) {
      if (!todo.isDone()) {
        remaining++;
      }
    }

    remainingCount = remaining;
  }

  private void syncTemplateState() {
    scope.set("greeting", greeting);
    scope.set("newTodo", newTodo);
    scope.set("remainingCount", remainingCount);
    scope.set("tasks", tasks);
    scope.set("add", (AddFn) this::addTodo);
    scope.set("toggle", (ToggleFn) this::toggleTodo);
    scope.set("archive", (ArchiveFn) this::archiveTodos);
  }

  @JsFunction
  private interface AddFn {
    void add(String task);
  }

  @JsFunction
  private interface ToggleFn {
    void toggle(Todo todo);
  }

  @JsFunction
  private interface ArchiveFn {
    void archive();
  }
}
