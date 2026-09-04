package org.angular.ts.view;

import elemental2.core.JsArray;
import elemental2.dom.HTMLElement;
import jsinterop.base.JsPropertyMap;

/** Compile-time coverage for the complete Java programmatic-view facade. */
final class ProgrammaticViewCompileTest {
  private ProgrammaticViewCompileTest() {}

  static HTMLElement createButton() {
    return Tags.button(JsPropertyMap.of("type", "button"), "Save");
  }

  static Object createCollection() {
    return View.each(
        () -> new String[] {"one"},
        item -> item,
        item -> Tags.li(item.read()));
  }

  static Object[] createBindings() {
    return new Object[] {
      View.attrs(JsPropertyMap.of("aria-label", "Save")),
      View.props(JsPropertyMap.of("value", "ready")),
      View.event(event -> {}),
      View.tag("article", "Content"),
      View.tagNS("http://www.w3.org/2000/svg", "circle")
    };
  }
}
