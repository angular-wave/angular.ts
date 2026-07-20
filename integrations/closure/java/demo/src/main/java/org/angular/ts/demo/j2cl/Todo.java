package org.angular.ts.demo.j2cl;

import jsinterop.annotations.JsConstructor;
import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsProperty;
import jsinterop.annotations.JsType;
import jsinterop.base.Js;
import jsinterop.base.JsPropertyMap;

/** Todo item exposed to AngularTS templates from J2CL-generated JavaScript. */
@JsType(namespace = JsPackage.GLOBAL, name = "J2clTodo")
public final class Todo {
  @JsProperty
  public final double id;
  @JsProperty
  public final String task;
  @JsProperty
  public boolean done;

  @JsConstructor
  public Todo(double id, String task, boolean done) {
    this.id = id;
    this.task = task;
    this.done = done;
    publishState();
  }

  void setDone(boolean done) {
    this.done = done;
    publishState();
  }

  private void publishState() {
    JsPropertyMap<Object> self = Js.asPropertyMap(this);
    self.set("id", id);
    self.set("task", task);
    self.set("done", done);
  }
}
