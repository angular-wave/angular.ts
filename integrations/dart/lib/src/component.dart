import 'dart:js_interop';

import 'injectable.dart';
import 'unsafe.dart' as unsafe;

/// AngularTS component binding mode.
enum BindingMode {
  /// Invokes text.
  text('@'),

  /// Invokes one way.
  oneWay('<'),

  /// Invokes two way.
  twoWay('='),

  /// Invokes expression.
  expression('&');

  const BindingMode(this.symbol);

  /// The symbol.
  final String symbol;
}

/// A typed AngularTS component binding.
final class Binding<T> {
  /// Creates a binding.
  const Binding(this.mode, {this.optional = false});

  /// The mode.
  final BindingMode mode;

  /// The optional.
  final bool optional;

  /// Binding symbol including the optional marker when enabled.
  String get symbol => optional ? '${mode.symbol}?' : mode.symbol;
}

/// The text binding.
Binding<String> textBinding({bool optional = false}) {
  return Binding<String>(BindingMode.text, optional: optional);
}

/// Creates a one-way component binding.
Binding<T> oneWayBinding<T>({bool optional = false}) {
  return Binding<T>(BindingMode.oneWay, optional: optional);
}

/// Creates a two-way component binding.
Binding<T> twoWayBinding<T>({bool optional = false}) {
  return Binding<T>(BindingMode.twoWay, optional: optional);
}

/// Creates an expression callback component binding.
Binding<T> expressionBinding<T>({bool optional = false}) {
  return Binding<T>(BindingMode.expression, optional: optional);
}

/// Component transclusion configuration.
sealed class ComponentTransclusion {
  const ComponentTransclusion();

  /// The to js value.
  Object? toJsValue();
}

/// Represents no transclusion.
final class NoTransclusion extends ComponentTransclusion {
  /// Creates a no transclusion.
  const NoTransclusion();

  @override
  Object? toJsValue() => false;
}

/// Represents content transclusion.
final class ContentTransclusion extends ComponentTransclusion {
  /// Creates a content transclusion.
  const ContentTransclusion();

  @override
  Object? toJsValue() => true;
}

/// Represents slot transclusion.
final class SlotTransclusion extends ComponentTransclusion {
  /// Creates a slot transclusion.
  const SlotTransclusion(this.slots);

  /// The slots.
  final Map<String, String> slots;

  @override
  Object? toJsValue() => slots;
}

/// AngularTS component configuration.
final class Component<TController> {
  /// Creates a component.
  const Component({
    required this.controller,
    this.template,
    this.templateUrl,
    this.bindings = const {},
    this.controllerAs,
    this.transclude = const NoTransclusion(),
    this.require = const {},
  });

  /// The template.
  final String? template;

  /// The template url.
  final String? templateUrl;

  /// The controller.
  final InjectableFactory<TController> controller;

  /// The bindings.
  final Map<String, Binding<Object?>> bindings;

  /// The controller as.
  final String? controllerAs;

  /// The transclude.
  final ComponentTransclusion transclude;

  /// The require.
  final Map<String, String> require;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (template != null) 'template': template,
      if (templateUrl != null) 'templateUrl': templateUrl,
      'controller': controller.toAnnotatedArray(),
      if (bindings.isNotEmpty) 'bindings': _bindingsToJs(),
      if (controllerAs != null) 'controllerAs': controllerAs,
      if (transclude is! NoTransclusion) 'transclude': transclude.toJsValue(),
      if (require.isNotEmpty) 'require': require,
    });
  }

  JSObject _bindingsToJs() {
    return unsafe.object({
      for (final entry in bindings.entries) entry.key: entry.value.symbol,
    });
  }
}
