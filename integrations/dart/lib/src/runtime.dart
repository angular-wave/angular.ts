import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'package:web/web.dart';

import 'bootstrap.dart';
import 'injector.dart';
import 'module.dart';
import 'scope.dart';
import 'unsafe.dart' as unsafe;

@JS('angular')
external JSObject get _globalAngular;

/// Typed AngularTS runtime facade.
final class AngularTsRuntime {
  const AngularTsRuntime._(this._runtime);

  /// Returns the global AngularTS runtime facade.
  factory AngularTsRuntime.global() {
    return AngularTsRuntime._(_globalAngular);
  }

  final JSObject _runtime;

  /// The module.
  NgModule module(String name, [List<String> requires = const []]) {
    final value = unsafe.callMethod(
      _runtime,
      'module',
      name.toJS,
      unsafe.strings(requires),
    );

    return NgModule(name, value as JSObject);
  }

  /// The bootstrap.
  Injector bootstrap(
    Element root,
    List<String> modules, {
    BootstrapConfig config = const BootstrapConfig(),
  }) {
    final value = unsafe.callMethod(
      _runtime,
      'bootstrap',
      root as JSAny,
      unsafe.strings(modules),
      unsafe.object(config.toMap()),
    );

    return Injector(value as JSObject);
  }

  /// The injector.
  Injector injector(List<String> modules, {bool strictDi = false}) {
    final value = unsafe.callMethod(
      _runtime,
      'injector',
      unsafe.strings(modules),
      strictDi.toJS,
    );

    return Injector(value as JSObject);
  }

  /// The init.
  void init(JSObject root) {
    unsafe.callMethod(_runtime, 'init', root);
  }

  /// Returns the AngularTS scope associated with an element.
  Scope<TState>? getScope<TState>(Element element) {
    final value = unsafe.callMethod(_runtime, 'getScope', element as JSAny);

    if (value == null) return null;

    return Scope<TState>.unsafe(value);
  }

  /// The get injector.
  Injector? getInjector(Element element) {
    final value = unsafe.callMethod(_runtime, 'getInjector', element as JSAny);

    if (value == null) return null;

    return Injector(value as JSObject);
  }

  /// The get controller.
  Object? getController(Element element) {
    return unsafe.callMethod(_runtime, 'getController', element as JSAny);
  }

  /// Returns a named AngularTS scope when one exists.
  Scope<TState>? getScopeByName<TState>(String name) {
    final value = unsafe.callMethod(_runtime, 'getScopeByName', name.toJS);

    if (value == null) return null;

    return Scope<TState>.unsafe(value);
  }

  /// The emit.
  void emit(String invocation) {
    unsafe.callMethod(_runtime, 'emit', invocation.toJS);
  }

  /// The call.
  JSPromise<JSAny?> call(String invocation) {
    return unsafe.callMethod(_runtime, 'call', invocation.toJS)
        as JSPromise<JSAny?>;
  }

  /// AngularTS runtime version string.
  String get version {
    final value = _runtime.getProperty('version'.toJS);

    if (value == null) return '';

    return (value as JSString).toDart;
  }
}

/// The module.
NgModule module(String name, [List<String> requires = const []]) {
  return AngularTsRuntime.global().module(name, requires);
}

/// The bootstrap.
Injector bootstrap(
  Element root,
  List<String> modules, {
  BootstrapConfig config = const BootstrapConfig(),
}) {
  return AngularTsRuntime.global().bootstrap(root, modules, config: config);
}

/// The injector.
Injector injector(List<String> modules, {bool strictDi = false}) {
  return AngularTsRuntime.global().injector(modules, strictDi: strictDi);
}

/// The init.
void init(JSObject root) {
  AngularTsRuntime.global().init(root);
}

/// Returns the AngularTS scope associated with an element.
Scope<TState>? getScope<TState>(Element element) {
  return AngularTsRuntime.global().getScope<TState>(element);
}

/// The get injector.
Injector? getInjector(Element element) {
  return AngularTsRuntime.global().getInjector(element);
}

/// The get controller.
Object? getController(Element element) {
  return AngularTsRuntime.global().getController(element);
}

/// Returns a named AngularTS scope when one exists.
Scope<TState>? getScopeByName<TState>(String name) {
  return AngularTsRuntime.global().getScopeByName<TState>(name);
}

/// The emit.
void emit(String invocation) {
  AngularTsRuntime.global().emit(invocation);
}

/// The call.
JSPromise<JSAny?> call(String invocation) {
  return AngularTsRuntime.global().call(invocation);
}
