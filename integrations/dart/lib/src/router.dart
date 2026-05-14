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
