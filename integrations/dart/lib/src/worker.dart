import 'dart:js_interop';

import 'package:web/web.dart';

import 'services.dart';
import 'unsafe.dart' as unsafe;

/// Configuration for a managed AngularTS Web Worker connection.
final class WorkerConfig {
  /// Creates a worker config.
  const WorkerConfig({
    this.onMessage,
    this.onError,
    this.autoRestart,
    this.autoTerminate,
    this.transformMessage,
    this.logger,
    this.err,
  });

  /// Called for every message received from the worker.
  final void Function(Object? data, MessageEvent event)? onMessage;

  /// Called when the underlying worker emits an error.
  final void Function(ErrorEvent error)? onError;

  /// Restarts the worker automatically after an error when enabled.
  final bool? autoRestart;

  /// Terminates the worker automatically when its owner is destroyed.
  final bool? autoTerminate;

  /// Converts outbound messages before they are posted to the worker.
  final Object? Function(Object? data)? transformMessage;

  /// Logger service used by the worker manager.
  final LogService? logger;

  /// Exception handler service used by the worker manager.
  final ExceptionHandlerService? err;

  /// The to js object.
  JSObject toJsObject() {
    return unsafe.object({
      if (onMessage != null)
        'onMessage': unsafe.JsValue(((JSAny? data, MessageEvent event) {
          onMessage!(unsafe.jsToDart<Object?>(data), event);
        }).toJS),
      if (onError != null) 'onError': unsafe.JsValue(onError!.toJS),
      if (autoRestart != null) 'autoRestart': autoRestart,
      if (autoTerminate != null) 'autoTerminate': autoTerminate,
      if (transformMessage != null)
        'transformMessage': unsafe.JsValue(((JSAny? data) {
          return unsafe.dartToJs(transformMessage!(unsafe.jsToDart(data)));
        }).toJS),
      if (logger != null) 'logger': unsafe.JsValue(logger!.raw),
      if (err != null) 'err': unsafe.JsValue(err!.raw),
    });
  }
}

/// Fully populated worker configuration used internally by AngularTS.
final class DefaultWorkerConfig {
  /// Creates a default worker config.
  const DefaultWorkerConfig({
    required this.onMessage,
    required this.onError,
    required this.autoRestart,
    required this.autoTerminate,
    required this.transformMessage,
    required this.logger,
    required this.err,
  });

  /// Callback for function.
  final void Function(Object? data, MessageEvent event) onMessage;

  /// Callback for function.
  final void Function(ErrorEvent error) onError;

  /// The auto restart.
  final bool autoRestart;

  /// The auto terminate.
  final bool autoTerminate;

  /// Callback for function.
  final Object? Function(Object? data) transformMessage;

  /// The logger.
  final LogService logger;

  /// The err.
  final ExceptionHandlerService err;
}

/// Runtime handle for a managed AngularTS Web Worker.
final class WorkerConnection {
  /// Creates a worker connection.
  const WorkerConnection(this.raw);

  /// The raw.
  final JSObject raw;

  /// Posts data to the worker.
  void post(Object? data) {
    unsafe.callMethod(raw, 'post', unsafe.dartToJs(data));
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
