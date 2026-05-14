package org.angular.ts.demo.j2cl;

import jsinterop.annotations.JsConstructor;
import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsType;
import jsinterop.base.Js;
import jsinterop.base.JsPropertyMap;

/** Todo item exposed to AngularTS templates from J2CL-generated JavaScript. */
@JsType(namespace = JsPackage.GLOBAL, name = "J2clTodo")
public final class Todo {
  private final double id;
  private final String task;
  private boolean done;

  @JsConstructor
  public Todo(double id, String task, boolean done) {
    this.id = id;
    this.task = task;
    this.done = done;
    syncTemplateState();
  }

  boolean isDone() {
    return done;
  }

  void setDone(boolean done) {
    this.done = done;
    syncTemplateState();
  }

  private void syncTemplateState() {
    JsPropertyMap<Object> self = Js.asPropertyMap(this);
    self.set("id", id);
    self.set("task", task);
    self.set("done", done);
  }
}
