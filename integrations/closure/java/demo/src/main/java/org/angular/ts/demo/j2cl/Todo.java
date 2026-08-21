package org.angular.ts.demo.j2cl;

import jsinterop.annotations.JsConstructor;
import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsType;
import org.angular.ts.annotation.AngularTemplateApi;

/** Todo item exposed to AngularTS templates from J2CL-generated JavaScript. */
@JsType(namespace = JsPackage.GLOBAL, name = "J2clTodo")
@AngularTemplateApi
public final class Todo {
  public final double id;
  public final String task;
  public boolean done;

  @JsConstructor
  public Todo(double id, String task, boolean done) {
    this.id = id;
    this.task = task;
    this.done = done;
  }
}
