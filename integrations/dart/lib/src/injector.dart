import 'dart:js_interop';

import 'token.dart';
import 'unsafe.dart' as unsafe;

/// Typed wrapper around an AngularTS injector.
final class Injector {
  /// Creates a injector.
  const Injector(this._injector);

  final JSObject _injector;

  /// Reads a dependency using a typed token.
  T get<T>(Token<T> token) {
    final value = unsafe.callMethod(_injector, 'get', token.name.toJS);

    return token.fromJs(value);
  }

  /// The get unsafe.
  Object? getUnsafe(String token) {
    return unsafe.callMethod(_injector, 'get', token.toJS);
  }
}
