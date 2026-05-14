import 'dart:js_interop';

import 'unsafe.dart' as unsafe;

/// A typed AngularTS dependency-injection token.
final class Token<T> {
  /// Creates a  token.
  Token(this.name, {T Function(JSAny? value)? fromJs})
      : _fromJs = fromJs ?? unsafe.jsToDart<T>;

  /// Runtime AngularTS token name.
  final String name;

  final T Function(JSAny? value) _fromJs;

  /// Converts a JavaScript value into this token type.
  T fromJs(JSAny? value) => _fromJs(value);

  @override
  String toString() => name;
}

/// Creates a typed AngularTS dependency-injection token.
Token<T> token<T>(String name, {T Function(JSAny? value)? fromJs}) {
  return Token<T>(name, fromJs: fromJs);
}
