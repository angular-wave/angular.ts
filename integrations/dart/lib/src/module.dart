import 'component.dart';
import 'directive.dart';
import 'generated/ng_facades.dart';
import 'injectable.dart';
import 'module_options.dart';
import 'rest.dart';
import 'token.dart';
import 'unsafe.dart' as unsafe;
import 'web_component.dart';

/// Typed wrapper around an AngularTS module.
final class NgModule extends GeneratedNgNgModule {
  /// Creates a ng module.
  const NgModule(String _, super.raw);

  /// Registers an AngularTS constant.
  NgModule constant<TValue>(Token<TValue> token, TValue value) {
    rawConstant(token.name, value);
    return this;
  }

  /// The config.
  NgModule config(ModuleBlock block) {
    rawConfig(block);
    return this;
  }

  /// The run.
  NgModule run(ModuleBlock block) {
    rawRun(block);
    return this;
  }

  /// Registers an AngularTS component.
  NgModule component<TController>(
    String name,
    Component<TController> options,
  ) {
    rawComponent(name, options);
    return this;
  }

  /// Registers an AngularTS directive.
  NgModule directive<TScope, TController>(
    String name,
    Directive<TScope, TController> options,
  ) {
    rawDirective(name, directiveFactory(options));
    return this;
  }

  /// Registers an AngularTS controller.
  NgModule controller<TController>(
    String name,
    InjectableFactory<TController> controller,
  ) {
    rawController(name, controller);
    return this;
  }

  /// Registers an AngularTS service.
  NgModule service<TService>(
    Token<TService> token,
    InjectableFactory<TService> service,
  ) {
    rawService(token.name, service);
    return this;
  }

  /// Registers an AngularTS factory.
  NgModule factory<TValue>(
    Token<TValue> token,
    InjectableFactory<TValue> factory,
  ) {
    rawFactory(token.name, factory);
    return this;
  }

  /// Registers an AngularTS value.
  NgModule value<TValue>(Token<TValue> token, TValue value) {
    rawValue(token.name, value);
    return this;
  }

  /// Registers an AngularTS provider.
  NgModule provider<TValue>(
    Token<TValue> token,
    ProviderRegistration<TValue> provider,
  ) {
    rawProvider(token.name, provider);
    return this;
  }

  /// Registers an AngularTS decorator.
  NgModule decorator<TValue>(
    Token<TValue> token,
    DecoratorRegistration<TValue> decorator,
  ) {
    rawDecorator(token.name, decorator);
    return this;
  }

  /// Registers an AngularTS animation.
  NgModule animation<TValue>(
    String name,
    AnimationRegistration<TValue> animation,
  ) {
    rawAnimation(name, animation);
    return this;
  }

  /// Registers an AngularTS filter.
  NgModule filter<TValue>(
    String name,
    FilterRegistration<TValue> filter,
  ) {
    rawFilter(name, filter);
    return this;
  }

  /// The state.
  NgModule state(StateDeclaration state) {
    rawState(state);
    return this;
  }

  /// Registers an AngularTS REST resource.
  NgModule rest<T>(
    RestDefinition<T> definition,
  ) {
    rawRest(
      definition.name,
      definition.url,
      definition.entityClass,
      definition.options.extra,
    );
    return this;
  }

  /// Registers an AngularTS WebAssembly dependency.
  NgModule wasm<TValue>(
    Token<TValue> token,
    WasmRegistration wasm,
  ) {
    rawWasm(token.name, wasm.source, wasm.imports, wasm);
    return this;
  }

  /// Registers an AngularTS Web Worker dependency.
  NgModule worker<TValue>(
    Token<TValue> token,
    WorkerRegistration worker,
  ) {
    rawWorker(token.name, worker.scriptPath, worker.config);
    return this;
  }

  /// Registers an AngularTS persistent store.
  NgModule store<TStore>(
    Token<TStore> token,
    StoreRegistration<TStore> store,
  ) {
    rawStore(
      token.name,
      store.creator,
      store.type.runtimeName,
      store.config,
    );
    return this;
  }

  /// Registers an AngularTS server-sent events connection.
  NgModule sse<TConnection>(
    Token<TConnection> token,
    SseRegistration sse,
  ) {
    rawSse(token.name, sse.url, sse.config);
    return this;
  }

  /// Registers an AngularTS WebSocket connection.
  NgModule websocket<TConnection>(
    Token<TConnection> token,
    WebSocketRegistration websocket,
  ) {
    rawWebsocket(
      token.name,
      websocket.url,
      websocket.protocols.isEmpty ? null : unsafe.strings(websocket.protocols),
      websocket.config,
    );
    return this;
  }

  /// Registers an AngularTS WebTransport connection.
  NgModule webTransport<TConnection>(
    Token<TConnection> token,
    WebTransportRegistration webTransport,
  ) {
    rawWebTransport(
      token.name,
      webTransport.url,
      webTransport.config,
    );
    return this;
  }

  /// Registers an options-backed application host custom element.
  NgModule appComponent<TScope>(
    String name,
    AppComponent<TScope> options,
  ) {
    rawAppComponent(name, options);
    return this;
  }

  /// Registers a native custom element backed by an AngularTS scope.
  NgModule webComponent<TScope>(
    String name,
    ScopeElementConstructor<TScope> elementClass,
  ) {
    rawWebComponent(name, unsafe.JsValue(elementClass));
    return this;
  }

}
