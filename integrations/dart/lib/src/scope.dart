import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'unsafe.dart' as interop;

/// Typed wrapper around an AngularTS scope.
final class Scope<TState> {
  const Scope._(this._scope, this.state);

  /// Wraps a raw AngularTS scope value.
  factory Scope.unsafe(JSAny? value) {
    return Scope<TState>._(value, interop.jsToDart<TState>(value));
  }

  final JSAny? _scope;

  /// Raw JavaScript scope value.
  JSAny? get raw => _scope;

  /// Typed state view for authoring code.
  final TState state;

  /// Explicit dynamic escape hatch for migration and advanced interop.
  ScopeUnsafe get unsafe => ScopeUnsafe(_scope);

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
