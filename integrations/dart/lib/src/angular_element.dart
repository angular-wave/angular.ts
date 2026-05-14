import 'dart:js_interop';

import 'package:web/web.dart';

import 'bootstrap.dart';
import 'module.dart';
import 'services.dart';
import 'unsafe.dart' as unsafe;
import 'web_component.dart';

/// Hook used to configure the module that owns a standalone custom element.
typedef AngularElementConfigure = void Function(
  NgModule module,
  AngularService angular,
);

/// Configuration for the AngularTS module that owns a custom element.
final class AngularElementModuleOptions {
  /// Creates a angular element module options.
  const AngularElementModuleOptions({
    this.name,
    this.requires = const [],
    this.configure,
  });

  /// Element application module name. Defaults to a name derived from the tag.
  final String? name;

  /// Additional AngularTS modules required by the element module.
  final List<String> requires;

  /// Optional module configuration hook.
  final AngularElementConfigure? configure;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (name != null) 'name': name,
      if (requires.isNotEmpty) 'requires': requires,
      if (configure != null)
        'configure': unsafe.JsValue(((JSObject module, JSObject angular) {
          configure!(NgModule(name ?? '', module), AngularService(angular));
        }).toJS),
    });
  }
}

/// Options for defining a standalone AngularTS-backed custom element.
final class AngularElementOptions<TScope> {
  /// Creates a angular element options.
  const AngularElementOptions({
    required this.component,
    this.ngModule,
    this.elementModule = const AngularElementModuleOptions(),
    this.bootstrap = const BootstrapConfig(),
    this.extra = const {},
  });

  /// Web component definition passed to AngularTS.
  final WebComponent<TScope> component;

  /// Custom runtime `ng` module configuration.
  final Object? ngModule;

  /// Application module that registers the custom element.
  final AngularElementModuleOptions elementModule;

  /// Bootstrap/runtime options forwarded to AngularTS.
  final BootstrapConfig bootstrap;

  /// Additional runtime options not modeled by this facade yet.
  final Map<String, Object?> extra;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      ...extra,
      if (ngModule != null) 'ngModule': ngModule,
      'elementModule': unsafe.JsValue(elementModule.toJsObject()),
      'component': unsafe.JsValue(component.toJsObject()),
      'config': bootstrap.toMap(),
    });
  }
}

/// Metadata returned after defining a standalone AngularTS custom element.
final class AngularElementDefinition {
  /// Creates a angular element definition.
  const AngularElementDefinition({
    required this.angular,
    required this.ngModule,
    required this.elementModule,
    required this.injector,
    required this.element,
    required this.name,
  });

  /// AngularTS runtime instance that owns the element injector.
  final AngularService angular;

  /// Custom runtime `ng` module.
  final NgModule ngModule;

  /// Application module that registered the element.
  final NgModule elementModule;

  /// Injector shared by instances of this custom element definition.
  final InjectorService injector;

  /// Native custom element constructor registered with `customElements`.
  final CustomElementConstructor element;

  /// Registered custom element tag name.
  final String name;

  /// Wraps raw AngularTS standalone element metadata.
  factory AngularElementDefinition.unsafe(JSObject raw) {
    final name = unsafe.getProperty(raw, 'name') as JSString;

    return AngularElementDefinition(
      angular: AngularService(unsafe.getProperty(raw, 'angular') as JSObject),
      ngModule: NgModule('', unsafe.getProperty(raw, 'ngModule') as JSObject),
      elementModule: NgModule(
        '',
        unsafe.getProperty(raw, 'elementModule') as JSObject,
      ),
      injector:
          InjectorService(unsafe.getProperty(raw, 'injector') as JSObject),
      element: unsafe.getProperty(raw, 'element') as CustomElementConstructor,
      name: name.toDart,
    );
  }
}
