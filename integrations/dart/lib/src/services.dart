import 'dart:js_interop';

import 'package:web/web.dart';

import 'animation.dart' show AnimationPreset, NativeAnimationOptions;
import 'cookie.dart';
import 'facade.dart';
import 'generated/ng_facades.dart';
import 'http.dart';
import 'injectable.dart';
import 'module_options.dart' show StateDeclaration;
import 'scope.dart';
import 'unsafe.dart' as unsafe;
import 'web_component.dart' show ElementScopeOptions, WebComponent;

const Object _undefinedArgument = Object();

JSAny? _providerArgument(Object? value) {
  if (value is InjectableFactory<Object?>) return value.toAnnotatedArray();
  return unsafe.dartToJs(value);
}

JSAny? _stateArgument(Object? value) {
  if (value is StateDeclaration) return value.toJsObject();
  return unsafe.dartToJs(value);
}

JSAny? _plainOptions(Object? value) {
  if (value is Map<String, Object?>) return unsafe.object(value);
  return unsafe.dartToJs(value);
}

JSAny? _animationOptionsArgument(Object? value) {
  if (value is AnimationPreset) return _animationPreset(value);
  if (value is NativeAnimationOptions) return _nativeAnimationOptions(value);
  return unsafe.dartToJs(value);
}

JSObject _nativeAnimationOptions(NativeAnimationOptions options) {
  return unsafe.object({
    if (options.animation != null) 'animation': options.animation,
    if (options.keyframes != null)
      'keyframes': unsafe.JsValue(options.keyframes),
    if (options.enter != null) 'enter': unsafe.JsValue(options.enter),
    if (options.leave != null) 'leave': unsafe.JsValue(options.leave),
    if (options.move != null) 'move': unsafe.JsValue(options.move),
    if (options.addClass != null) 'addClass': options.addClass,
    if (options.removeClass != null) 'removeClass': options.removeClass,
    if (options.from != null) 'from': options.from,
    if (options.to != null) 'to': options.to,
    if (options.tempClasses != null) 'tempClasses': options.tempClasses,
    if (options.composite != null) 'composite': options.composite,
    if (options.delay != null) 'delay': options.delay,
    if (options.direction != null) 'direction': options.direction,
    if (options.duration != null) 'duration': options.duration,
    if (options.easing != null) 'easing': options.easing,
    if (options.endDelay != null) 'endDelay': options.endDelay,
    if (options.fill != null) 'fill': options.fill,
    if (options.id != null) 'id': options.id,
    if (options.iterationComposite != null)
      'iterationComposite': options.iterationComposite,
    if (options.iterationStart != null)
      'iterationStart': options.iterationStart,
    if (options.iterations != null) 'iterations': options.iterations,
    if (options.playbackRate != null) 'playbackRate': options.playbackRate,
    if (options.pseudoElement != null) 'pseudoElement': options.pseudoElement,
    if (options.timeline != null) 'timeline': options.timeline,
  });
}

JSObject _animationPreset(AnimationPreset preset) {
  return unsafe.object({
    if (preset.enter != null) 'enter': preset.enter,
    if (preset.leave != null) 'leave': preset.leave,
    if (preset.move != null) 'move': preset.move,
    if (preset.addClass != null) 'addClass': preset.addClass,
    if (preset.removeClass != null) 'removeClass': preset.removeClass,
    if (preset.setClass != null) 'setClass': preset.setClass,
    if (preset.animate != null) 'animate': preset.animate,
    if (preset.options != null)
      'options': unsafe.JsValue(_nativeAnimationOptions(preset.options!)),
  });
}

/// Represents angular service.
final class AngularService extends GeneratedNgAngularService {
  /// Creates a angular service.
  const AngularService(super.raw);
}

/// Represents attributes.
final class Attributes extends GeneratedNgAttributes {
  /// Creates a attributes.
  const Attributes(super.raw);

  /// Observes an attribute value.
  Object? $observe(String key, Object? Function(Object? value) fn) {
    return unsafe.callMethod(
      raw,
      r'$observe',
      key.toJS,
      ((JSAny? value) {
        return unsafe.dartToJs(fn(unsafe.jsToDart<Object?>(value)));
      }).toJS,
    );
  }
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

  /// Registers a named animation preset.
  void register(String name, Object? preset) {
    unsafe.callMethod2(raw, 'register', name.toJS, _providerArgument(preset));
  }
}

/// Represents animate service.
final class AnimateService extends GeneratedNgAnimateService {
  /// Creates a animate service.
  const AnimateService(super.raw);

  /// Defines a named animation preset.
  void define(String name, Object? preset) {
    unsafe.callMethod2(
        raw, 'define', name.toJS, _animationOptionsArgument(preset));
  }

  /// Runs an enter animation.
  Object? enter(
    Element element, [
    Object? parent = _undefinedArgument,
    Object? after = _undefinedArgument,
    NativeAnimationOptions? options,
  ]) {
    if (parent == _undefinedArgument) {
      return unsafe.callMethod1(raw, 'enter', unsafe.dartToJs(element));
    }

    if (after == _undefinedArgument) {
      return unsafe.callMethod2(
        raw,
        'enter',
        unsafe.dartToJs(element),
        unsafe.dartToJs(parent),
      );
    }

    return options == null
        ? unsafe.callMethod3(
            raw,
            'enter',
            unsafe.dartToJs(element),
            unsafe.dartToJs(parent),
            unsafe.dartToJs(after),
          )
        : unsafe.callMethod4(
            raw,
            'enter',
            unsafe.dartToJs(element),
            unsafe.dartToJs(parent),
            unsafe.dartToJs(after),
            _animationOptionsArgument(options),
          );
  }

  /// Runs a move animation.
  Object? move(
    Element element,
    Object? parent, [
    Object? after = _undefinedArgument,
    NativeAnimationOptions? options,
  ]) {
    if (after == _undefinedArgument) {
      return unsafe.callMethod2(
        raw,
        'move',
        unsafe.dartToJs(element),
        unsafe.dartToJs(parent),
      );
    }

    return options == null
        ? unsafe.callMethod3(
            raw,
            'move',
            unsafe.dartToJs(element),
            unsafe.dartToJs(parent),
            unsafe.dartToJs(after),
          )
        : unsafe.callMethod4(
            raw,
            'move',
            unsafe.dartToJs(element),
            unsafe.dartToJs(parent),
            unsafe.dartToJs(after),
            _animationOptionsArgument(options),
          );
  }

  /// Runs a leave animation.
  Object? leave(Element element, [NativeAnimationOptions? options]) {
    return options == null
        ? unsafe.callMethod1(raw, 'leave', unsafe.dartToJs(element))
        : unsafe.callMethod2(
            raw,
            'leave',
            unsafe.dartToJs(element),
            _animationOptionsArgument(options),
          );
  }

  /// Adds a CSS class with animation support.
  Object? addClass(
    Element element,
    String className, [
    NativeAnimationOptions? options,
  ]) {
    return options == null
        ? unsafe.callMethod2(
            raw,
            'addClass',
            unsafe.dartToJs(element),
            className.toJS,
          )
        : unsafe.callMethod3(
            raw,
            'addClass',
            unsafe.dartToJs(element),
            className.toJS,
            _animationOptionsArgument(options),
          );
  }

  /// Removes a CSS class with animation support.
  Object? removeClass(
    Element element,
    String className, [
    NativeAnimationOptions? options,
  ]) {
    return options == null
        ? unsafe.callMethod2(
            raw,
            'removeClass',
            unsafe.dartToJs(element),
            className.toJS,
          )
        : unsafe.callMethod3(
            raw,
            'removeClass',
            unsafe.dartToJs(element),
            className.toJS,
            _animationOptionsArgument(options),
          );
  }

  /// Adds and removes CSS classes with animation support.
  Object? setClass(
    Element element,
    String add,
    String remove, [
    NativeAnimationOptions? options,
  ]) {
    return options == null
        ? unsafe.callMethod3(
            raw,
            'setClass',
            unsafe.dartToJs(element),
            add.toJS,
            remove.toJS,
          )
        : unsafe.callMethod4(
            raw,
            'setClass',
            unsafe.dartToJs(element),
            add.toJS,
            remove.toJS,
            _animationOptionsArgument(options),
          );
  }

  /// Runs a low-level style animation.
  Object? animate(
    Element element,
    Object? from, [
    Object? to = _undefinedArgument,
    Object? className = _undefinedArgument,
    NativeAnimationOptions? options,
  ]) {
    final fromValue = from is Map<String, Object?>
        ? unsafe.object(from)
        : unsafe.dartToJs(from);

    if (to == _undefinedArgument) {
      return unsafe.callMethod2(
          raw, 'animate', unsafe.dartToJs(element), fromValue);
    }

    final toValue =
        to is Map<String, Object?> ? unsafe.object(to) : unsafe.dartToJs(to);

    if (className == _undefinedArgument) {
      return unsafe.callMethod3(
        raw,
        'animate',
        unsafe.dartToJs(element),
        fromValue,
        toValue,
      );
    }

    final classNameValue =
        className is String ? className.toJS : unsafe.dartToJs(className);

    return options == null
        ? unsafe.callMethod4(
            raw,
            'animate',
            unsafe.dartToJs(element),
            fromValue,
            toValue,
            classNameValue,
          )
        : unsafe.callMethod5(
            raw,
            'animate',
            unsafe.dartToJs(element),
            fromValue,
            toValue,
            classNameValue,
            _animationOptionsArgument(options),
          );
  }
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

  /// Writes a raw cookie value.
  void put(String key, String value, [CookieOptions? options]) {
    unsafe.callMethod(
      raw,
      'put',
      key.toJS,
      value.toJS,
      options == null ? null : unsafe.object(options.toMap()),
    );
  }

  /// Serializes and writes a cookie value.
  void putObject(String key, Object? value, [CookieOptions? options]) {
    unsafe.callMethod(
      raw,
      'putObject',
      key.toJS,
      unsafe.dartToJs(value),
      options == null ? null : unsafe.object(options.toMap()),
    );
  }

  /// Removes a cookie.
  void remove(String key, [CookieOptions? options]) {
    unsafe.callMethod(
      raw,
      'remove',
      key.toJS,
      options == null ? null : unsafe.object(options.toMap()),
    );
  }
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

  /// Registers a named filter factory.
  FilterProvider register(String name, Object? factory) {
    unsafe.callMethod2(raw, 'register', name.toJS, _providerArgument(factory));
    return this;
  }
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

  /// Sends a GET request.
  Object? get(String url, [RequestShortcutConfig? config]) {
    return config == null
        ? unsafe.callMethod1(raw, 'get', url.toJS)
        : unsafe.callMethod2(
            raw,
            'get',
            url.toJS,
            unsafe.object(config.toMap()),
          );
  }

  /// Sends a DELETE request.
  Object? delete(String url, [RequestShortcutConfig? config]) {
    return config == null
        ? unsafe.callMethod1(raw, 'delete', url.toJS)
        : unsafe.callMethod2(
            raw,
            'delete',
            url.toJS,
            unsafe.object(config.toMap()),
          );
  }

  /// Sends a HEAD request.
  Object? head(String url, [RequestShortcutConfig? config]) {
    return config == null
        ? unsafe.callMethod1(raw, 'head', url.toJS)
        : unsafe.callMethod2(
            raw,
            'head',
            url.toJS,
            unsafe.object(config.toMap()),
          );
  }

  /// Sends a POST request.
  Object? post(String url, Object? data, [RequestShortcutConfig? config]) {
    return config == null
        ? unsafe.callMethod2(raw, 'post', url.toJS, unsafe.dartToJs(data))
        : unsafe.callMethod3(
            raw,
            'post',
            url.toJS,
            unsafe.dartToJs(data),
            unsafe.object(config.toMap()),
          );
  }

  /// Sends a PUT request.
  Object? put(String url, Object? data, [RequestShortcutConfig? config]) {
    return config == null
        ? unsafe.callMethod2(raw, 'put', url.toJS, unsafe.dartToJs(data))
        : unsafe.callMethod3(
            raw,
            'put',
            url.toJS,
            unsafe.dartToJs(data),
            unsafe.object(config.toMap()),
          );
  }

  /// Sends a PATCH request.
  Object? patch(String url, Object? data, [RequestShortcutConfig? config]) {
    return config == null
        ? unsafe.callMethod2(raw, 'patch', url.toJS, unsafe.dartToJs(data))
        : unsafe.callMethod3(
            raw,
            'patch',
            url.toJS,
            unsafe.dartToJs(data),
            unsafe.object(config.toMap()),
          );
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

  /// Registers a provider.
  ProvideService provider(String name, Object? provider) {
    unsafe.callMethod2(raw, 'provider', name.toJS, _providerArgument(provider));
    return this;
  }

  /// Registers a factory function.
  ProvideService factory(String name, Object? factoryFn) {
    unsafe.callMethod2(raw, 'factory', name.toJS, _providerArgument(factoryFn));
    return this;
  }

  /// Registers a service constructor.
  ProvideService service(String name, Object? constructor) {
    unsafe.callMethod2(
      raw,
      'service',
      name.toJS,
      _providerArgument(constructor),
    );
    return this;
  }

  /// Registers a fixed value.
  ProvideService value(String name, Object? value) {
    unsafe.callMethod2(raw, 'value', name.toJS, unsafe.dartToJs(value));
    return this;
  }

  /// Registers a constant value.
  ProvideService constant(String name, Object? value) {
    unsafe.callMethod2(raw, 'constant', name.toJS, unsafe.dartToJs(value));
    return this;
  }

  /// Registers a decorator function.
  ProvideService decorator(String name, Object? fn) {
    unsafe.callMethod2(raw, 'decorator', name.toJS, _providerArgument(fn));
    return this;
  }

  /// Registers a directive factory.
  ProvideService directive(String name, Object? directive) {
    unsafe.callMethod2(
      raw,
      'directive',
      name.toJS,
      _providerArgument(directive),
    );
    return this;
  }
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

  /// Registers a state declaration.
  StateService state(Object? nameOrDefinition,
      [Object? definition = _undefinedArgument]) {
    if (definition == _undefinedArgument) {
      unsafe.callMethod1(raw, 'state', _stateArgument(nameOrDefinition));
    } else {
      unsafe.callMethod2(
        raw,
        'state',
        unsafe.dartToJs(nameOrDefinition),
        _stateArgument(definition),
      );
    }

    return this;
  }

  /// Registers a lazy state namespace.
  StateService lazy(String prefix, Object? loader) {
    unsafe.callMethod2(raw, 'lazy', prefix.toJS, unsafe.dartToJs(loader));

    return this;
  }

  /// Reloads the current state or a partial state hierarchy.
  Object? reload([Object? reloadState = _undefinedArgument]) {
    return reloadState == _undefinedArgument
        ? unsafe.callMethod(raw, 'reload')
        : unsafe.callMethod1(raw, 'reload', _stateArgument(reloadState));
  }

  /// Transitions to a different state and/or parameters.
  Object? go(
    Object? to, [
    Object? params = _undefinedArgument,
    Object? options = _undefinedArgument,
  ]) {
    if (params == _undefinedArgument) {
      return unsafe.callMethod1(raw, 'go', _stateArgument(to));
    }

    if (options == _undefinedArgument) {
      return unsafe.callMethod2(
          raw, 'go', _stateArgument(to), unsafe.dartToJs(params));
    }

    return unsafe.callMethod3(raw, 'go', _stateArgument(to),
        unsafe.dartToJs(params), unsafe.dartToJs(options));
  }

  /// Creates a target state.
  Object? target(
    Object? identifier, [
    Object? params = _undefinedArgument,
    Object? options = _undefinedArgument,
  ]) {
    if (params == _undefinedArgument) {
      return unsafe.callMethod1(raw, 'target', _stateArgument(identifier));
    }

    if (options == _undefinedArgument) {
      return unsafe.callMethod2(
        raw,
        'target',
        _stateArgument(identifier),
        unsafe.dartToJs(params),
      );
    }

    return unsafe.callMethod3(
      raw,
      'target',
      _stateArgument(identifier),
      unsafe.dartToJs(params),
      unsafe.dartToJs(options),
    );
  }

  /// Low-level transition API.
  Object? transitionTo(
    Object? to, [
    Object? toParams = _undefinedArgument,
    Object? options = _undefinedArgument,
  ]) {
    if (toParams == _undefinedArgument) {
      return unsafe.callMethod1(raw, 'transitionTo', _stateArgument(to));
    }

    if (options == _undefinedArgument) {
      return unsafe.callMethod2(
        raw,
        'transitionTo',
        _stateArgument(to),
        unsafe.dartToJs(toParams),
      );
    }

    return unsafe.callMethod3(
      raw,
      'transitionTo',
      _stateArgument(to),
      unsafe.dartToJs(toParams),
      unsafe.dartToJs(options),
    );
  }

  /// Checks whether the current state exactly matches a state.
  bool? isState(
    Object? stateOrName, [
    Object? params = _undefinedArgument,
    Object? options = _undefinedArgument,
  ]) {
    final value = params == _undefinedArgument
        ? unsafe.callMethod1(raw, 'is', _stateArgument(stateOrName))
        : options == _undefinedArgument
            ? unsafe.callMethod2(
                raw,
                'is',
                _stateArgument(stateOrName),
                unsafe.dartToJs(params),
              )
            : unsafe.callMethod3(
                raw,
                'is',
                _stateArgument(stateOrName),
                unsafe.dartToJs(params),
                unsafe.dartToJs(options),
              );

    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Checks whether the current state includes a state.
  bool? includes(
    Object? stateOrName, [
    Object? params = _undefinedArgument,
    Object? options = _undefinedArgument,
  ]) {
    final value = params == _undefinedArgument
        ? unsafe.callMethod1(raw, 'includes', _stateArgument(stateOrName))
        : options == _undefinedArgument
            ? unsafe.callMethod2(
                raw,
                'includes',
                _stateArgument(stateOrName),
                unsafe.dartToJs(params),
              )
            : unsafe.callMethod3(
                raw,
                'includes',
                _stateArgument(stateOrName),
                unsafe.dartToJs(params),
                unsafe.dartToJs(options),
              );

    return value == null ? null : (value as JSBoolean).toDart;
  }

  /// Generates a URL for a state and parameters.
  String? href(
    Object? stateOrName, [
    Object? params = _undefinedArgument,
    Object? options = _undefinedArgument,
  ]) {
    final value = params == _undefinedArgument
        ? unsafe.callMethod1(raw, 'href', _stateArgument(stateOrName))
        : options == _undefinedArgument
            ? unsafe.callMethod2(
                raw,
                'href',
                _stateArgument(stateOrName),
                unsafe.dartToJs(params),
              )
            : unsafe.callMethod3(
                raw,
                'href',
                _stateArgument(stateOrName),
                unsafe.dartToJs(params),
                unsafe.dartToJs(options),
              );

    return value == null ? null : (value as JSString).toDart;
  }

  /// Gets one state, all states, or a state relative to a base state.
  Object? get([
    Object? stateOrName = _undefinedArgument,
    Object? base = _undefinedArgument,
  ]) {
    if (stateOrName == _undefinedArgument) return unsafe.callMethod(raw, 'get');

    if (base == _undefinedArgument) {
      return unsafe.callMethod1(raw, 'get', _stateArgument(stateOrName));
    }

    return unsafe.callMethod2(
        raw, 'get', _stateArgument(stateOrName), _stateArgument(base));
  }
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

/// Represents topic service.
final class TopicService extends GeneratedNgTopicService {
  /// Creates a topic service.
  const TopicService(super.raw);
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

  /// Defines a scoped custom element.
  CustomElementConstructor define<TScope>(
    String name,
    WebComponent<TScope> options,
  ) {
    final result = unsafe.callMethod2(
      raw,
      'define',
      name.toJS,
      options.toJsObject(),
    );

    return result as CustomElementConstructor;
  }

  /// Creates and attaches an AngularTS child scope for a custom element.
  Scope<TState> createElementScope<TState>(
    HTMLElement host, [
    Object? initialState = _undefinedArgument,
    ElementScopeOptions? options,
  ]) {
    final result = initialState == _undefinedArgument
        ? unsafe.callMethod1(raw, 'createElementScope', host)
        : options == null
            ? unsafe.callMethod2(
                raw,
                'createElementScope',
                host,
                unsafe.dartToJs(initialState),
              )
            : unsafe.callMethod3(
                raw,
                'createElementScope',
                host,
                unsafe.dartToJs(initialState),
                options.toJsObject(),
              );

    return Scope<TState>.unsafe(result);
  }
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

  /// Loads a WebAssembly module and returns either exports or the raw result.
  Object? call(
    String src, [
    Object? imports = _undefinedArgument,
    Object? options = _undefinedArgument,
  ]) {
    final fn = raw as JSFunction;

    if (imports == _undefinedArgument) {
      return fn.callAsFunction(null, src.toJS);
    }

    if (options == _undefinedArgument) {
      return fn.callAsFunction(null, src.toJS, _plainOptions(imports));
    }

    return fn.callAsFunction(
      null,
      src.toJS,
      _plainOptions(imports),
      _plainOptions(options),
    );
  }

  /// Wraps an AngularTS scope for direct Wasm client access.
  Object? scope(Scope<Object?> scope, [Object? options = _undefinedArgument]) {
    return options == _undefinedArgument
        ? unsafe.callMethod1(raw, 'scope', scope.raw)
        : unsafe.callMethod2(raw, 'scope', scope.raw, _plainOptions(options));
  }
}

/// Creates a typed JavaScript facade from a raw runtime value.
T facade<T extends AngularTsJsFacade>(
  JSAny? value,
  T Function(JSObject raw) create,
) {
  return create(value as JSObject);
}
