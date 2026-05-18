import 'dart:js_interop';

import 'injectable.dart';
import 'router.dart' show ResolvableLiteral, ViewDeclaration;
import 'token.dart';
import 'unsafe.dart' as unsafe;

/// Router state declaration.
final class StateDeclaration {
  /// Creates a state declaration.
  const StateDeclaration({
    required this.name,
    this.abstractState,
    this.parent,
    this.views,
    this.url,
    this.params,
    this.data,
    this.redirectTo,
    this.onEnter,
    this.onRetain,
    this.onExit,
    this.dynamicState,
    this.component,
    this.bindings,
    this.template,
    this.controller,
    this.templateUrl,
    this.resolve,
  });

  /// The name.
  final String name;

  /// Whether this state is abstract.
  final bool? abstractState;

  /// Parent state name or declaration.
  final Object? parent;

  /// Named view declarations.
  final Map<String, Object?>? views;

  /// The url.
  final String? url;

  /// State parameter declarations.
  final Map<String, Object?>? params;

  /// State metadata.
  final Object? data;

  /// Redirect target or redirect callback.
  final Object? redirectTo;

  /// Hook invoked when this state is entered.
  final Object? onEnter;

  /// Hook invoked when this state is retained.
  final Object? onRetain;

  /// Hook invoked when this state is exited.
  final Object? onExit;

  /// Whether this state's parameters are dynamic by default.
  final bool? dynamicState;

  /// Component name for the default view.
  final String? component;

  /// Component binding to resolve-name map.
  final Map<String, String>? bindings;

  /// The template.
  final Object? template;

  /// The controller.
  final Object? controller;

  /// The template url.
  final Object? templateUrl;

  /// The resolve.
  final Object? resolve;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      'name': name,
      if (abstractState != null) 'abstract': abstractState,
      if (parent != null) 'parent': _stateValueToJs(parent),
      if (views != null) 'views': _viewsToJs(),
      if (url != null) 'url': url,
      if (params != null) 'params': params,
      if (data != null) 'data': data,
      if (redirectTo != null) 'redirectTo': redirectTo,
      if (onEnter != null) 'onEnter': _injectableValueToJs(onEnter),
      if (onRetain != null) 'onRetain': _injectableValueToJs(onRetain),
      if (onExit != null) 'onExit': _injectableValueToJs(onExit),
      if (dynamicState != null) 'dynamic': dynamicState,
      if (component != null) 'component': component,
      if (bindings != null) 'bindings': bindings,
      if (template != null) 'template': template,
      if (controller != null) 'controller': _injectableValueToJs(controller),
      if (templateUrl != null) 'templateUrl': templateUrl,
      if (resolve != null) 'resolve': _resolveToJs(resolve),
    });
  }

  Object? _viewsToJs() {
    return {
      for (final entry in views!.entries)
        entry.key: switch (entry.value) {
          final ViewDeclaration view => unsafe.JsValue(view.toJsObject()),
          final StateDeclaration state => unsafe.JsValue(state.toJsObject()),
          final Object? value => value,
        },
    };
  }

  Object? _resolveToJs(Object? value) {
    if (value is List<ResolvableLiteral>) {
      return [for (final item in value) unsafe.JsValue(item.toJsObject())];
    }

    if (value is Map<String, InjectableFactory<Object?>>) {
      return unsafe.object({
        for (final entry in value.entries)
          entry.key: unsafe.JsValue(entry.value.toAnnotatedArray()),
      });
    }

    return value;
  }
}

Object? _stateValueToJs(Object? value) {
  if (value is StateDeclaration) return unsafe.JsValue(value.toJsObject());
  return value;
}

Object? _injectableValueToJs(Object? value) {
  if (value is InjectableFactory<Object?>) {
    return unsafe.JsValue(value.toAnnotatedArray());
  }

  return value;
}

/// WebAssembly injectable registration options.
final class WasmRegistration {
  /// Creates a wasm registration.
  const WasmRegistration({
    required this.source,
    this.imports = const {},
    this.raw = false,
  });

  /// The source.
  final String source;

  /// The imports.
  final Map<String, Object?> imports;

  /// The raw.
  final bool raw;

  /// The to options object.
  JSObject toOptionsObject() {
    return unsafe.object({
      if (raw) 'raw': raw,
    });
  }
}

/// Web Worker injectable registration options.
final class WorkerRegistration {
  /// Creates a worker registration.
  const WorkerRegistration(this.scriptPath, {this.config = const {}});

  /// The script path.
  final String scriptPath;

  /// The config.
  final Map<String, Object?> config;
}

/// Persistent store registration options.
final class StoreRegistration<TStore> {
  /// Creates a store registration.
  const StoreRegistration({
    required this.creator,
    required this.type,
    this.config = const {},
  });

  /// The creator.
  final InjectableFactory<TStore> creator;

  /// The type.
  final StorageType type;

  /// The config.
  final Map<String, Object?> config;
}

/// Supported storage type values.
enum StorageType {
  /// Invokes local.
  local('local'),

  /// Invokes session.
  session('session'),

  /// Invokes cookie.
  cookie('cookie'),

  /// Invokes custom.
  custom('custom');

  const StorageType(this.runtimeName);

  /// The runtime name.
  final String runtimeName;
}

/// Server-sent events registration options.
final class SseRegistration {
  /// Creates a sse registration.
  const SseRegistration(this.url, {this.config = const {}});

  /// The url.
  final String url;

  /// The config.
  final Map<String, Object?> config;
}

/// WebSocket registration options.
final class WebSocketRegistration {
  /// Creates a web socket registration.
  const WebSocketRegistration(
    this.url, {
    this.protocols = const [],
    this.config = const {},
  });

  /// The url.
  final String url;

  /// The protocols.
  final List<String> protocols;

  /// The config.
  final Map<String, Object?> config;
}

/// WebTransport registration options.
final class WebTransportRegistration {
  /// Creates a web transport registration.
  const WebTransportRegistration(this.url, {this.config = const {}});

  /// The url.
  final String url;

  /// The config.
  final Map<String, Object?> config;
}

/// Provider registration.
final class ProviderRegistration<TValue> {
  /// Creates a provider registration.
  const ProviderRegistration(this.get);

  /// The get.
  final InjectableFactory<TValue> get;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({'$get': get.toAnnotatedArray()});
  }
}

/// Decorator registration.
final class DecoratorRegistration<TValue> {
  /// Creates a decorator registration.
  const DecoratorRegistration(this.decorator);

  /// The decorator.
  final InjectableFactory<TValue> decorator;
}

/// Filter registration.
final class FilterRegistration<TValue> {
  /// Creates a filter registration.
  const FilterRegistration(this.factory);

  /// The factory.
  final InjectableFactory<TValue> factory;
}

/// Animation registration.
final class AnimationRegistration<TValue> {
  /// Creates a animation registration.
  const AnimationRegistration(this.factory);

  /// The factory.
  final InjectableFactory<TValue> factory;
}

/// Typed module config/run block.
typedef ModuleBlock = InjectableFactory<Object?>;

/// Creates a token for a router state resolve value.
Token<T> resolveToken<T>(String name) => token<T>(name);
