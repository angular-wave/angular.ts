package angular.ts

import angular.ts.generated.SseConnection as RawSseConnection
import angular.ts.generated.SseService as RawSseService
import angular.ts.generated.WebSocketConnection as RawWebSocketConnection
import angular.ts.generated.WebSocketService as RawWebSocketService
import angular.ts.generated.WebTransportConnection as RawWebTransportConnection
import angular.ts.generated.WebTransportService as RawWebTransportService

public enum class SwapModeType(
    public val raw: String,
) {
    InnerHTML("innerHTML"),
    OuterHTML("outerHTML"),
    TextContent("textContent"),
    BeforeBegin("beforebegin"),
    AfterBegin("afterbegin"),
    BeforeEnd("beforeend"),
    AfterEnd("afterend"),
    Delete("delete"),
    None("none"),
}

public data class ConnectionConfig public constructor(
    public val onOpen: ((Any?) -> Unit)? = null,
    public val onMessage: ((Any?, Any?) -> Unit)? = null,
    public val onEvent: ((ConnectionEvent<Any?>) -> Unit)? = null,
    public val onError: ((Any?) -> Unit)? = null,
    public val onClose: ((Any?) -> Unit)? = null,
    public val onReconnect: ((Int) -> Unit)? = null,
    public val retryDelay: Int? = null,
    public val maxRetries: Int? = null,
    public val heartbeatTimeout: Int? = null,
    public val eventTypes: List<String> = emptyList(),
    public val transformMessage: ((Any?) -> Any?)? = null,
)

public data class ConnectionEvent<T> public constructor(
    public val type: String,
    public val data: T,
    public val rawData: Any? = null,
    public val event: Any? = null,
) {
    internal companion object {
        internal fun fromJs(raw: dynamic): ConnectionEvent<Any?> =
            ConnectionEvent(
                type = raw.type.unsafeCast<String>(),
                data = raw.data,
                rawData = raw.rawData,
                event = raw.event,
            )
    }
}

public data class RealtimeProtocolMessage public constructor(
    public val data: Any? = null,
    public val html: Any? = null,
    public val target: String? = null,
    public val swap: SwapModeType? = null,
) {
    internal companion object {
        internal fun fromJs(raw: dynamic): RealtimeProtocolMessage =
            RealtimeProtocolMessage(
                data = raw.data,
                html = raw.html,
                target = raw.target.unsafeCast<String?>(),
                swap = swapModeType(raw.swap),
            )
    }
}

public data class RealtimeProtocolEventDetail<T, TSource> public constructor(
    public val data: T? = null,
    public val event: Any? = null,
    public val source: TSource? = null,
    public val url: String? = null,
    public val error: Any? = null,
)

public typealias SseProtocolMessage = RealtimeProtocolMessage

public typealias SseProtocolEventDetail<T> = RealtimeProtocolEventDetail<T, SseConnection>

public data class SseConfig public constructor(
    public val connection: ConnectionConfig = ConnectionConfig(),
    public val onOpen: ((Any?) -> Unit)? = null,
    public val onMessage: ((Any?, Any?) -> Unit)? = null,
    public val onEvent: ((ConnectionEvent<Any?>) -> Unit)? = null,
    public val onError: ((Any?) -> Unit)? = null,
    public val onClose: ((Any?) -> Unit)? = null,
    public val onReconnect: ((Int) -> Unit)? = null,
    public val retryDelay: Int? = null,
    public val maxRetries: Int? = null,
    public val heartbeatTimeout: Int? = null,
    public val eventTypes: List<String> = emptyList(),
    public val transformMessage: ((Any?) -> Any?)? = null,
    public val withCredentials: Boolean? = null,
    public val params: Map<String, Any?>? = null,
    public val headers: Map<String, String>? = null,
)

public class SseConnection internal constructor(
    internal val raw: RawSseConnection,
) {
    public fun close() {
        raw.close()
    }

    public fun connect() {
        raw.connect()
    }
}

public class SseService internal constructor(
    internal val raw: RawSseService,
) {
    public operator fun invoke(
        url: String,
        config: SseConfig = SseConfig(),
    ): SseConnection =
        SseConnection(raw(url, config.toJs()).unsafeCast<RawSseConnection>())
}

public class SseProvider internal constructor(
    internal val raw: dynamic,
)

public data class WebSocketConfig public constructor(
    public val connection: ConnectionConfig = ConnectionConfig(),
    public val onOpen: ((Any?) -> Unit)? = null,
    public val onMessage: ((Any?, Any?) -> Unit)? = null,
    public val onEvent: ((ConnectionEvent<Any?>) -> Unit)? = null,
    public val onError: ((Any?) -> Unit)? = null,
    public val onClose: ((Any?) -> Unit)? = null,
    public val onReconnect: ((Int) -> Unit)? = null,
    public val retryDelay: Int? = null,
    public val maxRetries: Int? = null,
    public val heartbeatTimeout: Int? = null,
    public val eventTypes: List<String> = emptyList(),
    public val transformMessage: ((Any?) -> Any?)? = null,
    public val protocols: List<String> = emptyList(),
    public val onProtocolMessage: ((RealtimeProtocolMessage, Any?) -> Unit)? = null,
)

public class WebSocketConnection internal constructor(
    internal val raw: RawWebSocketConnection,
) {
    public fun connect() {
        raw.connect()
    }

    public fun send(data: Any?) {
        raw.send(data)
    }

    public fun close() {
        raw.close()
    }
}

public class WebSocketService internal constructor(
    internal val raw: RawWebSocketService,
) {
    public operator fun invoke(
        url: String,
        protocols: List<String> = emptyList(),
        config: WebSocketConfig = WebSocketConfig(),
    ): WebSocketConnection =
        WebSocketConnection(
            raw(url, protocols.toTypedArray(), config.toJs())
                .unsafeCast<RawWebSocketConnection>(),
        )
}

public class WebSocketProvider internal constructor(
    internal val raw: dynamic,
)

public typealias WebTransportBufferInput = Any?

public typealias WebTransportRetryDelay = (attempt: Int, error: Any?) -> Int

public data class WebTransportCertificateHash public constructor(
    public val algorithm: String,
    public val value: Any?,
)

public data class WebTransportOptions public constructor(
    public val allowPooling: Boolean? = null,
    public val congestionControl: String? = null,
    public val requireUnreliable: Boolean? = null,
    public val serverCertificateHashes: List<WebTransportCertificateHash> = emptyList(),
)

public data class WebTransportDatagramEvent<T> public constructor(
    public val data: WebTransportBufferInput,
    public val message: T,
)

public data class WebTransportReconnectEvent public constructor(
    public val connection: WebTransportConnection,
    public val attempt: Int,
    public val url: String,
    public val error: Any? = null,
)

public data class WebTransportConfig public constructor(
    public val options: WebTransportOptions = WebTransportOptions(),
    public val allowPooling: Boolean? = null,
    public val congestionControl: String? = null,
    public val requireUnreliable: Boolean? = null,
    public val serverCertificateHashes: List<WebTransportCertificateHash> = emptyList(),
    public val onOpen: (() -> Unit)? = null,
    public val onClose: (() -> Unit)? = null,
    public val onError: ((Any?) -> Unit)? = null,
    public val onDatagram: ((WebTransportDatagramEvent<Any?>) -> Unit)? = null,
    public val onProtocolMessage: ((RealtimeProtocolMessage, WebTransportDatagramEvent<RealtimeProtocolMessage>) -> Unit)? = null,
    public val transformDatagram: ((WebTransportBufferInput) -> Any?)? = null,
    public val reconnect: Boolean? = null,
    public val retryDelay: Any? = null,
    public val maxRetries: Int? = null,
    public val onReconnect: ((WebTransportReconnectEvent) -> Unit)? = null,
)

public class NativeWebTransport internal constructor(
    internal val raw: dynamic,
) {
    public val ready: Any?
        get() = raw.ready

    public val closed: Any?
        get() = raw.closed

    public val datagrams: Any?
        get() = raw.datagrams

    public val incomingUnidirectionalStreams: Any?
        get() = raw.incomingUnidirectionalStreams

    public fun close(closeInfo: Any? = undefined) {
        raw.close(closeInfo)
    }

    public fun createBidirectionalStream(): Any? =
        raw.createBidirectionalStream()

    public fun createUnidirectionalStream(): Any? =
        raw.createUnidirectionalStream()
}

public class WebTransportConnection internal constructor(
    internal val raw: RawWebTransportConnection,
) {
    public val ready: Any?
        get() = raw.ready

    public val closed: Any?
        get() = raw.closed

    public val transport: NativeWebTransport
        get() = NativeWebTransport(raw.transport)

    public fun createBidirectionalStream(): Any? =
        raw.createBidirectionalStream()

    public fun sendDatagram(data: WebTransportBufferInput): Any? =
        raw.sendDatagram(data)

    public fun sendText(data: String): Any? =
        raw.sendText(data)

    public fun sendStream(data: WebTransportBufferInput): Any? =
        raw.sendStream(data)

    public fun close(closeInfo: Any? = undefined) {
        raw.close(closeInfo)
    }
}

public class WebTransportService internal constructor(
    internal val raw: RawWebTransportService,
) {
    public operator fun invoke(
        url: String,
        config: WebTransportConfig = WebTransportConfig(),
    ): WebTransportConnection =
        WebTransportConnection(raw(url, config.toJs()).unsafeCast<RawWebTransportConnection>())
}

public class WebTransportProvider internal constructor(
    internal val raw: dynamic,
)

public data class SseRegistration public constructor(
    public val url: String,
    public val config: SseConfig = SseConfig(),
)

public data class WebSocketRegistration public constructor(
    public val url: String,
    public val protocols: List<String> = emptyList(),
    public val config: WebSocketConfig = WebSocketConfig(),
)

public data class WebTransportRegistration public constructor(
    public val url: String,
    public val config: WebTransportConfig = WebTransportConfig(),
)

internal fun ConnectionConfig.toJs(): dynamic {
    val raw = js("{}")

    writeConnectionConfig(raw, this)

    return raw
}

internal fun SseConfig.toJs(): dynamic {
    val raw = connection.toJs()

    writeConnectionOverrides(raw, onOpen, onMessage, onEvent, onError, onClose, onReconnect)
    if (retryDelay != null) raw.retryDelay = retryDelay
    if (maxRetries != null) raw.maxRetries = maxRetries
    if (heartbeatTimeout != null) raw.heartbeatTimeout = heartbeatTimeout
    if (eventTypes.isNotEmpty()) raw.eventTypes = eventTypes.toTypedArray()
    if (transformMessage != null) raw.transformMessage = transformMessage
    if (withCredentials != null) raw.withCredentials = withCredentials
    if (params != null) raw.params = params.toJsRecord()
    if (headers != null) raw.headers = headers.toJsRecord()

    return raw
}

internal fun WebSocketConfig.toJs(): dynamic {
    val raw = connection.toJs()

    writeConnectionOverrides(raw, onOpen, onMessage, onEvent, onError, onClose, onReconnect)
    if (retryDelay != null) raw.retryDelay = retryDelay
    if (maxRetries != null) raw.maxRetries = maxRetries
    if (heartbeatTimeout != null) raw.heartbeatTimeout = heartbeatTimeout
    if (eventTypes.isNotEmpty()) raw.eventTypes = eventTypes.toTypedArray()
    if (transformMessage != null) raw.transformMessage = transformMessage
    if (protocols.isNotEmpty()) raw.protocols = protocols.toTypedArray()
    if (onProtocolMessage != null) {
        raw.onProtocolMessage = { message: dynamic, event: dynamic ->
            onProtocolMessage.invoke(RealtimeProtocolMessage.fromJs(message), event)
        }
    }

    return raw
}

internal fun WebTransportConfig.toJs(): dynamic {
    val raw = options.toJs()

    if (allowPooling != null) raw.allowPooling = allowPooling
    if (congestionControl != null) raw.congestionControl = congestionControl
    if (requireUnreliable != null) raw.requireUnreliable = requireUnreliable
    if (serverCertificateHashes.isNotEmpty()) {
        raw.serverCertificateHashes = serverCertificateHashes.map { hash -> hash.toJs() }.toTypedArray()
    }
    if (onOpen != null) raw.onOpen = onOpen
    if (onClose != null) raw.onClose = onClose
    if (onError != null) raw.onError = onError
    if (onDatagram != null) {
        raw.onDatagram = { event: dynamic ->
            onDatagram.invoke(WebTransportDatagramEvent(event.data, event.message))
        }
    }
    if (onProtocolMessage != null) {
        raw.onProtocolMessage = { message: dynamic, event: dynamic ->
            onProtocolMessage.invoke(
                RealtimeProtocolMessage.fromJs(message),
                WebTransportDatagramEvent(event.data, RealtimeProtocolMessage.fromJs(event.message)),
            )
        }
    }
    if (transformDatagram != null) raw.transformDatagram = transformDatagram
    if (reconnect != null) raw.reconnect = reconnect
    if (retryDelay != null) raw.retryDelay = retryDelay
    if (maxRetries != null) raw.maxRetries = maxRetries
    if (onReconnect != null) {
        raw.onReconnect = { event: dynamic ->
            onReconnect.invoke(
                WebTransportReconnectEvent(
                    connection = WebTransportConnection(event.connection.unsafeCast<RawWebTransportConnection>()),
                    attempt = event.attempt.unsafeCast<Int>(),
                    url = event.url.unsafeCast<String>(),
                    error = event.error,
                ),
            )
        }
    }

    return raw
}

internal fun RealtimeProtocolMessage.toJs(): dynamic {
    val raw = js("{}")

    if (data != null) raw.data = data
    if (html != null) raw.html = html
    if (target != null) raw.target = target
    if (swap != null) raw.swap = swap.raw

    return raw
}

private fun WebTransportOptions.toJs(): dynamic {
    val raw = js("{}")

    if (allowPooling != null) raw.allowPooling = allowPooling
    if (congestionControl != null) raw.congestionControl = congestionControl
    if (requireUnreliable != null) raw.requireUnreliable = requireUnreliable
    if (serverCertificateHashes.isNotEmpty()) {
        raw.serverCertificateHashes = serverCertificateHashes.map { hash -> hash.toJs() }.toTypedArray()
    }

    return raw
}

private fun WebTransportCertificateHash.toJs(): dynamic {
    val raw = js("{}")

    raw.algorithm = algorithm
    raw.value = value

    return raw
}

private fun writeConnectionConfig(
    raw: dynamic,
    config: ConnectionConfig,
) {
    writeConnectionOverrides(
        raw,
        config.onOpen,
        config.onMessage,
        config.onEvent,
        config.onError,
        config.onClose,
        config.onReconnect,
    )
    if (config.retryDelay != null) raw.retryDelay = config.retryDelay
    if (config.maxRetries != null) raw.maxRetries = config.maxRetries
    if (config.heartbeatTimeout != null) raw.heartbeatTimeout = config.heartbeatTimeout
    if (config.eventTypes.isNotEmpty()) raw.eventTypes = config.eventTypes.toTypedArray()
    if (config.transformMessage != null) raw.transformMessage = config.transformMessage
}

private fun writeConnectionOverrides(
    raw: dynamic,
    onOpen: ((Any?) -> Unit)?,
    onMessage: ((Any?, Any?) -> Unit)?,
    onEvent: ((ConnectionEvent<Any?>) -> Unit)?,
    onError: ((Any?) -> Unit)?,
    onClose: ((Any?) -> Unit)?,
    onReconnect: ((Int) -> Unit)?,
) {
    if (onOpen != null) raw.onOpen = onOpen
    if (onMessage != null) raw.onMessage = onMessage
    if (onEvent != null) {
        raw.onEvent = { event: dynamic -> onEvent.invoke(ConnectionEvent.fromJs(event)) }
    }
    if (onError != null) raw.onError = onError
    if (onClose != null) raw.onClose = onClose
    if (onReconnect != null) {
        raw.onReconnect = { attempt: Int -> onReconnect.invoke(attempt) }
    }
}

private fun swapModeType(value: Any?): SwapModeType? {
    val raw = value.unsafeCast<String?>()

    return SwapModeType.values().firstOrNull { mode -> mode.raw == raw }
}

@Suppress("UNUSED_VARIABLE")
private val undefined: dynamic =
    js("undefined")
