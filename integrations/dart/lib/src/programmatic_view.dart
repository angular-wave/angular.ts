import 'dart:js_interop';

import 'package:web/web.dart';

import 'scope.dart';
import 'unsafe.dart' as unsafe;

/// Raw DOM value returned by a programmatic component or directive view.
typedef ProgrammaticView<TController, TRequired> = Object? Function(
  ProgrammaticViewContext<TController, TRequired> context,
);

/// Typed access to the runtime context passed to a programmatic view.
final class ProgrammaticViewContext<TController, TRequired> {
  /// Wraps the JavaScript view context.
  const ProgrammaticViewContext(this.raw);

  /// The raw JavaScript context.
  final JSObject raw;

  /// Component or directive controller associated with the view.
  TController? get controller {
    final value = unsafe.getProperty(raw, 'controller');
    return value == null ? null : unsafe.jsToDart<TController>(value);
  }

  /// Controllers resolved by a directive's `require` declaration.
  TRequired? get required {
    final value = unsafe.getProperty(raw, 'required');
    return value == null ? null : unsafe.jsToDart<TRequired>(value);
  }

  /// Scope that owns the generated DOM and reactive readers.
  Scope<Object?> get scope =>
      Scope<Object?>.unsafe(unsafe.getProperty(raw, 'scope'));

  /// Host element associated with the component or directive.
  HTMLElement get element => unsafe.getProperty(raw, 'element') as HTMLElement;

  /// Runtime transclusion callback.
  JSFunction get transclude =>
      unsafe.getProperty(raw, 'transclude') as JSFunction;

  /// Registers cleanup owned by the compiled view and returns its cancellation callback.
  JSFunction onDestroy(void Function() cleanup) {
    final register = unsafe.getProperty(raw, 'onDestroy') as JSFunction;
    return unsafe.callFunctionVarArgs(register, <JSAny?>[cleanup.toJS])
        as JSFunction;
  }
}

/// Typed access to AngularTS programmatic DOM tag factories.
final class ProgrammaticTags {
  /// Wraps `angular.tags` or one of its namespaced tag collections.
  const ProgrammaticTags(this.raw);

  /// Raw JavaScript tag collection.
  final JSObject raw;

  /// Returns a namespaced tag collection, such as SVG or MathML.
  ProgrammaticTags namespace(String namespaceUri) {
    final value = unsafe.callFunctionVarArgs(
      raw as JSFunction,
      <JSAny?>[namespaceUri.toJS],
    );
    return ProgrammaticTags(value as JSObject);
  }

  /// Creates a real DOM element by delegating to `angular.tags[name]`.
  Element tag(
    String name, {
    Map<String, Object?> properties = const {},
    List<Object?> children = const [],
  }) {
    final factory = unsafe.getProperty(raw, name) as JSFunction;
    final args = <JSAny?>[
      unsafe.object(properties),
      ...children.map(unsafe.dartToJs),
    ];
    return unsafe.callFunctionVarArgs(factory, args) as Element;
  }
}

/// Typed access to explicit AngularTS programmatic-view helpers.
final class ProgrammaticViewApi {
  /// Wraps `angular.view`.
  const ProgrammaticViewApi(this.raw);

  /// Raw JavaScript helper collection.
  final JSObject raw;

  /// Marks a native DOM event listener and supplies optional listener options.
  JSFunction event(
    void Function(Event) listener, {
    Object? options,
  }) {
    final callback = ((Event value) => listener(value)).toJS;
    return unsafe.callFunctionVarArgs(
      unsafe.getProperty(raw, 'event') as JSFunction,
      <JSAny?>[callback, unsafe.dartToJs(options)],
    ) as JSFunction;
  }

  /// Forces a property map to use DOM attribute semantics.
  JSObject attrs(Map<String, Object?> values) {
    return unsafe.callFunctionVarArgs(
      unsafe.getProperty(raw, 'attrs') as JSFunction,
      <JSAny?>[unsafe.object(values)],
    ) as JSObject;
  }

  /// Assigns a property map as literal DOM properties.
  JSObject props(Map<String, Object?> values) {
    return unsafe.callFunctionVarArgs(
      unsafe.getProperty(raw, 'props') as JSFunction,
      <JSAny?>[unsafe.object(values)],
    ) as JSObject;
  }

  /// Creates a keyed reactive collection binding.
  JSFunction each<T>(
    List<T>? Function() read,
    Object Function(T) key,
    Object? Function(T Function()) render,
  ) {
    final readCallback = (() => unsafe.dartToJs(read())).toJS;
    final keyCallback =
        ((JSAny? item) => unsafe.dartToJs(key(unsafe.jsToDart<T>(item)))).toJS;
    final renderCallback = ((JSFunction item) => unsafe.dartToJs(
          render(() =>
              unsafe.jsToDart<T>(unsafe.callFunctionVarArgs(item, const []))),
        )).toJS;
    return unsafe.callFunctionVarArgs(
      unsafe.getProperty(raw, 'each') as JSFunction,
      <JSAny?>[readCallback, keyCallback, renderCallback],
    ) as JSFunction;
  }

  /// Creates one HTML element by name.
  Element tag(
    String name, {
    Map<String, Object?> properties = const {},
    List<Object?> children = const [],
  }) =>
      _tag('tag', <Object?>[name, properties, ...children]);

  /// Creates one namespaced element by name.
  Element tagNS(
    String namespaceUri,
    String name, {
    Map<String, Object?> properties = const {},
    List<Object?> children = const [],
  }) =>
      _tag(
        'tagNS',
        <Object?>[namespaceUri, name, properties, ...children],
      );

  Element _tag(String helper, List<Object?> arguments) {
    return unsafe.callFunctionVarArgs(
      unsafe.getProperty(raw, helper) as JSFunction,
      arguments.map(unsafe.dartToJs).toList(),
    ) as Element;
  }
}

/// Wraps a Dart reader as a reactive programmatic-view child.
JSFunction reactiveViewChild(Object? Function() read) {
  return (() => unsafe.dartToJs(read())).toJS;
}

/// Converts a typed Dart view into the JavaScript callback stored in a DDO.
JSFunction programmaticViewToJs<TController, TRequired>(
  ProgrammaticView<TController, TRequired> view,
) {
  return ((JSObject context) =>
      unsafe.dartToJs(view(ProgrammaticViewContext(context)))).toJS;
}
