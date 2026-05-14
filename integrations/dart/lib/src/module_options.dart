import 'dart:js_interop';

import 'injectable.dart';
import 'token.dart';
import 'unsafe.dart' as unsafe;

/// Router state declaration.
final class StateDeclaration {
  /// Creates a state declaration.
  const StateDeclaration({
    required this.name,
    this.url,
    this.template,
    this.controller,
    this.resolve = const {},
  });

  /// The name.
  final String name;

  /// The url.
  final String? url;

  /// The template.
  final String? template;

  /// The controller.
  final InjectableFactory<Object?>? controller;

  /// The resolve.
  final Map<String, InjectableFactory<Object?>> resolve;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      'name': name,
      if (url != null) 'url': url,
      if (template != null) 'template': template,
      if (controller != null) 'controller': controller!.toAnnotatedArray(),
      if (resolve.isNotEmpty)
        'resolve': unsafe.object({
          for (final entry in resolve.entries)
            entry.key: entry.value.toAnnotatedArray(),
        }),
    });
  }
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
