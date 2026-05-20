import 'dart:js_interop';

import 'cookie.dart';
import 'facade.dart';
import 'generated/ng_facades.dart';
import 'http.dart';
import 'unsafe.dart' as unsafe;

/// Represents angular service.
final class AngularService extends GeneratedNgAngularService {
  /// Creates a angular service.
  const AngularService(super.raw);
}

/// Represents anchor scroll provider.
final class AnchorScrollProvider extends GeneratedNgAnchorScrollProvider {
  /// Creates a anchor scroll provider.
  const AnchorScrollProvider(super.raw);
}

/// Represents anchor scroll service.
final class AnchorScrollService extends GeneratedNgAnchorScrollService {
  /// Creates a anchor scroll service.
  const AnchorScrollService(super.raw);

  set yOffset(Object? value) {
    unsafe.setProperty(raw, 'yOffset', value);
  }
}

/// Represents animate provider.
final class AnimateProvider extends GeneratedNgAnimateProvider {
  /// Creates a animate provider.
  const AnimateProvider(super.raw);
}

/// Represents animate service.
final class AnimateService extends GeneratedNgAnimateService {
  /// Creates a animate service.
  const AnimateService(super.raw);
}

/// Represents angular service provider.
final class AngularServiceProvider extends GeneratedNgAngularServiceProvider {
  /// Creates a angular service provider.
  const AngularServiceProvider(super.raw);
}

/// Represents aria service.
final class AriaService extends GeneratedNgAriaService {
  /// Creates a aria service.
  const AriaService(super.raw);
}

/// Represents aria provider.
final class AriaProvider extends AngularTsJsFacade {
  /// Creates a aria provider.
  const AriaProvider(super.raw);
}

/// Represents compile provider.
final class CompileProvider extends AngularTsJsFacade {
  /// Creates a compile provider.
  const CompileProvider(super.raw);
}

/// Represents compile service.
final class CompileService extends GeneratedNgCompileService {
  /// Creates a compile service.
  const CompileService(super.raw);
}

/// Represents controller provider.
final class ControllerProvider extends AngularTsJsFacade {
  /// Creates a controller provider.
  const ControllerProvider(super.raw);
}

/// Represents controller service.
final class ControllerService extends GeneratedNgControllerService {
  /// Creates a controller service.
  const ControllerService(super.raw);
}

/// Represents cookie provider.
final class CookieProvider extends AngularTsJsFacade {
  /// Creates a cookie provider.
  const CookieProvider(super.raw);

  /// Default cookie attributes merged into writes and removals.
  Object? get defaults {
    return unsafe.jsToDart<Object?>(unsafe.getProperty(raw, 'defaults'));
  }

  set defaults(Object? value) {
    final jsValue =
        value is CookieOptions ? unsafe.object(value.toMap()) : value;
    unsafe.setProperty(raw, 'defaults', jsValue);
  }

  /// The runtime service factory.
  Object? get $get =>
      unsafe.jsToDart<Object?>(unsafe.getProperty(raw, r'$get'));
}

/// Represents cookie service.
final class CookieService extends GeneratedNgCookieService {
  /// Creates a cookie service.
  const CookieService(super.raw);
}

/// Represents event bus provider.
final class EventBusProvider extends AngularTsJsFacade {
  /// Creates a event bus provider.
  const EventBusProvider(super.raw);
}

/// Represents exception handler provider.
final class ExceptionHandlerProvider
    extends GeneratedNgExceptionHandlerProvider {
  /// Creates a exception handler provider.
  const ExceptionHandlerProvider(super.raw);

  set handler(Object? value) {
    unsafe.setProperty(raw, 'handler', value);
  }
}

/// Represents exception handler service.
final class ExceptionHandlerService extends GeneratedNgExceptionHandlerService {
  /// Creates a exception handler service.
  const ExceptionHandlerService(super.raw);
}

/// Represents filter provider.
final class FilterProvider extends GeneratedNgFilterProvider {
  /// Creates a filter provider.
  const FilterProvider(super.raw);
}

/// Represents filter service.
final class FilterService extends GeneratedNgFilterService {
  /// Creates a filter service.
  const FilterService(super.raw);
}

/// Represents http provider.
final class HttpProvider extends AngularTsJsFacade {
  /// Creates a http provider.
  const HttpProvider(super.raw);
}

/// Represents http param serializer provider.
final class HttpParamSerializerProvider
    extends GeneratedNgHttpParamSerializerProvider {
  /// Creates a http param serializer provider.
  const HttpParamSerializerProvider(super.raw);
}

/// Represents http param serializer service.
final class HttpParamSerializerService
    extends GeneratedNgHttpParamSerializerSerService {
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
        value is HttpProviderDefaults ? unsafe.object(value.toMap()) : value;
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

/// Represents interpolate provider.
final class InterpolateProvider extends GeneratedNgInterpolateProvider {
  /// Creates a interpolate provider.
  const InterpolateProvider(super.raw);
}

/// Represents interpolate service.
final class InterpolateService extends GeneratedNgInterpolateService {
  /// Creates a interpolate service.
  const InterpolateService(super.raw);
}

/// Represents location provider.
final class LocationProvider extends GeneratedNgLocationProvider {
  /// Creates a location provider.
  const LocationProvider(super.raw);

  /// Sets the last cached browser history state.
  set lastCachedState(Object? value) {
    unsafe.setProperty(raw, 'lastCachedState', value);
  }

  /// Sets the HTML5 location mode configuration.
  set html5ModeConf(Object? value) {
    final jsValue =
        value is Map<String, Object?> ? unsafe.object(value) : value;
    unsafe.setProperty(raw, 'html5ModeConf', jsValue);
  }

  /// Updates the browser URL and history state.
  @override
  LocationProvider setUrl(String? url, [Object? state]) {
    unsafe.callMethod2(
      raw,
      'setUrl',
      url?.toJS,
      unsafe.dartToJs(state),
    );
    return this;
  }
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

/// Represents log provider.
final class LogProvider extends AngularTsJsFacade {
  /// Creates a log provider.
  const LogProvider(super.raw);
}

/// Represents log service.
final class LogService extends GeneratedNgLogService {
  /// Creates a log service.
  const LogService(super.raw);
}

/// Represents parse provider.
final class ParseProvider extends AngularTsJsFacade {
  /// Creates a parse provider.
  const ParseProvider(super.raw);
}

/// Represents parse service.
final class ParseService extends GeneratedNgParseService {
  /// Creates a parse service.
  const ParseService(super.raw);
}

/// Represents provide service.
final class ProvideService extends GeneratedNgProvideService {
  /// Creates a provide service.
  const ProvideService(super.raw);
}

/// Represents pub sub provider.
final class PubSubProvider extends GeneratedNgPubSubProvider {
  /// Creates a pub sub provider.
  const PubSubProvider(super.raw);

  /// The singleton event bus.
  @override
  PubSubService get eventBus {
    final value = unsafe.getProperty(raw, 'eventBus');
    return PubSubService(value as JSObject);
  }

  set eventBus(PubSubService value) {
    unsafe.setProperty(raw, 'eventBus', value.raw);
  }
}

/// Represents pub sub service.
final class PubSubService extends GeneratedNgPubSubService {
  /// Creates a pub sub service.
  const PubSubService(super.raw);
}

/// Represents rest provider.
final class RestProvider extends AngularTsJsFacade {
  /// Creates a rest provider.
  const RestProvider(super.raw);
}

/// Represents rest service facade.
final class RestServiceFacade extends GeneratedNgRestService {
  /// Creates a rest service facade.
  const RestServiceFacade(super.raw);
}

/// Represents root scope provider.
final class RootScopeProvider extends AngularTsJsFacade {
  /// Creates a root scope provider.
  const RootScopeProvider(super.raw);
}

/// Represents sce provider.
final class SceProvider extends GeneratedNgSceProvider {
  /// Creates a sce provider.
  const SceProvider(super.raw);
}

/// Represents sce delegate provider.
final class SceDelegateProvider extends GeneratedNgSceDelegateProvider {
  /// Creates a sce delegate provider.
  const SceDelegateProvider(super.raw);
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

/// Represents sse provider.
final class SseProvider extends AngularTsJsFacade {
  /// Creates a sse provider.
  const SseProvider(super.raw);
}

/// Represents sse service.
final class SseService extends GeneratedNgSseService {
  /// Creates a sse service.
  const SseService(super.raw);
}

/// Represents state provider.
final class StateProvider extends AngularTsJsFacade {
  /// Creates a state provider.
  const StateProvider(super.raw);
}

/// Represents state registry provider.
final class StateRegistryProvider extends AngularTsJsFacade {
  /// Creates a state registry provider.
  const StateRegistryProvider(super.raw);

  /// The runtime service factory.
  Object? get $get =>
      unsafe.jsToDart<Object?>(unsafe.getProperty(raw, r'$get'));

  /// Registers the implicit root state.
  void registerRoot() {
    unsafe.callMethod(raw, 'registerRoot');
  }

  /// Registers a state-registry listener.
  Object? onStatesChanged(Object? listener) {
    return unsafe.callMethod1(
      raw,
      'onStatesChanged',
      unsafe.dartToJs(listener),
    );
  }

  /// Returns the implicit root state.
  Object? root() {
    return unsafe.callMethod(raw, 'root');
  }

  /// Registers a state declaration.
  Object? register(Object? stateDefinition) {
    return unsafe.callMethod1(
      raw,
      'register',
      unsafe.dartToJs(stateDefinition),
    );
  }

  /// Deregisters a state.
  Object? deregister(Object? stateOrName) {
    return unsafe.callMethod1(
      raw,
      'deregister',
      unsafe.dartToJs(stateOrName),
    );
  }

  /// Returns all registered states.
  Object? getAll() {
    return unsafe.callMethod(raw, 'getAll');
  }

  /// Gets one state, all states, or a state relative to a base state.
  Object? get([Object? stateOrName, Object? base]) {
    return stateOrName == null && base == null
        ? unsafe.callMethod(raw, 'get')
        : unsafe.callMethod2(
            raw,
            'get',
            unsafe.dartToJs(stateOrName),
            unsafe.dartToJs(base),
          );
  }
}

/// Represents state service.
final class StateService extends GeneratedNgStateService {
  /// Creates a state service.
  const StateService(super.raw);
}

/// Represents state registry service.
final class StateRegistryService extends GeneratedNgStateRegistryService {
  /// Creates a state registry service.
  const StateRegistryService(super.raw);
}

/// Represents stream service.
final class StreamService extends GeneratedNgStreamService {
  /// Creates a stream service.
  const StreamService(super.raw);
}

/// Represents template cache provider.
final class TemplateCacheProvider extends AngularTsJsFacade {
  /// Creates a template cache provider.
  const TemplateCacheProvider(super.raw);

  /// The backing cache.
  TemplateCacheService get cache {
    final value = unsafe.getProperty(raw, 'cache');
    return TemplateCacheService(value as JSObject);
  }

  set cache(TemplateCacheService value) {
    unsafe.setProperty(raw, 'cache', value.raw);
  }

  /// The runtime service factory.
  TemplateCacheService $get() {
    final value = unsafe.callMethod(raw, r'$get');
    return TemplateCacheService(value as JSObject);
  }
}

/// Represents template factory provider.
final class TemplateFactoryProvider extends AngularTsJsFacade {
  /// Creates a template factory provider.
  const TemplateFactoryProvider(super.raw);
}

/// Represents template request provider.
final class TemplateRequestProvider extends AngularTsJsFacade {
  /// Creates a template request provider.
  const TemplateRequestProvider(super.raw);
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
final class TransitionService extends GeneratedNgTransitionService {
  /// Creates a transition service.
  const TransitionService(super.raw);
}

/// Represents transitions provider.
final class TransitionsProvider extends AngularTsJsFacade {
  /// Creates a transitions provider.
  const TransitionsProvider(super.raw);
}

/// Represents view provider.
final class ViewProvider extends AngularTsJsFacade {
  /// Creates a view provider.
  const ViewProvider(super.raw);
}

/// Represents view service.
final class ViewService extends AngularTsJsFacade {
  /// Creates a view service.
  const ViewService(super.raw);
}

/// Represents web component service.
final class WebComponentService extends GeneratedNgWebComponentService {
  /// Creates a web component service.
  const WebComponentService(super.raw);
}

/// Represents web socket provider.
final class WebSocketProvider extends AngularTsJsFacade {
  /// Creates a web socket provider.
  const WebSocketProvider(super.raw);
}

/// Represents web socket service.
final class WebSocketService extends GeneratedNgWebSocketService {
  /// Creates a web socket service.
  const WebSocketService(super.raw);
}

/// Represents web transport provider.
final class WebTransportProvider extends AngularTsJsFacade {
  /// Creates a web transport provider.
  const WebTransportProvider(super.raw);
}

/// Represents web transport service.
final class WebTransportService extends GeneratedNgWebTransportService {
  /// Creates a web transport service.
  const WebTransportService(super.raw);
}

/// Represents worker provider.
final class WorkerProvider extends AngularTsJsFacade {
  /// Creates a worker provider.
  const WorkerProvider(super.raw);
}

/// Represents worker service.
final class WorkerService extends AngularTsJsFacade {
  /// Creates a worker service.
  const WorkerService(super.raw);
}

/// Represents wasm provider.
final class WasmProvider extends AngularTsJsFacade {
  /// Creates a wasm provider.
  const WasmProvider(super.raw);
}

/// Represents wasm service.
final class WasmService extends GeneratedNgWasmService {
  /// Creates a wasm service.
  const WasmService(super.raw);
}

/// Creates a typed JavaScript facade from a raw runtime value.
T facade<T extends AngularTsJsFacade>(
  JSAny? value,
  T Function(JSObject raw) create,
) {
  return create(value as JSObject);
}
