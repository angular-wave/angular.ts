import 'dart:js_interop';

import 'package:web/web.dart';

import 'injector.dart';
import 'scope.dart';
import 'unsafe.dart' as unsafe;

@JS('String')
external JSFunction get _jsString;

@JS('Number')
external JSFunction get _jsNumber;

@JS('Boolean')
external JSFunction get _jsBoolean;

/// Supported web component input kind values.
enum WebComponentInputKind {
  /// The string value.
  string,

  /// The number value.
  number,

  /// The boolean value.
  boolean;

  /// JavaScript constructor used for input coercion.
  JSFunction get runtimeConstructor {
    return switch (this) {
      WebComponentInputKind.string => _jsString,
      WebComponentInputKind.number => _jsNumber,
      WebComponentInputKind.boolean => _jsBoolean,
    };
  }
}

/// Represents web component input.
final class WebComponentInput<T> {
  /// Creates a web component input.
  const WebComponentInput({
    this.kind,
    this.attribute,
    this.defaultValue,
    this.reflect = false,
    this.coerce,
  });

  /// The kind.
  final WebComponentInputKind? kind;

  /// The attribute.
  final String? attribute;

  /// The default value.
  final T? defaultValue;

  /// The reflect.
  final bool reflect;

  /// The coerce.
  final JSFunction? coerce;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (kind != null) 'type': unsafe.JsValue(kind!.runtimeConstructor),
      if (coerce != null) 'type': unsafe.JsValue(coerce),
      if (attribute != null) 'attribute': attribute,
      if (defaultValue != null) 'default': defaultValue,
      if (reflect) 'reflect': reflect,
    });
  }
}

/// The input string.
WebComponentInput<String> inputString({
  String? attribute,
  String? defaultValue,
  bool reflect = false,
}) {
  return WebComponentInput<String>(
    kind: WebComponentInputKind.string,
    attribute: attribute,
    defaultValue: defaultValue,
    reflect: reflect,
  );
}

/// The input number.
WebComponentInput<num> inputNumber({
  String? attribute,
  num? defaultValue,
  bool reflect = false,
}) {
  return WebComponentInput<num>(
    kind: WebComponentInputKind.number,
    attribute: attribute,
    defaultValue: defaultValue,
    reflect: reflect,
  );
}

/// The input boolean.
WebComponentInput<bool> inputBoolean({
  String? attribute,
  bool? defaultValue,
  bool reflect = false,
}) {
  return WebComponentInput<bool>(
    kind: WebComponentInputKind.boolean,
    attribute: attribute,
    defaultValue: defaultValue,
    reflect: reflect,
  );
}

/// Creates a custom-coerced web component input.
WebComponentInput<T> inputCustom<T>(
  T Function(Object? value) coerce, {
  String? attribute,
  T? defaultValue,
  bool reflect = false,
}) {
  return WebComponentInput<T>(
    attribute: attribute,
    defaultValue: defaultValue,
    reflect: reflect,
    coerce: ((JSAny? value) {
      return unsafe.dartToJs(coerce(unsafe.jsToDart<Object?>(value)));
    }).toJS,
  );
}

/// Signature for web component connected.
typedef WebComponentConnected<TScope> = void Function(
    WebComponentContext<TScope> context);

/// Signature for web component disconnected.
typedef WebComponentDisconnected<TScope> = void Function(
    WebComponentContext<TScope> context);

/// Signature for web component attribute changed.
typedef WebComponentAttributeChanged<TScope> = void Function(
  String name,
  String? oldValue,
  String? newValue,
  WebComponentContext<TScope> context,
);

/// Signature for web component scope factory.
typedef WebComponentScopeFactory<TScope> = TScope Function();

/// Represents element scope options.
final class ElementScopeOptions {
  /// Creates a element scope options.
  const ElementScopeOptions({
    this.parentScope,
    this.isolate = false,
  });

  /// The parent scope.
  final Scope<Object?>? parentScope;

  /// The isolate.
  final bool isolate;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (parentScope != null) 'parentScope': unsafe.JsValue(parentScope!.raw),
      if (isolate) 'isolate': isolate,
    });
  }
}

/// Typed DOM event emitted from an AngularTS-backed custom element.
final class WebComponentEvent<TDetail> {
  /// Creates a web component event.
  const WebComponentEvent(this.name, this.detail);

  /// The name.
  final String name;

  /// The detail.
  final TDetail detail;
}

/// Dart-facing context for an AngularTS-backed custom element.
final class WebComponentContext<TScope> {
  /// Wraps a raw AngularTS web component context.
  WebComponentContext.unsafe(JSAny? context)
      : _context = context,
        host = unsafe.getProperty(context as JSObject, 'host') as HTMLElement,
        injector =
            Injector(unsafe.getProperty(context, 'injector') as JSObject),
        root = unsafe.getProperty(context, 'root') as JSObject,
        shadowRoot = unsafe.getProperty(context, 'shadowRoot') as ShadowRoot?,
        scope = Scope<TScope>.unsafe(
          unsafe.getProperty(context, 'scope'),
        );

  final JSAny? _context;

  /// The host.
  final HTMLElement host;

  /// The injector.
  final Injector injector;

  /// The root.
  final JSObject root;

  /// The shadow root.
  final ShadowRoot? shadowRoot;

  /// The scope.
  final Scope<TScope> scope;

  /// Dispatches a composed bubbling DOM event from the host.
  bool dispatch<TDetail>(WebComponentEvent<TDetail> event) {
    final dispatched = unsafe.callMethod(
      _context as JSObject,
      'dispatch',
      event.name.toJS,
      unsafe.dartToJs(event.detail),
    );

    return dispatched == null || (dispatched as JSBoolean).toDart;
  }
}

/// AngularTS web component configuration.
final class WebComponent<TScope> {
  /// Creates a web component.
  const WebComponent({
    this.template,
    this.shadow = false,
    this.scope,
    this.inputs = const {},
    this.isolate = false,
    this.connected,
    this.disconnected,
    this.attributeChanged,
  });

  /// The template.
  final String? template;

  /// The shadow.
  final Object? shadow;

  /// The scope.
  final Object? scope;

  /// The inputs.
  final Map<String, WebComponentInput<Object?>> inputs;

  /// The isolate.
  final bool isolate;

  /// The connected.
  final WebComponentConnected<TScope>? connected;

  /// The disconnected.
  final WebComponentDisconnected<TScope>? disconnected;

  /// The attribute changed.
  final WebComponentAttributeChanged<TScope>? attributeChanged;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (template != null) 'template': template,
      if (shadow != null) 'shadow': shadow,
      if (scope != null) 'scope': _scopeToJs(),
      if (inputs.isNotEmpty) 'inputs': _inputsToJs(),
      if (isolate) 'isolate': isolate,
      if (connected != null) 'connected': unsafe.JsValue(_connectedFunction()),
      if (disconnected != null)
        'disconnected': unsafe.JsValue(_disconnectedFunction()),
      if (attributeChanged != null)
        'attributeChanged': unsafe.JsValue(_attributeChangedFunction()),
    });
  }

  Object? _scopeToJs() {
    final scope = this.scope;
    if (scope is WebComponentScopeFactory<TScope>) {
      return unsafe.JsValue((() => unsafe.dartToJs(scope())).toJS);
    }

    return scope;
  }

  JSObject _inputsToJs() {
    return unsafe.object({
      for (final entry in inputs.entries)
        entry.key: unsafe.JsValue(entry.value.toJsObject()),
    });
  }

  JSFunction _connectedFunction() {
    return ((JSAny? context) {
      connected?.call(WebComponentContext<TScope>.unsafe(context));
    }).toJS;
  }

  JSFunction _disconnectedFunction() {
    return ((JSAny? context) {
      disconnected?.call(WebComponentContext<TScope>.unsafe(context));
    }).toJS;
  }

  JSFunction _attributeChangedFunction() {
    return ((JSString name, JSString? oldValue, JSString? newValue,
        JSAny? context) {
      attributeChanged?.call(
        name.toDart,
        oldValue?.toDart,
        newValue?.toDart,
        WebComponentContext<TScope>.unsafe(context),
      );
    }).toJS;
  }
}
