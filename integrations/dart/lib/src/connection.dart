import 'dart:js_interop';

import 'package:web/web.dart';

/// Represents connection config.
final class ConnectionConfig {
  /// Creates a connection config.
  const ConnectionConfig({
    this.onOpen,
    this.onMessage,
    this.onEvent,
    this.onError,
    this.onClose,
    this.onReconnect,
    this.retryDelay,
    this.maxRetries,
    this.heartbeatTimeout,
    this.eventTypes = const [],
    this.transformMessage,
  });

  /// Callback for function.
  final void Function(Event event)? onOpen;

  /// Callback for function.
  final void Function(Object? data, Event event)? onMessage;

  /// Callback for function.
  final void Function(ConnectionEvent<Object?> message)? onEvent;

  /// Callback for function.
  final void Function(Object? error)? onError;

  /// Callback for function.
  final void Function(CloseEvent event)? onClose;

  /// Callback for function.
  final void Function(int attempt)? onReconnect;

  /// The retry delay.
  final int? retryDelay;

  /// The max retries.
  final int? maxRetries;

  /// The heartbeat timeout.
  final int? heartbeatTimeout;

  /// The event types.
  final List<String> eventTypes;

  /// Transforms raw message data before callbacks receive it.
  final Object? Function(Object? data)? transformMessage;
}

/// Represents connection event.
final class ConnectionEvent<T> {
  /// Creates a connection event.
  const ConnectionEvent({
    required this.type,
    required this.data,
    required this.rawData,
    required this.event,
  });

  /// The type.
  final String type;

  /// The data.
  final T data;

  /// The raw data.
  final Object? rawData;

  /// The event.
  final Event event;
}

/// Represents realtime protocol message.
final class RealtimeProtocolMessage {
  /// Creates a realtime protocol message.
  const RealtimeProtocolMessage({
    this.data,
    this.html,
    this.target,
    this.swap,
  });

  /// Plain value used as swap content when html is omitted.
  final Object? data;

  /// HTML or text payload to apply with the configured swap mode.
  final Object? html;

  /// Optional CSS selector that overrides the directive target.
  final String? target;

  /// Optional swap mode that overrides the directive swap mode.
  final SwapModeType? swap;
}

/// Realtime protocol event detail.
final class RealtimeProtocolEventDetail<T, TSource> {
  /// Creates a realtime protocol event detail.
  const RealtimeProtocolEventDetail({
    this.data,
    this.event,
    this.source,
    this.url,
    this.error,
  });

  /// Parsed event payload.
  final T? data;

  /// Native event that produced the detail.
  final Event? event;

  /// Source connection.
  final TSource? source;

  /// Source URL.
  final String? url;

  /// Transport or parsing error.
  final Object? error;
}

/// Signature for sse protocol message.
typedef SseProtocolMessage = RealtimeProtocolMessage;

/// Signature for sse protocol event detail.
typedef SseProtocolEventDetail<T>
    = RealtimeProtocolEventDetail<T, SseConnection>;

/// Supported swap mode type values.
enum SwapModeType {
  /// Replaces the contents inside the element.
  innerHTML('innerHTML'),

  /// Replaces the entire element.
  outerHTML('outerHTML'),

  /// Inserts plain text.
  textContent('textContent'),

  /// Inserts HTML before the element.
  beforebegin('beforebegin'),

  /// Inserts HTML inside the element, before its first child.
  afterbegin('afterbegin'),

  /// Inserts HTML inside the element, after its last child.
  beforeend('beforeend'),

  /// Inserts HTML after the element.
  afterend('afterend'),

  /// Removes the element.
  delete('delete'),

  /// Performs no insertion.
  none('none');

  const SwapModeType(this.value);

  /// Registers an AngularTS value.
  final String value;
}

/// Represents sse config.
final class SseConfig {
  /// Creates a sse config.
  const SseConfig({
    this.connection = const ConnectionConfig(),
    this.onOpen,
    this.onMessage,
    this.onEvent,
    this.onError,
    this.onClose,
    this.onReconnect,
    this.retryDelay,
    this.maxRetries,
    this.heartbeatTimeout,
    this.eventTypes = const [],
    this.transformMessage,
    this.withCredentials,
    this.params,
    this.headers,
  });

  /// The connection.
  final ConnectionConfig connection;

  /// Callback for function.
  final void Function(Event event)? onOpen;

  /// Callback for function.
  final void Function(Object? data, Event event)? onMessage;

  /// Callback for function.
  final void Function(ConnectionEvent<Object?> message)? onEvent;

  /// Callback for function.
  final void Function(Object? error)? onError;

  /// Callback for function.
  final void Function(CloseEvent event)? onClose;

  /// Callback for function.
  final void Function(int attempt)? onReconnect;

  /// The retry delay.
  final int? retryDelay;

  /// The max retries.
  final int? maxRetries;

  /// The heartbeat timeout.
  final int? heartbeatTimeout;

  /// The event types.
  final List<String> eventTypes;

  /// Transforms raw message data before callbacks receive it.
  final Object? Function(Object? data)? transformMessage;

  /// The with credentials.
  final bool? withCredentials;

  /// The params.
  final Map<String, Object?>? params;

  /// The headers.
  final Map<String, String>? headers;
}

/// Runtime interface for sse connection.
abstract interface class SseConnection {
  /// The close.
  void close();

  /// The connect.
  void connect();
}

/// Represents web socket config.
final class WebSocketConfig {
  /// Creates a web socket config.
  const WebSocketConfig({
    this.connection = const ConnectionConfig(),
    this.onOpen,
    this.onMessage,
    this.onEvent,
    this.onError,
    this.onClose,
    this.onReconnect,
    this.retryDelay,
    this.maxRetries,
    this.heartbeatTimeout,
    this.eventTypes = const [],
    this.transformMessage,
    this.protocols = const [],
    this.onProtocolMessage,
  });

  /// The connection.
  final ConnectionConfig connection;

  /// Callback for function.
  final void Function(Event event)? onOpen;

  /// Callback for function.
  final void Function(Object? data, Event event)? onMessage;

  /// Callback for function.
  final void Function(ConnectionEvent<Object?> message)? onEvent;

  /// Callback for function.
  final void Function(Object? error)? onError;

  /// Callback for function.
  final void Function(CloseEvent event)? onClose;

  /// Callback for function.
  final void Function(int attempt)? onReconnect;

  /// The retry delay.
  final int? retryDelay;

  /// The max retries.
  final int? maxRetries;

  /// The heartbeat timeout.
  final int? heartbeatTimeout;

  /// The event types.
  final List<String> eventTypes;

  /// Transforms raw message data before callbacks receive it.
  final Object? Function(Object? data)? transformMessage;

  /// The protocols.
  final List<String> protocols;

  /// Called when a realtime protocol message is received.
  final void Function(RealtimeProtocolMessage data, Event event)?
      onProtocolMessage;
}

/// Runtime handle for an AngularTS WebSocket connection.
abstract interface class WebSocketConnection {
  /// The connect.
  void connect();

  /// The send.
  void send(Object? data);

  /// The close.
  void close();
}

/// Signature for web transport buffer input.
typedef WebTransportBufferInput = JSAny;

/// Represents web transport certificate hash.
final class WebTransportCertificateHash {
  /// Creates a web transport certificate hash.
  const WebTransportCertificateHash({
    required this.algorithm,
    required this.value,
  });

  /// The algorithm.
  final String algorithm;

  /// Registers an AngularTS value.
  final JSAny value;
}

/// Represents web transport options.
final class WebTransportOptions {
  /// Creates a web transport options.
  const WebTransportOptions({
    this.allowPooling,
    this.congestionControl,
    this.requireUnreliable,
    this.serverCertificateHashes = const [],
  });

  /// The allow pooling.
  final bool? allowPooling;

  /// The congestion control.
  final String? congestionControl;

  /// The require unreliable.
  final bool? requireUnreliable;

  /// The server certificate hashes.
  final List<WebTransportCertificateHash> serverCertificateHashes;
}

/// Represents web transport datagram event.
final class WebTransportDatagramEvent<T> {
  /// Creates a web transport datagram event.
  const WebTransportDatagramEvent({
    required this.data,
    required this.message,
  });

  /// The data.
  final JSAny data;

  /// The message.
  final T message;
}

/// Signature for web transport retry delay.
typedef WebTransportRetryDelay = int Function(int attempt, [Object? error]);

/// Represents web transport reconnect event.
final class WebTransportReconnectEvent {
  /// Creates a web transport reconnect event.
  const WebTransportReconnectEvent({
    required this.connection,
    required this.attempt,
    required this.url,
    this.error,
  });

  /// The connection.
  final WebTransportConnection connection;

  /// The attempt.
  final int attempt;

  /// The url.
  final String url;

  /// The error.
  final Object? error;
}

/// Represents web transport config.
final class WebTransportConfig {
  /// Creates a web transport config.
  const WebTransportConfig({
    this.options = const WebTransportOptions(),
    this.allowPooling,
    this.congestionControl,
    this.requireUnreliable,
    this.serverCertificateHashes = const [],
    this.onOpen,
    this.onClose,
    this.onError,
    this.onDatagram,
    this.onProtocolMessage,
    this.transformDatagram,
    this.reconnect,
    this.retryDelay,
    this.maxRetries,
    this.onReconnect,
  });

  /// The options.
  final WebTransportOptions options;

  /// The allow pooling.
  final bool? allowPooling;

  /// The congestion control.
  final String? congestionControl;

  /// The require unreliable.
  final bool? requireUnreliable;

  /// The server certificate hashes.
  final List<WebTransportCertificateHash> serverCertificateHashes;

  /// Callback for function.
  final void Function()? onOpen;

  /// Callback for function.
  final void Function()? onClose;

  /// Callback for function.
  final void Function(Object? error)? onError;

  /// Callback for function.
  final void Function(WebTransportDatagramEvent<Object?> event)? onDatagram;

  /// Called when a realtime protocol message is received from WebTransport.
  final void Function(
    RealtimeProtocolMessage message,
    WebTransportDatagramEvent<RealtimeProtocolMessage> event,
  )? onProtocolMessage;

  /// Converts incoming datagram bytes into the event message.
  final Object? Function(JSAny data)? transformDatagram;

  /// The reconnect.
  final bool? reconnect;

  /// The retry delay.
  final Object? retryDelay;

  /// The max retries.
  final int? maxRetries;

  /// Callback for function.
  final void Function(WebTransportReconnectEvent event)? onReconnect;
}

/// Native browser WebTransport instance.
abstract interface class NativeWebTransport {
  /// Resolves when the native WebTransport session is ready.
  Future<void> get ready;

  /// Resolves or rejects when the native WebTransport session closes.
  Future<Object?> get closed;

  /// Native datagram streams.
  JSObject get datagrams;

  /// Incoming unidirectional stream reader when exposed by the browser.
  JSObject? get incomingUnidirectionalStreams;

  /// The close.
  void close([Object? closeInfo]);

  /// The create bidirectional stream.
  Future<JSObject> createBidirectionalStream();

  /// The create unidirectional stream.
  Future<Object?> createUnidirectionalStream();
}

/// Runtime handle for an AngularTS WebTransport connection.
abstract interface class WebTransportConnection {
  /// Completes when the WebTransport connection is ready.
  Future<WebTransportConnection> get ready;

  /// Completes when the WebTransport connection is closed.
  Future<void> get closed;

  /// Native WebTransport instance.
  NativeWebTransport get transport;

  /// The create bidirectional stream.
  Future<JSObject> createBidirectionalStream();

  /// The send datagram.
  Future<void> sendDatagram(WebTransportBufferInput data);

  /// The send text.
  Future<void> sendText(String data);

  /// The send stream.
  Future<void> sendStream(WebTransportBufferInput data);

  /// The close.
  void close([Object? closeInfo]);
}
