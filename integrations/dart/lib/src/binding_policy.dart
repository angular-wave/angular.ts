import 'dart:js_interop';

import 'unsafe.dart' as unsafe;

/// Synchronous sanitizer or validator. Throw to reject the input.
typedef BindingPolicy = String Function(String value);

/// HTML sanitizer callback.
typedef HtmlPolicy = BindingPolicy;

/// Link, media, or resource URL validator callback.
typedef UrlPolicy = BindingPolicy;

/// Executable-source approval callback.
typedef ScriptPolicy = BindingPolicy;

/// Script-loading URL validator callback.
typedef ScriptUrlPolicy = BindingPolicy;

/// Destination-specific binding context names understood by the compiler.
enum BindingContext {
  /// HTML markup.
  html,

  /// Link destination.
  url,

  /// Media source.
  mediaUrl,

  /// Template or embedded resource.
  resourceUrl,

  /// Executable JavaScript source.
  script,

  /// Script-loading destination.
  scriptUrl,
}

/// Destination-specific callbacks registered through `$compile` configuration.
/// Omitted callbacks keep the framework defaults.
final class BindingPolicyConfig implements unsafe.JsConvertible {
  /// Creates compiler policy configuration without creating Trusted Types policies.
  const BindingPolicyConfig({
    this.htmlPolicy,
    this.urlPolicy,
    this.mediaUrlPolicy,
    this.resourceUrlPolicy,
    this.scriptPolicy,
    this.scriptUrlPolicy,
  });

  /// Sanitizes HTML before insertion.
  final BindingPolicy? htmlPolicy;

  /// Validates link URLs.
  final BindingPolicy? urlPolicy;

  /// Validates media URLs, including individual srcset candidates.
  final BindingPolicy? mediaUrlPolicy;

  /// Validates template and embedded-resource URLs.
  final BindingPolicy? resourceUrlPolicy;

  /// Approves executable JavaScript source.
  final BindingPolicy? scriptPolicy;

  /// Validates script-loading URLs independently of resources.
  final BindingPolicy? scriptUrlPolicy;

  /// Converts callbacks to native JavaScript functions, omitting unset policies.
  @override
  JSObject toJsValue() => unsafe.object({
        for (final entry in {
          'htmlPolicy': htmlPolicy,
          'urlPolicy': urlPolicy,
          'mediaUrlPolicy': mediaUrlPolicy,
          'resourceUrlPolicy': resourceUrlPolicy,
          'scriptPolicy': scriptPolicy,
          'scriptUrlPolicy': scriptUrlPolicy,
        }.entries)
          if (entry.value case final policy?)
            entry.key: ((JSString value) => policy(value.toDart).toJS).toJS,
      });
}
