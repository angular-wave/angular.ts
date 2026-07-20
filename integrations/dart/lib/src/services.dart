import 'dart:js_interop';

import 'facade.dart';
import 'generated/ng_facades.dart';
import 'http.dart';
import 'module_options.dart';
import 'scope.dart';
import 'unsafe.dart' as unsafe;

/// Represents the AngularTS runtime.
final class Angular extends GeneratedNgAngular {
  /// Creates an AngularTS runtime facade.
  const Angular(super.raw);
}

/// Represents anchor scroll service.
final class AnchorScrollService extends GeneratedNgAnchorScrollService {
  /// Creates a anchor scroll service.
  const AnchorScrollService(super.raw);

  set yOffset(Object? value) {
    unsafe.setProperty(raw, 'yOffset', value);
  }
}

/// Represents animate service.
final class AnimateService extends GeneratedNgAnimateService {
  /// Creates a animate service.
  const AnimateService(super.raw);
}

/// Represents aria service.
final class AriaService extends GeneratedNgAriaService {
  /// Creates a aria service.
  const AriaService(super.raw);
}

/// Represents compile service.
final class CompileService extends GeneratedNgCompileService {
  /// Creates a compile service.
  const CompileService(super.raw);
}

/// Represents controller service.
final class ControllerService extends GeneratedNgControllerService {
  /// Creates a controller service.
  const ControllerService(super.raw);
}

/// Represents cookie service.
final class CookieService extends GeneratedNgCookieService {
  /// Creates a cookie service.
  const CookieService(super.raw);
}

/// Represents exception handler service.
final class ExceptionHandlerService extends GeneratedNgExceptionHandlerService {
  /// Creates a exception handler service.
  const ExceptionHandlerService(super.raw);
}

/// Represents filter service.
final class FilterService extends GeneratedNgFilterService {
  /// Creates a filter service.
  const FilterService(super.raw);
}

/// Represents http param serializer service.
final class HttpParamSerializerService
    extends GeneratedNgHttpParamSerializerService {
  /// Creates a http param serializer service.
  const HttpParamSerializerService(super.raw);
}

/// Represents http service.
final class HttpService extends GeneratedNgHttpService {
  /// Creates a http service.
  const HttpService(super.raw);

  /// Sets runtime request defaults.
  set defaults(Object? value) {
    final jsValue =
        value is HttpDefaults ? unsafe.object(value.toMap()) : value;
    unsafe.setProperty(raw, 'defaults', jsValue);
  }

  /// Sets requests currently in flight.
  set pendingRequests(Object? value) {
    unsafe.setProperty(raw, 'pendingRequests', value);
  }
}

/// Represents injector service.
final class InjectorService extends GeneratedNgInjectorService {
  /// Creates a injector service.
  const InjectorService(super.raw);
}

/// Represents interpolate service.
final class InterpolateService extends GeneratedNgInterpolateService {
  /// Creates a interpolate service.
  const InterpolateService(super.raw);
}

/// Represents location service.
final class LocationService extends GeneratedNgLocationService {
  /// Creates a location service.
  const LocationService(super.raw);

  /// Sets path, search, and hash from a URL.
  @override
  LocationService setUrl(String url) {
    unsafe.callMethod(raw, 'setUrl', url.toJS);
    return this;
  }

  /// Sets the URL path.
  @override
  LocationService setPath(Object? path) {
    unsafe.callMethod1(raw, 'setPath', unsafe.dartToJs(path));
    return this;
  }

  /// Sets the hash fragment.
  @override
  LocationService setHash(Object? hash) {
    unsafe.callMethod1(raw, 'setHash', unsafe.dartToJs(hash));
    return this;
  }

  /// Sets URL search parameters.
  @override
  LocationService setSearch(Object? search, [Object? paramValue]) {
    unsafe.callMethod2(
      raw,
      'setSearch',
      unsafe.dartToJs(search),
      unsafe.dartToJs(paramValue),
    );
    return this;
  }

  /// Sets the history state object.
  @override
  LocationService setState(Object? state) {
    unsafe.callMethod1(raw, 'setState', unsafe.dartToJs(state));
    return this;
  }
}

/// Represents log service.
final class LogService extends GeneratedNgLogService {
  /// Creates a log service.
  const LogService(super.raw);
}

/// Represents parse service.
final class ParseService extends GeneratedNgParseService {
  /// Creates a parse service.
  const ParseService(super.raw);
}

/// Represents the event bus service.
final class EventBusService extends GeneratedNgEventBusService {
  /// Creates an event bus service.
  const EventBusService(super.raw);
}

/// Represents rest service facade.
final class RestServiceFacade extends GeneratedNgRestService {
  /// Creates a rest service facade.
  const RestServiceFacade(super.raw);
}

/// Represents sce service.
final class SceService extends GeneratedNgSceService {
  /// Creates a sce service.
  const SceService(super.raw);
}

/// Represents sce delegate service.
final class SceDelegateService extends GeneratedNgSceDelegateService {
  /// Creates a sce delegate service.
  const SceDelegateService(super.raw);
}

/// Represents sse service.
final class SseService extends GeneratedNgSseService {
  /// Creates a sse service.
  const SseService(super.raw);
}

/// Represents stream service.
final class StreamService extends GeneratedNgStreamService {
  /// Creates a stream service.
  const StreamService(super.raw);
}

/// Represents template cache service.
final class TemplateCacheService extends AngularTsJsFacade {
  /// Creates a template cache service.
  const TemplateCacheService(super.raw);

  /// Number of cached templates.
  Object? get size => unsafe.jsToDart<Object?>(unsafe.getProperty(raw, 'size'));

  /// Removes all cached templates.
  void clear() {
    unsafe.callMethod(raw, 'clear');
  }

  /// Deletes a cached template.
  bool delete(String key) {
    final value = unsafe.callMethod(raw, 'delete', key.toJS);
    return (value as JSBoolean).toDart;
  }

  /// Returns cached template entries.
  Object? entries() => unsafe.callMethod(raw, 'entries');

  /// Iterates cached templates.
  Object? forEach(JSFunction callback) {
    return unsafe.callMethod(raw, 'forEach', callback);
  }

  /// Reads a cached template.
  String? get(String key) {
    final value = unsafe.callMethod(raw, 'get', key.toJS);
    return value == null ? null : (value as JSString).toDart;
  }

  /// Returns whether a template exists.
  bool has(String key) {
    final value = unsafe.callMethod(raw, 'has', key.toJS);
    return (value as JSBoolean).toDart;
  }

  /// Returns cached template keys.
  Object? keys() => unsafe.callMethod(raw, 'keys');

  /// Stores a template.
  TemplateCacheService set(String key, String value) {
    unsafe.callMethod(raw, 'set', key.toJS, value.toJS);
    return this;
  }

  /// Returns cached template values.
  Object? values() => unsafe.callMethod(raw, 'values');
}

/// Represents template request service.
final class TemplateRequestService extends GeneratedNgTemplateRequestService {
  /// Creates a template request service.
  const TemplateRequestService(super.raw);
}

/// Represents transition service.
final class TransitionsService extends GeneratedNgTransitionsService {
  /// Creates a transition service.
  const TransitionsService(super.raw);
}

/// Represents web component service.
final class WebComponentService extends GeneratedNgWebComponentService {
  /// Creates a web component service.
  const WebComponentService(super.raw);
}

/// Represents web socket service.
final class WebSocketService extends GeneratedNgWebSocketService {
  /// Creates a web socket service.
  const WebSocketService(super.raw);
}

/// Represents web transport service.
final class WebTransportService extends GeneratedNgWebTransportService {
  /// Creates a web transport service.
  const WebTransportService(super.raw);
}

/// Represents worker service.
final class WorkerService extends GeneratedNgWorkerService {
  /// Creates a worker service.
  const WorkerService(super.raw);
}

/// Options for binding one AngularTS reactive target to a Wasm guest.
final class WasmBindingOptions implements unsafe.JsConvertible {
  /// Creates Wasm binding options.
  const WasmBindingOptions({this.name, this.watch, this.initial});

  /// Stable guest-visible target name.
  final String? name;

  /// Reactive paths delivered to the guest update callback.
  final List<String>? watch;

  /// Delivers the current watched values while binding.
  final bool? initial;

  @override
  JSAny? toJsValue() => unsafe.object({
        if (name != null) 'name': name,
        if (watch != null) 'watch': watch,
        if (initial != null) 'initial': initial,
      });
}

/// Error categories reported by the high-level WebAssembly host.
enum WasmErrorCode {
  /// Module fetch or instantiation failed.
  load('load'),

  /// A reactive target could not be bound.
  binding('binding'),

  /// The requested resource has already been disposed.
  disposed('disposed'),

  /// The guest does not expose the AngularTS reactive ABI.
  unsupportedAbi('unsupported-abi');

  const WasmErrorCode(this.value);

  /// JavaScript string representation.
  final String value;
}

/// Lifecycle state of a WebAssembly resource.
enum WasmResourceStatus {
  /// Fetch or instantiation is in progress.
  loading('loading'),

  /// The module is ready for use.
  ready('ready'),

  /// Loading failed.
  error('error'),

  /// The resource has been released.
  disposed('disposed');

  const WasmResourceStatus(this.value);

  /// JavaScript string representation.
  final String value;
}

/// Options for creating an AngularTS scope wrapper for Wasm clients.
final class WasmScopeOptions implements unsafe.JsConvertible {
  /// Creates wasm scope options.
  const WasmScopeOptions({this.name});

  /// Stable name exposed to Wasm clients.
  final String? name;

  @override
  JSAny? toJsValue() => unsafe.object({
        if (name != null) 'name': name,
      });
}

/// Options for binding an AngularTS scope to Wasm lifecycle callbacks.
final class WasmScopeBindingOptions implements unsafe.JsConvertible {
  /// Creates wasm scope binding options.
  const WasmScopeBindingOptions({this.watch, this.initial});

  /// Scope paths that should emit update callbacks.
  final List<String>? watch;

  /// Emit the current value immediately when registering each watched path.
  final bool? initial;

  @override
  JSAny? toJsValue() => unsafe.object({
        if (watch != null) 'watch': unsafe.JsValue(unsafe.strings(watch!)),
        if (initial != null) 'initial': initial,
      });
}

/// Options for registering one Wasm scope watch.
final class WasmScopeWatchOptions implements unsafe.JsConvertible {
  /// Creates wasm scope watch options.
  const WasmScopeWatchOptions({this.initial});

  /// Emit the current value immediately.
  final bool? initial;

  @override
  JSAny? toJsValue() => unsafe.object({
        if (initial != null) 'initial': initial,
      });
}

/// Scope update delivered from AngularTS to a Wasm callback.
final class WasmScopeUpdate implements unsafe.JsConvertible {
  /// Creates a wasm scope update.
  const WasmScopeUpdate({
    required this.scopeHandle,
    required this.scopeName,
    required this.path,
    required this.value,
  });

  /// Creates a typed update from a raw JavaScript payload.
  factory WasmScopeUpdate.fromJs(JSAny? value) {
    final raw = value as JSObject;
    return WasmScopeUpdate(
      scopeHandle:
          (unsafe.getProperty(raw, 'scopeHandle') as JSNumber).toDartDouble,
      scopeName: (unsafe.getProperty(raw, 'scopeName') as JSString).toDart,
      path: (unsafe.getProperty(raw, 'path') as JSString).toDart,
      value: unsafe.jsToDart<Object?>(unsafe.getProperty(raw, 'value')),
    );
  }

  /// Host-side numeric scope handle.
  final num scopeHandle;

  /// Stable scope name.
  final String scopeName;

  /// Watched path that changed.
  final String path;

  /// Current value read from the scope path.
  final Object? value;

  @override
  JSAny? toJsValue() => unsafe.object({
        'scopeHandle': scopeHandle,
        'scopeName': scopeName,
        'path': path,
        'value': value,
      });
}

/// AngularTS scope wrapper for direct Wasm client access.
final class WasmScope extends AngularTsJsFacade
    implements unsafe.JsConvertible {
  /// Creates a wasm scope wrapper.
  const WasmScope(super.raw);

  @override
  JSAny? toJsValue() => raw;

  /// Host-side numeric scope handle.
  num get handle =>
      (unsafe.getProperty(raw, 'handle') as JSNumber).toDartDouble;

  /// Stable scope name.
  String get name => (unsafe.getProperty(raw, 'name') as JSString).toDart;

  /// Whether this wrapper has been disposed.
  bool get disposed =>
      (unsafe.getProperty(raw, 'disposed') as JSBoolean).toDart;

  /// Reads a value from a scope path.
  Object? getMember(String path) =>
      unsafe.jsToDart<Object?>(unsafe.callMethod(raw, 'get', path.toJS));

  /// Writes a value to a scope path.
  bool setMember(String path, Object? value) => (unsafe.callMethod(
        raw,
        'set',
        path.toJS,
        unsafe.dartToJs(value),
      ) as JSBoolean)
          .toDart;

  /// Deletes a scope path.
  bool delete(String path) =>
      (unsafe.callMethod(raw, 'delete', path.toJS) as JSBoolean).toDart;

  /// Flushes queued callbacks.
  void sync() {
    unsafe.callMethod(raw, 'sync');
  }

  /// Registers a callback for sync flushes.
  Object? onSync(JSFunction callback) =>
      unsafe.jsToDart<Object?>(unsafe.callMethod(raw, 'onSync', callback));

  /// Watches a scope path.
  Object? watch(
    String path,
    void Function(WasmScopeUpdate update) callback, [
    WasmScopeWatchOptions options = const WasmScopeWatchOptions(),
  ]) {
    final callbackJs =
        ((JSAny? update) => callback(WasmScopeUpdate.fromJs(update))).toJS;
    return unsafe.jsToDart<Object?>(
      unsafe.callMethod(
        raw,
        'watch',
        path.toJS,
        callbackJs,
        options.toJsValue(),
      ),
    );
  }

  /// Binds this scope to its ABI's guest callbacks and watched paths.
  Object? bind([
    WasmScopeBindingOptions options = const WasmScopeBindingOptions(),
  ]) {
    return unsafe.jsToDart<Object?>(
      unsafe.callMethod(
        raw,
        'bind',
        options.toJsValue(),
      ),
    );
  }

  /// Disposes this wrapper.
  void dispose() {
    unsafe.callMethod(raw, 'dispose');
  }
}

/// Full import object returned by `WasmScopeAbi.imports`.
final class WasmScopeAbiImportObject extends AngularTsJsFacade {
  /// Creates a wasm scope ABI import object wrapper.
  const WasmScopeAbiImportObject(super.raw);

  /// AngularTS scope ABI import namespace.
  WasmScopeAbiImports get angularTs =>
      WasmScopeAbiImports(unsafe.getProperty(raw, 'angular_ts') as JSObject);
}

/// Imports exposed to a language-neutral Wasm client.
final class WasmScopeAbiImports extends AngularTsJsFacade {
  /// Creates a wasm scope ABI imports wrapper.
  const WasmScopeAbiImports(super.raw);

  num _number(String method, List<num> args) {
    return (unsafe.callMethodVarArgs(
      raw,
      method,
      [for (final arg in args) arg.toJS],
    ) as JSNumber)
        .toDartDouble;
  }

  /// Resolves a scope name to a numeric scope handle.
  num scopeResolve(num namePtr, num nameLen) =>
      _number('scope_resolve', [namePtr, nameLen]);

  /// Returns a result buffer handle containing JSON for a scope path.
  num scopeGet(num scopeHandle, num pathPtr, num pathLen) =>
      _number('scope_get', [scopeHandle, pathPtr, pathLen]);

  /// Writes a JSON payload into a scope path.
  num scopeSet(
    num scopeHandle,
    num pathPtr,
    num pathLen,
    num valuePtr,
    num valueLen,
  ) =>
      _number('scope_set', [
        scopeHandle,
        pathPtr,
        pathLen,
        valuePtr,
        valueLen,
      ]);

  /// Deletes a scope path.
  num scopeDelete(num scopeHandle, num pathPtr, num pathLen) =>
      _number('scope_delete', [scopeHandle, pathPtr, pathLen]);

  /// Runs queued Wasm scope bridge callbacks.
  num scopeSync(num scopeHandle) => _number('scope_sync', [scopeHandle]);

  /// Watches a scope path and returns a watch handle.
  num scopeWatch(num scopeHandle, num pathPtr, num pathLen) =>
      _number('scope_watch', [scopeHandle, pathPtr, pathLen]);

  /// Removes a watch handle.
  num scopeUnwatch(num watchHandle) => _number('scope_unwatch', [watchHandle]);

  /// Unbinds a scope handle without destroying the AngularTS scope.
  num scopeUnbind(num scopeHandle) => _number('scope_unbind', [scopeHandle]);

  /// Returns the guest pointer for a host-owned result buffer.
  num bufferPtr(num bufferHandle) => _number('buffer_ptr', [bufferHandle]);

  /// Returns the byte length for a host-owned result buffer.
  num bufferLen(num bufferHandle) => _number('buffer_len', [bufferHandle]);

  /// Releases a host-owned result buffer and guest-memory allocation.
  void bufferFree(num bufferHandle) {
    unsafe.callMethod(raw, 'buffer_free', bufferHandle.toJS);
  }
}

/// Language-neutral host ABI for AngularTS scope handles.
final class WasmScopeAbi extends AngularTsJsFacade
    implements unsafe.JsConvertible {
  /// Creates a wasm scope ABI wrapper.
  const WasmScopeAbi(super.raw);

  @override
  JSAny? toJsValue() => raw;

  /// Full import object to pass to WebAssembly instantiation.
  WasmScopeAbiImportObject get imports =>
      WasmScopeAbiImportObject(unsafe.getProperty(raw, 'imports') as JSObject);

  /// Whether this ABI and all of its bindings have been disposed.
  bool get disposed =>
      (unsafe.getProperty(raw, 'disposed') as JSBoolean).toDart;

  /// Attaches guest exports to this ABI.
  void attach(Object? exports) {
    unsafe.callMethod(raw, 'attach', unsafe.dartToJs(exports));
  }

  /// Creates a scope wrapper owned by this ABI registry.
  WasmScope createScope(
    Scope<Object?> scope, [
    WasmScopeOptions options = const WasmScopeOptions(),
  ]) {
    return WasmScope(
      unsafe.callMethod(
        raw,
        'createScope',
        scope.raw,
        options.toJsValue(),
      ) as JSObject,
    );
  }

  /// Returns a scope wrapper by handle or name.
  WasmScope? getScope(Object reference) {
    final value =
        unsafe.callMethod(raw, 'getScope', unsafe.dartToJs(reference));
    return value == null ? null : WasmScope(value as JSObject);
  }

  /// Releases every scope, watch, and result buffer owned by this ABI.
  void dispose() {
    unsafe.callMethod(raw, 'dispose');
  }
}

/// Structured WebAssembly load or binding error.
final class WasmError extends GeneratedNgWasmError {
  /// Creates a Wasm error facade.
  const WasmError(super.raw);

  /// Stable error category.
  WasmErrorCode get code => _wasmErrorCode(
        (unsafe.getProperty(raw, 'code') as JSString).toDart,
      );

  /// Human-readable failure message.
  String get message => (unsafe.getProperty(raw, 'message') as JSString).toDart;

  /// Module source associated with the failure.
  JSAny? get source => unsafe.getProperty(raw, 'source');
}

/// Active connection between one AngularTS target and a Wasm guest.
final class WasmBinding<TState> extends GeneratedNgWasmBinding {
  /// Creates a Wasm binding facade.
  const WasmBinding(super.raw);

  /// Stable guest-visible target name.
  String get name => (unsafe.getProperty(raw, 'name') as JSString).toDart;

  /// AngularTS scope or app model connected to the guest.
  Scope<TState> get target => Scope<TState>.unsafe(
        unsafe.getProperty(raw, 'target') as JSObject,
      );

  /// Whether this binding has been released.
  bool get disposed =>
      (unsafe.getProperty(raw, 'disposed') as JSBoolean).toDart;

  /// Releases this binding without destroying its AngularTS target.
  void dispose() {
    unsafe.callMethod(raw, 'dispose');
  }
}

/// Loaded WebAssembly module with owned bindings and lifecycle.
final class WasmResource extends GeneratedNgWasmResource {
  /// Creates a Wasm resource facade.
  const WasmResource(super.raw);

  /// Module source.
  JSAny? get source => unsafe.getProperty(raw, 'source');

  /// Current resource lifecycle state.
  WasmResourceStatus get status => _wasmResourceStatus(
        (unsafe.getProperty(raw, 'status') as JSString).toDart,
      );

  /// Resolves when fetch and instantiation finish.
  Future<WasmResource> get ready async {
    await (unsafe.getProperty(raw, 'ready') as JSPromise<JSAny?>).toDart;
    return this;
  }

  /// Structured load failure, when present.
  WasmError? get error {
    final value = unsafe.getProperty(raw, 'error');
    return value == null ? null : WasmError(value as JSObject);
  }

  /// Native WebAssembly instance after readiness.
  JSAny? get instance => unsafe.getProperty(raw, 'instance');

  /// Compiled WebAssembly module after readiness.
  JSAny? get module => unsafe.getProperty(raw, 'module');

  /// Guest exports after readiness.
  JSAny? get exports => unsafe.getProperty(raw, 'exports');

  /// Whether this resource has been released.
  bool get disposed =>
      (unsafe.getProperty(raw, 'disposed') as JSBoolean).toDart;

  /// Binds an AngularTS scope or model to the guest ABI.
  Future<WasmBinding<TState>> bind<TState>(
    Scope<TState> target, [
    WasmBindingOptions options = const WasmBindingOptions(),
  ]) async {
    final promise = unsafe.callMethod(
      raw,
      'bind',
      target.raw,
      options.toJsValue(),
    ) as JSPromise<JSAny?>;
    final binding = await promise.toDart;
    return WasmBinding<TState>(binding as JSObject);
  }

  /// Releases this module and all of its bindings.
  void dispose() {
    unsafe.callMethod(raw, 'dispose');
  }
}

/// High-level WebAssembly host service.
final class WasmService extends GeneratedNgWasmService {
  /// Creates a Wasm service.
  const WasmService(super.raw);

  /// Loads a module and immediately returns its stable resource.
  WasmResource load(WasmLoadOptions options) => WasmResource(
        unsafe.callMethod(raw, 'load', options.toJsValue()) as JSObject,
      );
}

WasmErrorCode _wasmErrorCode(String value) => switch (value) {
      'load' => WasmErrorCode.load,
      'binding' => WasmErrorCode.binding,
      'disposed' => WasmErrorCode.disposed,
      'unsupported-abi' => WasmErrorCode.unsupportedAbi,
      _ => throw StateError('Unknown AngularTS Wasm error code: $value'),
    };

WasmResourceStatus _wasmResourceStatus(String value) => switch (value) {
      'loading' => WasmResourceStatus.loading,
      'ready' => WasmResourceStatus.ready,
      'error' => WasmResourceStatus.error,
      'disposed' => WasmResourceStatus.disposed,
      _ => throw StateError('Unknown AngularTS Wasm resource status: $value'),
    };

/// Creates a typed JavaScript facade from a raw runtime value.
T facade<T extends AngularTsJsFacade>(
  JSAny? value,
  T Function(JSObject raw) create,
) {
  return create(value as JSObject);
}
