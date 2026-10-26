package org.angular.ts;

import elemental2.dom.AbortSignal;
import elemental2.promise.Promise;
import jsinterop.base.Js;
import org.angular.ts.ng.NgModelController;
import org.angular.ts.ng.TemplateRequestOptions;
import org.angular.ts.ng.TemplateRequestService;

/** Compile-time contracts for typed controls and native template cancellation. */
final class FormBindingsCompileTest {
  private FormBindingsCompileTest() {}

  static Double configure(NgModelController<Double, String> control) {
    control.getParsers().setAt(0, text -> text.isEmpty() ? Js.<Double>uncheckedCast(Js.undefined()) : Double.valueOf(text));
    control.getFormatters().setAt(0, value -> value == null ? "" : value.toString());
    control.getValidators().set("positive", (value, text) -> value != null && value > 0);
    control.getAsyncValidators().set("remote", (value, text, context) -> {
      AbortSignal signal = context.getSignal();
      return signal.aborted ? Promise.reject(new IllegalStateException("cancelled")) : Promise.resolve((Object) null);
    });
    control.setViewValue("12");
    return control.getModelValue();
  }

  static Promise<String> request(TemplateRequestService templates, AbortSignal signal) {
    TemplateRequestOptions options = TemplateRequestOptions.create();
    options.setSignal(signal);
    return templates.onInvoke("/panel", options);
  }

  static Promise<String> cached(TemplateRequestService templates) {
    return templates.onInvoke("/panel");
  }
}
