package org.angular.ts.demo.j2cl;

import jsinterop.annotations.JsConstructor;
import jsinterop.annotations.JsFunction;
import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsProperty;
import jsinterop.annotations.JsType;
import jsinterop.base.Js;
import jsinterop.base.JsPropertyMap;

/** AngularTS controller implemented in Java and compiled with J2CL. */
@JsType(namespace = JsPackage.GLOBAL, name = "J2clTodoController")
public final class TodoController {
  private double nextId = 3;
  @JsProperty
  public String greeting = "J2CL Todo App";
  @JsProperty
  public String newTodo = "";
  @JsProperty
  public double remainingCount = 2;
  @JsProperty
  public Todo[] tasks = {
    new Todo(1, "Learn AngularTS", false),
    new Todo(2, "Compile the todo app with J2CL", false)
  };

  @JsConstructor
  public TodoController() {
    publishActions();
    publishState();
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
    publishState();
  }

  private void toggleTodo(Todo todo) {
    todo.setDone(!todo.done);
    syncRemaining();
    publishState();
  }

  private void archiveTodos() {
    int activeCount = 0;

    for (Todo todo : tasks) {
      if (!todo.done) {
        activeCount++;
      }
    }

    Todo[] active = new Todo[activeCount];
    int cursor = 0;

    for (Todo todo : tasks) {
      if (!todo.done) {
        active[cursor++] = todo;
      }
    }

    tasks = active;
    syncRemaining();
    publishState();
  }

  private void syncRemaining() {
    int remaining = 0;

    for (Todo todo : tasks) {
      if (!todo.done) {
        remaining++;
      }
    }

    remainingCount = remaining;
  }

  private void publishState() {
    JsPropertyMap<Object> self = Js.asPropertyMap(this);
    self.set("greeting", greeting);
    self.set("newTodo", newTodo);
    self.set("remainingCount", remainingCount);
    self.set("tasks", tasks);
  }

  private void publishActions() {
    JsPropertyMap<Object> self = Js.asPropertyMap(this);
    self.set("add", (AddFn) this::addTodo);
    self.set("toggle", (ToggleFn) this::toggleTodo);
    self.set("archive", (ArchiveFn) this::archiveTodos);
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
