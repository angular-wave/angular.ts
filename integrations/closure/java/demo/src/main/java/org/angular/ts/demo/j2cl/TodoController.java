package org.angular.ts.demo.j2cl;

import jsinterop.annotations.JsConstructor;
import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsType;
import org.angular.ts.annotation.AngularTemplateApi;

/** AngularTS controller implemented in Java and compiled with J2CL. */
@JsType(namespace = JsPackage.GLOBAL, name = "J2clTodoController")
@AngularTemplateApi
public final class TodoController {
  private double nextId = 3;
  public String greeting = "J2CL Todo App";
  public String newTodo = "";
  public Todo[] tasks = {
    new Todo(1, "Learn AngularTS", false),
    new Todo(2, "Compile the todo app with J2CL", false)
  };

  @JsConstructor
  public TodoController() {}

  public void add(String task) {
    String value = task == null ? "" : task.trim();

    if (value.isEmpty()) {
      return;
    }

    Todo[] nextTasks = new Todo[tasks.length + 1];
    System.arraycopy(tasks, 0, nextTasks, 0, tasks.length);
    nextTasks[tasks.length] = new Todo(nextId++, value, false);
    tasks = nextTasks;
    newTodo = "";
  }

  public void toggle(Todo todo) {
    todo.done = !todo.done;
  }

  public void archive() {
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
  }
}
