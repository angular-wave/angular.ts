import 'dart:js_interop';
import 'dart:js_interop_unsafe';

/// Converts a Dart value to a JavaScript interop value.
///
/// This is intentionally internal. Public APIs should expose typed Dart values
/// and convert only at the AngularTS runtime boundary.
JSAny? dartToJs(Object? value) {
  if (value == null) return null;
  if (value is JsValue) return value.value;
  if (value is JsConvertible) return value.toJsValue();
  // JS interop values are already valid runtime-boundary values.
  // ignore: invalid_runtime_check_with_js_interop_types
  if (value is JSAny) return value;
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

/// Internal hook for Dart wrappers that can expose their raw JavaScript value.
abstract interface class JsConvertible {
  /// Converts the wrapper to a JavaScript interop value.
  JSAny? toJsValue();
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

/// The set property.
void setProperty(JSObject target, String property, Object? value) {
  target.setProperty(property.toJS, dartToJs(value));
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

/// Calls a method with exactly one argument, including `null`.
JSAny? callMethod1(JSObject target, String method, JSAny? arg1) {
  return target.callMethodVarArgs(method.toJS, [arg1]);
}

/// Calls a method with exactly two arguments, including `null`.
JSAny? callMethod2(JSObject target, String method, JSAny? arg1, JSAny? arg2) {
  return target.callMethodVarArgs(method.toJS, [arg1, arg2]);
}

/// Calls a method with exactly three arguments, including `null`.
JSAny? callMethod3(
  JSObject target,
  String method,
  JSAny? arg1,
  JSAny? arg2,
  JSAny? arg3,
) {
  return target.callMethodVarArgs(method.toJS, [arg1, arg2, arg3]);
}

/// Calls a method with exactly four arguments, including `null`.
JSAny? callMethod4(
  JSObject target,
  String method,
  JSAny? arg1,
  JSAny? arg2,
  JSAny? arg3,
  JSAny? arg4,
) {
  return target.callMethodVarArgs(method.toJS, [arg1, arg2, arg3, arg4]);
}

/// Calls a method with exactly five arguments, including `null`.
JSAny? callMethod5(
  JSObject target,
  String method,
  JSAny? arg1,
  JSAny? arg2,
  JSAny? arg3,
  JSAny? arg4,
  JSAny? arg5,
) {
  return target.callMethodVarArgs(method.toJS, [arg1, arg2, arg3, arg4, arg5]);
}
