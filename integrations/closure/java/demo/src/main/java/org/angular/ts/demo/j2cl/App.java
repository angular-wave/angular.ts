package org.angular.ts.demo.j2cl;

import elemental2.dom.HTMLElement;
import jsinterop.annotations.JsFunction;
import jsinterop.annotations.JsMethod;
import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsType;
import org.angular.ts.Angular;
import org.angular.ts.annotation.AngularEntryPoint;
import org.angular.ts.ng.Directive;
import org.angular.ts.ng.NgModule;

/** J2CL entry point that registers the AngularTS todo module. */
@JsType(namespace = JsPackage.GLOBAL, name = "J2clTodoApp")
public final class App {
  private App() {}

  public static void main(String... args) {
    start();
  }

  @JsMethod
  @AngularEntryPoint
  public static void start() {
    Angular.module("j2clTodo", new String[0])
      .controller("TodoCtrl", (TodoControllerFactory) TodoController::new)
      .directive("j2clBadge", App::createBadgeDirective);
  }

  private static Directive<Object> createBadgeDirective() {
    Directive<Object> directive = Directive.create();
    directive.setRestrict("A");
    directive.setLink(
        (scope, element) ->
            element.textContent =
                "Application JavaScript compiled from Java with J2CL and AngularTS Java bindings");
    return directive;
  }

  @JsFunction
  private interface TodoControllerFactory {
    TodoController create();
  }
}
