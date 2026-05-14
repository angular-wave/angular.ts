package org.angular.ts.demo.j2cl;

import jsinterop.annotations.JsFunction;
import jsinterop.annotations.JsMethod;
import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsProperty;
import jsinterop.annotations.JsType;
import jsinterop.base.JsPropertyMap;
import org.angular.ts.HTMLElement;

/** J2CL entry point that registers the AngularTS todo module. */
public final class App {
  private App() {}

  public static void main(String... args) {
    start();
  }

  public static void start() {
    registerJ2clTodoModule(
        (TodoControllerFactory) TodoController::new,
        (DirectiveFactory) App::createBadgeDirective);
  }

  @JsMethod(namespace = JsPackage.GLOBAL, name = "registerJ2clTodoModule")
  private static native void registerJ2clTodoModule(
      Object controllerFactory,
      Object directiveFactory);

  private static Object createBadgeDirective() {
    JsPropertyMap<Object> directive = JsPropertyMap.of();
    directive.set("restrict", "A");
    directive.set("link", (LinkFn) (scope, element, attrs) -> element.setTextContent(
        "Application JavaScript compiled from Java with J2CL and AngularTS JsInterop bindings"));
    return directive;
  }

  @JsFunction
  private interface TodoControllerFactory {
    TodoController create(Object scope);
  }

  @JsFunction
  private interface DirectiveFactory {
    Object create();
  }

  @JsFunction
  private interface LinkFn {
    void link(Object scope, TextElement element, Object attrs);
  }

  @JsType(isNative = true, namespace = JsPackage.GLOBAL, name = "HTMLElement")
  private interface TextElement extends HTMLElement {
    @JsProperty(name = "textContent")
    void setTextContent(String textContent);
  }
}
