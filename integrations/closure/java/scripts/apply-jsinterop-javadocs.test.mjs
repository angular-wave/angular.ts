import assert from "node:assert/strict";
import test from "node:test";
import {
  applyJavadocs,
  parseExternDocumentation,
} from "./apply-jsinterop-javadocs.mjs";

const externs = `
/**
 * Widget documentation with a <code> marker.
 * @constructor
 */
ng.Widget = function() {};

/**
 * Runs the widget with {@link WidgetOptions}.
 * @param {string} mode Widget execution mode.
 */
ng.Widget.prototype.run = function(mode) {};

/** Current widget status. */
ng.Widget.prototype.status;

/** Invoked while compiling a directive. */
ng.DirectiveCompileFn;
`;

test("projects Closure descriptions into generated Java Javadocs", () => {
  const java = `package example;
import jsinterop.annotations.JsProperty;
import jsinterop.annotations.JsType;
@JsType(isNative = true,name = "ng.Widget",namespace = "global")
public interface Widget{
void run(String mode);
@JsProperty
String getStatus();
@JsProperty(name = "status")
void setWidgetStatus(String value);
}
`;

  const documented = applyJavadocs(
    java,
    parseExternDocumentation(externs),
  );

  assert.match(
    documented,
    /Widget documentation with a &lt;code&gt; marker[\s\S]*@JsType/,
  );
  assert.match(
    documented,
    /Runs the widget with \{@code WidgetOptions\}\.\n \* @param mode Widget execution mode\.\n \*\/\nvoid run\(String mode\);/,
  );
  assert.match(
    documented,
    /Current widget status\.\n \*\/\n@JsProperty\nString getStatus\(\);/,
  );
  assert.match(
    documented,
    /Current widget status\.\n \*\/\n@JsProperty\(name = "status"\)/,
  );
});

test("leaves generated browser aliases without AngularTS extern names unchanged", () => {
  const java = `@JsType(isNative = true,namespace = "global")
public interface Element{
}
`;

  assert.equal(applyJavadocs(java, parseExternDocumentation(externs)), java);
});

test("projects callback documentation onto generated JsFunction contracts", () => {
  const java = `package org.angular.ts.ng;
import jsinterop.annotations.JsFunction;
@JsFunction
public interface DirectiveCompileFn{
Object onInvoke(Object element);
}
`;

  const documented = applyJavadocs(
    java,
    parseExternDocumentation(externs),
  );

  assert.match(
    documented,
    /Invoked while compiling a directive\.\n \*\/\n@JsFunction/,
  );
});
