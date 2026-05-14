import 'dart:js_interop';

import 'compile.dart';
import 'component.dart';
import 'injectable.dart';
import 'unsafe.dart' as unsafe;

/// Supported directive restrict values.
enum DirectiveRestrict {
  /// Invokes attribute.
  attribute('A'),

  /// Invokes element.
  element('E'),

  /// Invokes attribute element.
  attributeElement('AE'),

  /// Invokes class name.
  className('C'),

  /// Invokes comment.
  comment('M'),

  /// Invokes all.
  all('AECM');

  const DirectiveRestrict(this.symbol);

  /// The symbol.
  final String symbol;
}

/// Directive transclusion configuration.
sealed class DirectiveTransclusion {
  const DirectiveTransclusion();

  /// The to js value.
  Object? toJsValue();
}

/// Represents no directive transclusion.
final class NoDirectiveTransclusion extends DirectiveTransclusion {
  /// Creates a no directive transclusion.
  const NoDirectiveTransclusion();

  @override
  Object? toJsValue() => false;
}

/// Represents content directive transclusion.
final class ContentDirectiveTransclusion extends DirectiveTransclusion {
  /// Creates a content directive transclusion.
  const ContentDirectiveTransclusion();

  @override
  Object? toJsValue() => true;
}

/// Represents element directive transclusion.
final class ElementDirectiveTransclusion extends DirectiveTransclusion {
  /// Creates a element directive transclusion.
  const ElementDirectiveTransclusion();

  @override
  Object? toJsValue() => 'element';
}

/// Represents slot directive transclusion.
final class SlotDirectiveTransclusion extends DirectiveTransclusion {
  /// Creates a slot directive transclusion.
  const SlotDirectiveTransclusion(this.slots);

  /// The slots.
  final Map<String, String> slots;

  @override
  Object? toJsValue() => slots;
}

/// AngularTS directive definition.
final class Directive<TScope, TController> {
  /// Creates a directive.
  const Directive({
    this.name,
    this.restrict = DirectiveRestrict.attributeElement,
    this.compile,
    this.controller,
    this.controllerAs,
    this.bindToController,
    this.link,
    this.priority,
    this.terminal = false,
    this.replace = false,
    this.require,
    this.templateNamespace,
    this.templateUrl,
    this.transclude = const NoDirectiveTransclusion(),
    this.count,
    this.template,
    this.scope,
  });

  /// The name.
  final String? name;

  /// The restrict.
  final DirectiveRestrict restrict;

  /// The compile.
  final DirectiveCompileFn<TScope, TController>? compile;

  /// The controller.
  final InjectableFactory<TController>? controller;

  /// The controller as.
  final String? controllerAs;

  /// The bind to controller.
  final Map<String, Binding<Object?>>? bindToController;

  /// The link.
  final DirectiveLinkFn<TScope, TController>? link;

  /// The priority.
  final int? priority;

  /// The terminal.
  final bool terminal;

  /// The replace.
  final bool replace;

  /// The require.
  final Object? require;

  /// The template namespace.
  final String? templateNamespace;

  /// The template url.
  final String? templateUrl;

  /// The transclude.
  final DirectiveTransclusion transclude;

  /// The count.
  final int? count;

  /// The template.
  final String? template;

  /// The scope.
  final TScope? scope;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (name != null) 'name': name,
      'restrict': restrict.symbol,
      if (compile != null) 'compile': unsafe.JsValue(compileFunction(compile!)),
      if (controller != null) 'controller': controller!.toAnnotatedArray(),
      if (controllerAs != null) 'controllerAs': controllerAs,
      if (bindToController != null)
        'bindToController': _bindingsToJs(bindToController!),
      if (link != null) 'link': unsafe.JsValue(linkFunction(link!)),
      if (priority != null) 'priority': priority,
      if (terminal) 'terminal': terminal,
      if (replace) 'replace': replace,
      if (require != null) 'require': require,
      if (template != null) 'template': template,
      if (templateNamespace != null) 'templateNamespace': templateNamespace,
      if (templateUrl != null) 'templateUrl': templateUrl,
      if (transclude is! NoDirectiveTransclusion)
        'transclude': transclude.toJsValue(),
      if (count != null) 'count': count,
      if (scope != null) 'scope': unsafe.dartToJs(scope),
    });
  }

  JSObject _bindingsToJs(Map<String, Binding<Object?>> bindings) {
    return unsafe.object({
      for (final entry in bindings.entries) entry.key: entry.value.symbol,
    });
  }
}

/// Creates an injectable AngularTS directive factory.
InjectableFactory<JSObject> directiveFactory<TScope, TController>(
  Directive<TScope, TController> directive,
) {
  return inject0<JSObject>(directive.toJsObject);
}
