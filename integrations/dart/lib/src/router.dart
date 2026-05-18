import 'dart:js_interop';

import 'injectable.dart';
import 'unsafe.dart' as unsafe;

/// Signature for state or name.
typedef StateOrName = Object;

/// Signature for state resolve object.
typedef StateResolveObject = Map<String, InjectableFactory<Object?>>;

/// Signature for state resolve array.
typedef StateResolveArray = List<ResolvableLiteral>;

/// Signature for template factory.
typedef TemplateFactory = String Function(Map<String, Object?>? params);

/// Signature for template url factory.
typedef TemplateUrlFactory = String? Function(Map<String, Object?>? params);

/// Signature for redirect to result.
typedef RedirectToResult = Object?;

/// State hook invoked for a state during a transition.
typedef TransitionStateHookFn = Object? Function(
  Transition transition,
  Object? state,
);

/// Represents view declaration.
final class ViewDeclaration {
  /// Creates a view declaration.
  const ViewDeclaration({
    this.name,
    this.component,
    this.bindings,
    this.controller,
    this.template,
    this.templateUrl,
  });

  /// The name.
  final String? name;

  /// The component.
  final String? component;

  /// The bindings.
  final Map<String, String>? bindings;

  /// The controller.
  final InjectableFactory<Object?>? controller;

  /// The template.
  final String? template;

  /// The template url.
  final String? templateUrl;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (name != null) '_name': name,
      if (component != null) 'component': component,
      if (bindings != null) 'bindings': bindings,
      if (controller != null) 'controller': controller!.toAnnotatedArray(),
      if (template != null) 'template': template,
      if (templateUrl != null) 'templateUrl': templateUrl,
    });
  }
}

/// Represents resolvable literal.
final class ResolvableLiteral {
  /// Creates a resolvable literal.
  const ResolvableLiteral({
    required this.token,
    required this.resolve,
    this.eager = false,
  });

  /// The token.
  final String token;

  /// The resolve.
  final InjectableFactory<Object?> resolve;

  /// The eager.
  final bool eager;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      'token': token,
      'resolveFn': resolve.toAnnotatedArray(),
      if (eager) 'eager': eager,
    });
  }
}

/// Represents redirect to.
final class RedirectTo {
  /// Creates a redirect to.
  const RedirectTo({this.state, this.params});

  /// The state.
  final String? state;

  /// The params.
  final Map<String, Object?>? params;
}

/// Represents transition.
final class Transition {
  /// Creates a transition.
  const Transition(this.raw);

  /// The raw.
  final JSObject raw;

  /// The promise for this transition.
  JSPromise<JSAny?> get promise =>
      unsafe.getProperty(raw, 'promise') as JSPromise<JSAny?>;

  /// The transition id.
  int? get $id => unsafe.jsToDart<int?>(unsafe.getProperty(raw, r'$id'));

  /// Whether this transition succeeded.
  bool? get success {
    final value = unsafe.getProperty(raw, 'success');
    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Applies view configurations for this transition.
  void applyViewConfigs() {
    unsafe.callMethod(raw, 'applyViewConfigs');
  }

  /// Runs this transition.
  Object? run() => unsafe.callMethod(raw, 'run');

  /// Internal source state object.
  Object? $from() => unsafe.callMethod(raw, r'$from');

  /// Internal target state object.
  Object? $to() => unsafe.callMethod(raw, r'$to');

  /// Source state declaration.
  Object? from() => unsafe.callMethod(raw, 'from');

  /// Target state declaration.
  Object? to() => unsafe.callMethod(raw, 'to');

  /// Transition parameters for a path.
  Object? params([String? pathname]) {
    return unsafe.callMethod(raw, 'params', pathname?.toJS);
  }

  /// States entered by this transition.
  Object? entering() => unsafe.callMethod(raw, 'entering');

  /// States exited by this transition.
  Object? exiting() => unsafe.callMethod(raw, 'exiting');

  /// Creates a redirect transition.
  Transition redirect(Object? targetState) {
    final result = unsafe.callMethod(
      raw,
      'redirect',
      unsafe.dartToJs(targetState),
    );

    return Transition(result as JSObject);
  }

  /// Whether this transition is dynamic.
  bool dynamic() {
    final value = unsafe.callMethod(raw, 'dynamic');
    return (value as JSBoolean).toDart;
  }

  /// Whether this transition is active.
  bool isActive() {
    final value = unsafe.callMethod(raw, 'isActive');
    return (value as JSBoolean).toDart;
  }

  /// Whether this transition is valid.
  bool valid() {
    final value = unsafe.callMethod(raw, 'valid');
    return (value as JSBoolean).toDart;
  }

  /// Aborts this transition.
  void abort() {
    unsafe.callMethod(raw, 'abort');
  }

  /// Transition error reason.
  Object? error() => unsafe.callMethod(raw, 'error');

  @override
  String toString() {
    final value = unsafe.callMethod(raw, 'toString');
    return value == null ? '' : (value as JSString).toDart;
  }
}

/// Represents transition promise.
final class TransitionPromise {
  /// Creates a transition promise.
  const TransitionPromise(this.promise, this.transition);

  /// The promise.
  final JSPromise<JSAny?> promise;

  /// The transition.
  final Transition transition;
}
