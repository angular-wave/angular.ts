import 'dart:js_interop';

import 'package:web/web.dart';

import 'unsafe.dart' as unsafe;

/// Configuration for a managed AngularTS Web Worker handle.
final class WorkerConfig {
  /// Creates a worker config.
  const WorkerConfig({
    this.type,
    this.name,
    this.credentials,
    this.restart,
    this.restartDelay,
    this.maxRestarts,
    this.decode,
  });

  /// Native worker script type (`module` or `classic`).
  final String? type;

  /// Native worker name.
  final String? name;

  /// Native worker credentials mode.
  final String? credentials;

  /// Restarts the worker after an error when enabled.
  final bool? restart;

  /// Base restart delay in milliseconds.
  final num? restartDelay;

  /// Maximum number of automatic restarts.
  final int? maxRestarts;

  /// Decodes inbound worker messages before delivery to subscribers.
  final Object? Function(Object? data)? decode;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (type != null) 'type': type,
      if (name != null) 'name': name,
      if (credentials != null) 'credentials': credentials,
      if (restart != null) 'restart': restart,
      if (restartDelay != null) 'restartDelay': restartDelay,
      if (maxRestarts != null) 'maxRestarts': maxRestarts,
      if (decode != null)
        'decode': unsafe.JsValue(((JSAny? data) {
          return unsafe.dartToJs(decode!(unsafe.jsToDart(data)));
        }).toJS),
    });
  }
}

/// Typed failure reported by a managed AngularTS Web Worker.
final class WorkerError {
  /// Creates a typed worker error facade.
  const WorkerError(this.raw);

  /// The raw JavaScript error.
  final JSObject raw;

  /// Stable worker error code.
  String get code => unsafe.jsToDart<String>(unsafe.getProperty(raw, 'code'));

  /// Human-readable failure message.
  String get message =>
      unsafe.jsToDart<String>(unsafe.getProperty(raw, 'message'));
}

/// Runtime handle for a managed AngularTS Web Worker.
final class WorkerHandle {
  /// Creates a worker handle.
  const WorkerHandle(this.raw);

  /// The raw.
  final JSObject raw;

  /// Current managed lifecycle status.
  String get status =>
      unsafe.jsToDart<String>(unsafe.getProperty(raw, 'status'));

  /// Latest managed worker error.
  WorkerError? get error {
    final value = unsafe.getProperty(raw, 'error');

    return value == null ? null : WorkerError(value as JSObject);
  }

  /// Number of worker replacements.
  int get restartCount =>
      unsafe.jsToDart<num>(unsafe.getProperty(raw, 'restartCount')).toInt();

  /// Posts data to the worker.
  void post(Object? data, [List<Object?> transfer = const []]) {
    unsafe.callMethod(
      raw,
      'post',
      unsafe.dartToJs(data),
      unsafe.dartToJs(transfer),
    );
  }

  /// Sends a correlated request and awaits its decoded result.
  Future<Object?> request(
    Object? data, {
    num? timeout,
    List<Object?> transfer = const [],
  }) async {
    final options = unsafe.object({
      if (timeout != null) 'timeout': timeout,
      if (transfer.isNotEmpty) 'transfer': transfer,
    });
    final promise = unsafe.callMethod(
      raw,
      'request',
      unsafe.dartToJs(data),
      options,
    ) as JSPromise<JSAny?>;

    return unsafe.jsToDart<Object?>(await promise.toDart);
  }

  /// Returns a model synchronization target for a worker channel.
  JSObject model([String channel = 'default']) =>
      unsafe.callMethod(raw, 'model', channel.toJS) as JSObject;

  /// Subscribes to native worker errors and returns a disposer.
  void Function() onError(void Function(WorkerError error) listener) {
    final callback = ((JSObject error) => listener(WorkerError(error))).toJS;
    final dispose = unsafe.callMethod(raw, 'onError', callback) as JSFunction;

    return () => unsafe.callFunction(dispose, const []);
  }

  /// Subscribes to messages and returns a disposer.
  void Function() onMessage(
    void Function(Object? data, MessageEvent event) listener,
  ) {
    final callback = ((JSAny? data, MessageEvent event) {
      listener(unsafe.jsToDart<Object?>(data), event);
    }).toJS;
    final dispose = unsafe.callMethod(raw, 'onMessage', callback) as JSFunction;

    return () => unsafe.callFunction(dispose, const []);
  }

  /// Terminates the worker.
  void terminate() {
    unsafe.callMethod(raw, 'terminate');
  }

  /// Terminates and recreates the worker.
  void restart() {
    unsafe.callMethod(raw, 'restart');
  }
}
