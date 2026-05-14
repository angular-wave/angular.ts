import 'dart:js_interop';

import 'compile.dart';
import 'injectable.dart';
import 'scope.dart';
import 'unsafe.dart' as unsafe;

/// Predicate used by AngularTS validators.
typedef Validator<T> = bool Function(T value);

/// Listener callback for scope watches.
typedef ListenerFn<T> = void Function([T? newValue, Object? originalTarget]);

/// Factory or constructor shape for a typed controller.
typedef ControllerConstructor<T extends Controller> = T Function();

/// Component/directive lifecycle hooks supported by AngularTS controllers.
abstract mixin class Controller {
  /// Optional controller name used for diagnostics.
  String? get name => null;

  /// Called after bindings are initialized.
  void onInit() {}

  /// Called when one-way bindings change.
  void onChanges(OnChangesObject changes) {}

  /// Called when the controller scope is destroyed.
  void onDestroy() {}

  /// Called during change-detection checks.
  void doCheck() {}

  /// Called after this controller's element and children are linked.
  void postLink() {}
}

/// Details for an AngularTS event/invocation expression.
final class InvocationDetail {
  /// Creates a invocation detail.
  const InvocationDetail({required this.expr});

  /// The expr.
  final String expr;
}

/// Event object passed through AngularTS scope event propagation.
final class ScopeEvent {
  /// Creates a scope event.
  const ScopeEvent({
    required this.targetScope,
    required this.name,
    required this.stopped,
    required this.defaultPrevented,
    this.currentScope,
    this.stopPropagation,
    this.preventDefault,
  });

  /// The target scope.
  final Scope<Object?> targetScope;

  /// The current scope.
  final Scope<Object?>? currentScope;

  /// The name.
  final String name;

  /// The stopped.
  final bool stopped;

  /// The default prevented.
  final bool defaultPrevented;

  /// Callback for function.
  final void Function()? stopPropagation;

  /// Callback for function.
  final void Function()? preventDefault;
}

/// Object provider with a typed `$get` injectable factory.
final class ServiceProvider<TValue> {
  /// Creates a service provider.
  const ServiceProvider(this.get);

  /// The get.
  final InjectableFactory<TValue> get;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({'$get': unsafe.JsValue(get.toAnnotatedArray())});
  }
}

/// Shared error-formatting options.
final class ErrorHandlingConfig {
  /// Creates a error handling config.
  const ErrorHandlingConfig({this.objectMaxDepth});

  /// The object max depth.
  final int? objectMaxDepth;

  /// The to map.
  Map<String, Object?> toMap() => {
        if (objectMaxDepth != null) 'objectMaxDepth': objectMaxDepth,
      };
}

/// Callback invoked when an interpolation expression changes.
typedef InterpolationChangeCallback<T> = void Function(T value);

/// Callable interpolation expression returned by `$interpolate`.
final class InterpolationFunction<T> {
  /// Creates a interpolation function.
  const InterpolationFunction({
    required this.expressions,
    required this.exp,
    required JSFunction evaluate,
  }) : _evaluate = evaluate;

  /// The expressions.
  final List<String> expressions;

  /// The exp.
  final String exp;
  final JSFunction _evaluate;

  /// Invokes an AngularTS runtime expression asynchronously.
  T call(Object? context, [InterpolationChangeCallback<T>? callback]) {
    final value = unsafe.callMethod(
      _evaluate,
      'call',
      null,
      unsafe.dartToJs(context),
      callback == null
          ? null
          : ((JSAny? value) {
              callback(unsafe.jsToDart<T>(value));
            }).toJS,
    );

    return unsafe.jsToDart<T>(value);
  }
}
