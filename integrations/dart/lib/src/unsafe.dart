import 'dart:js_interop';
import 'dart:js_interop_unsafe';

/// Converts a Dart value to a JavaScript interop value.
///
/// This is intentionally internal. Public APIs should expose typed Dart values
/// and convert only at the AngularTS runtime boundary.
JSAny? dartToJs(Object? value) {
  if (value == null) return null;
  // JS interop values are already valid runtime-boundary values.
  // ignore: invalid_runtime_check_with_js_interop_types
  if (value is JSAny) return value;
  if (value is JsValue) return value.value;
  if (value is String) return value.toJS;
  if (value is int) return value.toJS;
  if (value is double) return value.toJS;
  if (value is num) return value.toDouble().toJS;
  if (value is bool) return value.toJS;
  if (value is List<Object?>) {
    return [for (final item in value) dartToJs(item)].toJS;
  }
  if (value is Map<String, Object?>) return object(value);

  return value.toJSBox;
}

/// Represents js value.
final class JsValue {
  /// Creates a js value.
  const JsValue(this.value);

  /// Registers an AngularTS value.
  final JSAny? value;
}

/// Converts a JavaScript value into a Dart value.
T jsToDart<T>(JSAny? value) {
  if (value != null && value.isA<JSBoxedDartObject>()) {
    return (value as JSBoxedDartObject).toDart as T;
  }

  return (value as Object?) as T;
}

/// The js array to dart.
List<Object?> jsArrayToDart(JSArray<JSAny?> values) {
  final length = values.length;
  final result = <Object?>[];

  for (var index = 0; index < length; index += 1) {
    result.add(values[index] as Object?);
  }

  return result;
}

/// The object.
JSObject object(Map<String, Object?> values) {
  final result = JSObject();

  for (final entry in values.entries) {
    result.setProperty(entry.key.toJS, dartToJs(entry.value));
  }

  return result;
}

/// The get property.
JSAny? getProperty(JSObject target, String property) {
  return target.getProperty(property.toJS);
}

/// The strings.
JSArray<JSString> strings(List<String> values) {
  return [for (final value in values) value.toJS].toJS;
}

/// The call method.
JSAny? callMethod(
  JSObject target,
  String method, [
  JSAny? arg1,
  JSAny? arg2,
  JSAny? arg3,
  JSAny? arg4,
]) {
  if (arg4 != null) {
    return target.callMethod(method.toJS, arg1, arg2, arg3, arg4);
  }

  if (arg3 != null) return target.callMethod(method.toJS, arg1, arg2, arg3);
  if (arg2 != null) return target.callMethod(method.toJS, arg1, arg2);
  if (arg1 != null) return target.callMethod(method.toJS, arg1);

  return target.callMethod(method.toJS);
}
