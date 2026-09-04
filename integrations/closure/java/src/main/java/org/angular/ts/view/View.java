package org.angular.ts.view;

import elemental2.dom.Element;
import elemental2.dom.Event;
import elemental2.dom.EventListener;
import jsinterop.annotations.JsFunction;
import jsinterop.annotations.JsMethod;

/** Programmatic-view helpers for Java and J2CL applications. */
public final class View {
  private View() {}

  /** Reads a reactive value. */
  @JsFunction
  public interface Reader<T> {
    T read();
  }

  /** Selects a stable key from a collection item. */
  @JsFunction
  public interface Key<T> {
    Object select(T item);
  }

  /** Renders a keyed item through its reactive reader. */
  @JsFunction
  public interface Renderer<T> {
    Object render(Reader<T> item);
  }

  /** Creates a keyed reactive collection. */
  @JsMethod(namespace = "angular.view", name = "each")
  public static native <T> Reader<Object> each(
      Reader<T[]> read, Key<T> key, Renderer<T> render);

  /** Creates a native event binding. */
  @JsMethod(namespace = "angular.view", name = "event")
  public static native EventListener event(EventListener listener);

  /** Creates a native event binding with listener options. */
  @JsMethod(namespace = "angular.view", name = "event")
  public static native EventListener event(EventListener listener, Object options);

  /** Forces values to use attribute semantics. */
  @JsMethod(namespace = "angular.view", name = "attrs")
  public static native Object attrs(Object values);

  /** Forces values to use property semantics. */
  @JsMethod(namespace = "angular.view", name = "props")
  public static native Object props(Object values);

  /** Creates an HTML element whose name is selected at runtime. */
  @JsMethod(namespace = "angular.view", name = "tag")
  public static native Element tag(String name, Object... arguments);

  /** Creates a namespaced element whose name is selected at runtime. */
  @JsMethod(namespace = "angular.view", name = "tagNS")
  public static native Element tagNS(
      String namespaceUri, String name, Object... arguments);

  /** Adapts an event consumer to an {@link EventListener}. */
  public static EventListener listener(java.util.function.Consumer<Event> listener) {
    return listener::accept;
  }
}
