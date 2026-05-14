import 'dart:js_interop';

import 'package:web/web.dart';

import 'scope.dart';
import 'services.dart';
import 'unsafe.dart' as unsafe;

/// Describes a single component binding change.
final class ChangesObject<T> {
  /// Creates a changes object.
  const ChangesObject({
    required this.currentValue,
    required this.previousValue,
    required this.firstChange,
  });

  /// The current value.
  final T currentValue;

  /// The previous value.
  final T? previousValue;

  /// The first change.
  final bool firstChange;
}

/// Component binding changes keyed by binding name.
typedef OnChangesObject = Map<String, ChangesObject<Object?>>;

/// Callback used when transcluded content is cloned.
typedef CloneAttachFn = void Function(JSAny? clone, Scope<Object>? scope);

/// Wrapper for AngularTS transclusion functions.
final class TranscludeFn extends AngularTsJsFacade {
  /// Creates a transclude fn.
  const TranscludeFn(super.raw);
}

/// Wrapper for AngularTS bound transclusion functions.
final class BoundTranscludeFn extends AngularTsJsFacade {
  /// Creates a bound transclude fn.
  const BoundTranscludeFn(super.raw);
}

/// Wrapper for the public link function returned by `$compile`.
final class PublicLinkFn extends AngularTsJsFacade {
  /// Creates a public link fn.
  const PublicLinkFn(super.raw);
}

/// Dart-facing directive link context.
final class DirectiveLinkContext<TScope, TController> {
  /// Creates a directive link context.
  const DirectiveLinkContext({
    required this.scope,
    required this.element,
    required this.attrs,
    required this.controller,
    required this.transclude,
  });

  /// The scope.
  final Scope<TScope> scope;

  /// The element.
  final HTMLElement element;

  /// The attrs.
  final Attributes attrs;

  /// The controller.
  final TController? controller;

  /// The transclude.
  final TranscludeFn? transclude;
}

/// Signature for directive link fn.
typedef DirectiveLinkFn<TScope, TController> = void Function(
    DirectiveLinkContext<TScope, TController> context);

/// Optional pre/post link functions returned from directive compile.
final class DirectivePrePost<TScope, TController> {
  /// Creates a directive pre post.
  const DirectivePrePost({this.pre, this.post});

  /// The pre.
  final DirectiveLinkFn<TScope, TController>? pre;

  /// The post.
  final DirectiveLinkFn<TScope, TController>? post;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (pre != null) 'pre': unsafe.JsValue(linkFunction(pre!)),
      if (post != null) 'post': unsafe.JsValue(linkFunction(post!)),
    });
  }
}

/// A directive compile result.
sealed class DirectiveCompileResult<TScope, TController> {
  const DirectiveCompileResult();

  /// The to js value.
  JSAny? toJsValue();
}

/// Represents directive compile link.
final class DirectiveCompileLink<TScope, TController>
    extends DirectiveCompileResult<TScope, TController> {
  /// Creates a directive compile link.
  const DirectiveCompileLink(this.link);

  /// The link.
  final DirectiveLinkFn<TScope, TController> link;

  @override
  JSAny? toJsValue() => linkFunction(link);
}

/// Represents directive compile pre post.
final class DirectiveCompilePrePost<TScope, TController>
    extends DirectiveCompileResult<TScope, TController> {
  /// Creates a directive compile pre post.
  const DirectiveCompilePrePost(this.links);

  /// The links.
  final DirectivePrePost<TScope, TController> links;

  @override
  JSAny? toJsValue() => links.toJsObject();
}

/// Dart-facing directive compile context.
final class DirectiveCompileContext {
  /// Creates a directive compile context.
  const DirectiveCompileContext({
    required this.templateElement,
    required this.templateAttributes,
    required this.transclude,
  });

  /// The template element.
  final HTMLElement templateElement;

  /// The template attributes.
  final Attributes templateAttributes;

  /// The transclude.
  final JSFunction? transclude;
}

/// Signature for directive compile fn.
typedef DirectiveCompileFn<TScope, TController>
    = DirectiveCompileResult<TScope, TController>? Function(
  DirectiveCompileContext context,
);

/// Converts a Dart directive link callback to a JavaScript link function.
JSFunction linkFunction<TScope, TController>(
  DirectiveLinkFn<TScope, TController> link,
) {
  return ((
    JSAny? scopeValue,
    JSAny? elementValue,
    JSAny? attrsValue,
    JSAny? controllerValue,
    JSAny? transcludeValue,
  ) {
    link(
      DirectiveLinkContext<TScope, TController>(
        scope: Scope<TScope>.unsafe(scopeValue),
        element: elementValue as HTMLElement,
        attrs: Attributes(attrsValue as JSObject),
        controller: controllerValue == null
            ? null
            : unsafe.jsToDart<TController>(controllerValue),
        transclude: transcludeValue == null
            ? null
            : TranscludeFn(transcludeValue as JSObject),
      ),
    );
  }).toJS;
}

/// Converts a Dart directive compile callback to a JavaScript compile function.
JSFunction compileFunction<TScope, TController>(
  DirectiveCompileFn<TScope, TController> compile,
) {
  return ((
    JSAny? elementValue,
    JSAny? attrsValue,
    JSAny? transcludeValue,
  ) {
    return compile(
      DirectiveCompileContext(
        templateElement: elementValue as HTMLElement,
        templateAttributes: Attributes(attrsValue as JSObject),
        transclude: transcludeValue as JSFunction?,
      ),
    )?.toJsValue();
  }).toJS;
}
