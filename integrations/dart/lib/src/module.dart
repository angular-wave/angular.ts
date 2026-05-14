import 'dart:js_interop';

import 'component.dart';
import 'directive.dart';
import 'injectable.dart';
import 'module_options.dart';
import 'token.dart';
import 'unsafe.dart' as unsafe;
import 'web_component.dart';

/// Typed wrapper around an AngularTS module.
final class NgModule {
  /// Creates a ng module.
  const NgModule(this.name, this._module);

  /// The name.
  final String name;
  final JSObject _module;

  /// Registers an AngularTS constant.
  NgModule constant<TValue>(Token<TValue> token, TValue value) {
    unsafe.callMethod(
      _module,
      'constant',
      token.name.toJS,
      unsafe.dartToJs(value),
    );

    return this;
  }

  /// The config.
  NgModule config(ModuleBlock block) {
    unsafe.callMethod(_module, 'config', block.toAnnotatedArray());

    return this;
  }

  /// The run.
  NgModule run(ModuleBlock block) {
    unsafe.callMethod(_module, 'run', block.toAnnotatedArray());

    return this;
  }

  /// Registers an AngularTS component.
  NgModule component<TController>(
    String name,
    Component<TController> options,
  ) {
    unsafe.callMethod(_module, 'component', name.toJS, options.toJsObject());

    return this;
  }

  /// Registers an AngularTS directive.
  NgModule directive<TScope, TController>(
    String name,
    Directive<TScope, TController> options,
  ) {
    unsafe.callMethod(
      _module,
      'directive',
      name.toJS,
      directiveFactory(options).toAnnotatedArray(),
    );

    return this;
  }

  /// Registers an AngularTS controller.
  NgModule controller<TController>(
    String name,
    InjectableFactory<TController> controller,
  ) {
    unsafe.callMethod(
      _module,
      'controller',
      name.toJS,
      controller.toAnnotatedArray(),
    );

    return this;
  }

  /// Registers an AngularTS service.
  NgModule service<TService>(
    Token<TService> token,
    InjectableFactory<TService> service,
  ) {
    unsafe.callMethod(
      _module,
      'service',
      token.name.toJS,
      service.toAnnotatedArray(),
    );

    return this;
  }

  /// Registers an AngularTS factory.
  NgModule factory<TValue>(
    Token<TValue> token,
    InjectableFactory<TValue> factory,
  ) {
    unsafe.callMethod(
      _module,
      'factory',
      token.name.toJS,
      factory.toAnnotatedArray(),
    );

    return this;
  }

  /// Registers an AngularTS value.
  NgModule value<TValue>(Token<TValue> token, TValue value) {
    unsafe.callMethod(
        _module, 'value', token.name.toJS, unsafe.dartToJs(value));

    return this;
  }

  /// Registers an AngularTS provider.
  NgModule provider<TValue>(
    Token<TValue> token,
    ProviderRegistration<TValue> provider,
  ) {
    unsafe.callMethod(
      _module,
      'provider',
      token.name.toJS,
      provider.toJsObject(),
    );

    return this;
  }

  /// Registers an AngularTS decorator.
  NgModule decorator<TValue>(
    Token<TValue> token,
    DecoratorRegistration<TValue> decorator,
  ) {
    unsafe.callMethod(
      _module,
      'decorator',
      token.name.toJS,
      decorator.decorator.toAnnotatedArray(),
    );

    return this;
  }

  /// Registers an AngularTS animation.
  NgModule animation<TValue>(
    String name,
    AnimationRegistration<TValue> animation,
  ) {
    unsafe.callMethod(
      _module,
      'animation',
      name.toJS,
      animation.factory.toAnnotatedArray(),
    );

    return this;
  }

  /// Registers an AngularTS filter.
  NgModule filter<TValue>(
    String name,
    FilterRegistration<TValue> filter,
  ) {
    unsafe.callMethod(
      _module,
      'filter',
      name.toJS,
      filter.factory.toAnnotatedArray(),
    );

    return this;
  }

  /// The state.
  NgModule state(StateDeclaration state) {
    unsafe.callMethod(_module, 'state', state.toJsObject());

    return this;
  }

  /// Registers an AngularTS WebAssembly dependency.
  NgModule wasm<TValue>(
    Token<TValue> token,
    WasmRegistration wasm,
  ) {
    unsafe.callMethod(
      _module,
      'wasm',
      token.name.toJS,
      wasm.source.toJS,
      unsafe.object(wasm.imports),
      wasm.toOptionsObject(),
    );

    return this;
  }

  /// Registers an AngularTS Web Worker dependency.
  NgModule worker<TValue>(
    Token<TValue> token,
    WorkerRegistration worker,
  ) {
    unsafe.callMethod(
      _module,
      'worker',
      token.name.toJS,
      worker.scriptPath.toJS,
      unsafe.object(worker.config),
    );

    return this;
  }

  /// Registers an AngularTS persistent store.
  NgModule store<TStore>(
    Token<TStore> token,
    StoreRegistration<TStore> store,
  ) {
    unsafe.callMethod(
      _module,
      'store',
      token.name.toJS,
      store.creator.toAnnotatedArray(),
      store.type.runtimeName.toJS,
      unsafe.object(store.config),
    );

    return this;
  }

  /// Registers an AngularTS server-sent events connection.
  NgModule sse<TConnection>(
    Token<TConnection> token,
    SseRegistration sse,
  ) {
    unsafe.callMethod(
      _module,
      'sse',
      token.name.toJS,
      sse.url.toJS,
      unsafe.object(sse.config),
    );

    return this;
  }

  /// Registers an AngularTS WebSocket connection.
  NgModule websocket<TConnection>(
    Token<TConnection> token,
    WebSocketRegistration websocket,
  ) {
    unsafe.callMethod(
      _module,
      'websocket',
      token.name.toJS,
      websocket.url.toJS,
      websocket.protocols.isEmpty ? null : unsafe.strings(websocket.protocols),
      unsafe.object(websocket.config),
    );

    return this;
  }

  /// Registers an AngularTS WebTransport connection.
  NgModule webTransport<TConnection>(
    Token<TConnection> token,
    WebTransportRegistration webTransport,
  ) {
    unsafe.callMethod(
      _module,
      'webTransport',
      token.name.toJS,
      webTransport.url.toJS,
      unsafe.object(webTransport.config),
    );

    return this;
  }

  /// Registers an AngularTS custom element.
  NgModule webComponent<TScope>(
    String name,
    WebComponent<TScope> options,
  ) {
    unsafe.callMethod(_module, 'webComponent', name.toJS, options.toJsObject());

    return this;
  }

  /// Registers an AngularTS pub/sub topic.
  NgModule topic<TTopic>(Token<TTopic> token, String topic) {
    unsafe.callMethod(_module, 'topic', token.name.toJS, topic.toJS);

    return this;
  }
}
