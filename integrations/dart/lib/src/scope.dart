import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'unsafe.dart' as interop;

/// Typed wrapper around an AngularTS scope.
final class Scope<TState> implements interop.JsConvertible {
  const Scope._(this._scope, this.state);

  /// Wraps a raw AngularTS scope value.
  factory Scope.unsafe(JSAny? value) {
    return Scope<TState>._(value, interop.jsToDart<TState>(value));
  }

  final JSAny? _scope;

  /// Raw JavaScript scope value.
  JSAny? get raw => _scope;

  @override
  JSAny? toJsValue() => raw;

  /// Typed state view for authoring code.
  final TState state;

  /// Explicit dynamic escape hatch for migration and advanced interop.
  ScopeUnsafe get unsafe => ScopeUnsafe(_scope);

  JSObject get _rawObject => _scope as JSObject;

  /// The scope proxy object.
  Object? get $proxy => interop.getProperty(_rawObject, r'$proxy');

  /// The scope handler object.
  Object? get $handler => interop.getProperty(_rawObject, r'$handler');

  /// The wrapped target model.
  TState get $target => state;

  /// The scope id.
  Object? get $id => interop.getProperty(_rawObject, r'$id');

  /// The root scope.
  Scope<Object?>? get $root {
    final value = interop.getProperty(_rawObject, r'$root');
    return value == null ? null : Scope<Object?>.unsafe(value);
  }

  /// The parent scope.
  Scope<Object?>? get $parent {
    final value = interop.getProperty(_rawObject, r'$parent');
    return value == null ? null : Scope<Object?>.unsafe(value);
  }

  /// Optional scope name.
  String? get $scopename {
    final value = interop.getProperty(_rawObject, r'$scopename');
    return value == null ? null : (value as JSString).toDart;
  }

  /// Intercepts a property assignment through the raw scope handler.
  bool set(Object target, String property, Object? value, Object proxy) {
    final result = interop.callMethod(
      _rawObject,
      'set',
      interop.dartToJs(target),
      property.toJS,
      interop.dartToJs(value),
      interop.dartToJs(proxy),
    );

    return result == null || (result as JSBoolean).toDart;
  }

  /// Intercepts property access through the raw scope handler.
  Object? get(Object target, Object property, Object proxy) {
    return interop.callMethod(
      _rawObject,
      'get',
      interop.dartToJs(target),
      interop.dartToJs(property),
      interop.dartToJs(proxy),
    );
  }

  /// Intercepts property deletion through the raw scope handler.
  bool deleteProperty(Object target, Object property) {
    final result = interop.callMethod(
      _rawObject,
      'deleteProperty',
      interop.dartToJs(target),
      interop.dartToJs(property),
    );

    return result == null || (result as JSBoolean).toDart;
  }

  /// Registers a watcher.
  Object? $watch(
    String watchProp, [
    JSFunction? listenerFn,
    bool? lazy,
  ]) {
    return interop.callMethod(
      _rawObject,
      r'$watch',
      watchProp.toJS,
      listenerFn,
      lazy?.toJS,
    );
  }

  /// Creates a prototypically inherited child scope.
  Scope<Object?> $new([Scope<Object?>? childInstance]) {
    final value = interop.callMethod(
      _rawObject,
      r'$new',
      childInstance?.raw,
    );

    return Scope<Object?>.unsafe(value);
  }

  /// Creates an isolate child scope.
  Scope<Object?> $newIsolate([Scope<Object?>? instance]) {
    final value = interop.callMethod(
      _rawObject,
      r'$newIsolate',
      instance?.raw,
    );

    return Scope<Object?>.unsafe(value);
  }

  /// Creates a transcluded child scope.
  Scope<Object?> $transcluded([Scope<Object?>? parentInstance]) {
    final value = interop.callMethod(
      _rawObject,
      r'$transcluded',
      parentInstance?.raw,
    );

    return Scope<Object?>.unsafe(value);
  }

  /// Merges enumerable properties into this scope target.
  void $merge(Object newTarget) {
    interop.callMethod(_rawObject, r'$merge', interop.dartToJs(newTarget));
  }

  /// Registers a scope event listener.
  Object? $on(String name, JSFunction listener) {
    return interop.callMethod(_rawObject, r'$on', name.toJS, listener);
  }

  /// Emits an event upward through the scope hierarchy.
  Object? $emit(String name, [Object? arg1, Object? arg2, Object? arg3]) {
    return interop.callMethod(
      _rawObject,
      r'$emit',
      name.toJS,
      interop.dartToJs(arg1),
      interop.dartToJs(arg2),
      interop.dartToJs(arg3),
    );
  }

  /// Broadcasts an event downward through the scope hierarchy.
  Object? $broadcast(String name, [Object? arg1, Object? arg2, Object? arg3]) {
    return interop.callMethod(
      _rawObject,
      r'$broadcast',
      name.toJS,
      interop.dartToJs(arg1),
      interop.dartToJs(arg2),
      interop.dartToJs(arg3),
    );
  }

  /// Destroys this scope.
  void $destroy() {
    interop.callMethod(_rawObject, r'$destroy');
  }

  /// Searches this scope tree by id.
  Scope<Object?>? $getById(Object id) {
    final value = interop.callMethod(
      _rawObject,
      r'$getById',
      interop.dartToJs(id),
    );

    return value == null ? null : Scope<Object?>.unsafe(value);
  }

  /// Searches this scope tree by name.
  Scope<Object?>? $searchByName(String name) {
    final value = interop.callMethod(_rawObject, r'$searchByName', name.toJS);
    return value == null ? null : Scope<Object?>.unsafe(value);
  }
}

/// Represents scope unsafe.
final class ScopeUnsafe {
  /// Creates a scope unsafe.
  const ScopeUnsafe(this._scope);

  final JSAny? _scope;

  /// Assigns a value directly on the underlying JavaScript scope.
  void set(String property, Object? value) {
    (_scope as JSObject).setProperty(property.toJS, interop.dartToJs(value));
  }

  /// Casts the raw scope value to a Dart type.
  T as<T>() => interop.jsToDart<T>(_scope);
}
