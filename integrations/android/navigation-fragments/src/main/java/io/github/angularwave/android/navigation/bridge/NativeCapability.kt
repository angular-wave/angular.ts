package io.github.angularwave.android.navigation.bridge

import android.content.Context
import androidx.lifecycle.LifecycleOwner
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import org.json.JSONObject

/** Stable failure categories available to optional native capability providers. */
enum class NativeCapabilityErrorCode {
    CANCELLED,
    DENIED,
    INTERNAL_ERROR,
    INTERRUPTED,
    INVALID_PARAMS,
    PERMANENTLY_DENIED,
    UNAUTHORIZED,
    UNAVAILABLE,
    UNKNOWN_METHOD,
    UNKNOWN_TARGET,
}

/** A platform service contributed by an optional Android artifact. */
interface NativeCapability {
    val target: String
    val methods: Set<String>

    fun invoke(
        method: String,
        params: JSONObject,
    ): Any?

    fun invokeAsync(
        method: String,
        params: JSONObject,
        complete: (Any?) -> Unit,
        fail: (NativeCapabilityException) -> Unit,
        onCancel: (() -> Unit) -> Unit,
    ): Boolean = false

    fun close() {}
}

/** ServiceLoader entry point generated for an optional capability library. */
fun interface NativeCapabilityProvider {
    fun capabilities(context: NativeCapabilityContext): Collection<NativeCapability>
}

/** Receives events emitted by installed native capabilities. */
fun interface NativeCapabilityEventSink {
    fun emit(
        target: String,
        event: String,
        data: JSONObject?,
    )
}

/** Destination-scoped Android services available to a native capability provider. */
data class NativeCapabilityContext(
    val destination: AngularNativeDestination,
    val events: NativeCapabilityEventSink,
) {
    val context: Context
        get() = destination.fragment.requireContext()

    val lifecycleOwner: LifecycleOwner
        get() = destination.fragment

    fun emit(
        target: String,
        event: String,
        data: JSONObject? = null,
    ) {
        require(target.matches(Identifier)) {
            "Native capability targets must use lowercase kebab-case"
        }
        require(event.matches(Identifier)) {
            "Native capability events must use lowercase kebab-case"
        }
        events.emit(target, event, data)
    }

    private companion object {
        val Identifier = Regex("[a-z][a-z0-9]*(?:-[a-z0-9]+)*")
    }
}

/** Generates discovery metadata and declares every target contributed by a provider. */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.SOURCE)
annotation class RegisterNativeCapabilityProvider(vararg val targets: String)

/** Typed rejection crossing an optional capability boundary. */
class NativeCapabilityException : IllegalArgumentException {
    val errorCode: NativeCapabilityErrorCode
    internal val code: NativeBridgeProtocol.ErrorCode

    constructor(errorCode: NativeCapabilityErrorCode, message: String) : super(message) {
        this.errorCode = errorCode
        code = errorCode.toProtocolCode()
    }

    internal constructor(code: NativeBridgeProtocol.ErrorCode, message: String) : super(message) {
        this.code = code
        errorCode = code.toCapabilityCode()
    }
}

internal fun NativeCapabilityErrorCode.toProtocolCode(): NativeBridgeProtocol.ErrorCode =
    when (this) {
        NativeCapabilityErrorCode.CANCELLED -> NativeBridgeProtocol.ErrorCode.CANCELLED
        NativeCapabilityErrorCode.DENIED -> NativeBridgeProtocol.ErrorCode.DENIED
        NativeCapabilityErrorCode.INTERRUPTED -> NativeBridgeProtocol.ErrorCode.INTERRUPTED
        NativeCapabilityErrorCode.INVALID_PARAMS -> NativeBridgeProtocol.ErrorCode.INVALID_PARAMS
        NativeCapabilityErrorCode.PERMANENTLY_DENIED ->
            NativeBridgeProtocol.ErrorCode.PERMANENTLY_DENIED
        NativeCapabilityErrorCode.UNAUTHORIZED -> NativeBridgeProtocol.ErrorCode.UNAUTHORIZED
        NativeCapabilityErrorCode.UNAVAILABLE -> NativeBridgeProtocol.ErrorCode.UNAVAILABLE
        NativeCapabilityErrorCode.UNKNOWN_METHOD -> NativeBridgeProtocol.ErrorCode.UNKNOWN_METHOD
        NativeCapabilityErrorCode.UNKNOWN_TARGET -> NativeBridgeProtocol.ErrorCode.UNKNOWN_TARGET
        NativeCapabilityErrorCode.INTERNAL_ERROR -> NativeBridgeProtocol.ErrorCode.INTERNAL
    }

internal fun NativeBridgeProtocol.ErrorCode.toCapabilityCode(): NativeCapabilityErrorCode =
    when (this) {
        NativeBridgeProtocol.ErrorCode.CANCELLED -> NativeCapabilityErrorCode.CANCELLED
        NativeBridgeProtocol.ErrorCode.DENIED -> NativeCapabilityErrorCode.DENIED
        NativeBridgeProtocol.ErrorCode.INTERRUPTED -> NativeCapabilityErrorCode.INTERRUPTED
        NativeBridgeProtocol.ErrorCode.INVALID_PARAMS -> NativeCapabilityErrorCode.INVALID_PARAMS
        NativeBridgeProtocol.ErrorCode.PERMANENTLY_DENIED ->
            NativeCapabilityErrorCode.PERMANENTLY_DENIED
        NativeBridgeProtocol.ErrorCode.UNAUTHORIZED -> NativeCapabilityErrorCode.UNAUTHORIZED
        NativeBridgeProtocol.ErrorCode.UNAVAILABLE -> NativeCapabilityErrorCode.UNAVAILABLE
        NativeBridgeProtocol.ErrorCode.UNKNOWN_METHOD -> NativeCapabilityErrorCode.UNKNOWN_METHOD
        NativeBridgeProtocol.ErrorCode.UNKNOWN_TARGET -> NativeCapabilityErrorCode.UNKNOWN_TARGET
        else -> NativeCapabilityErrorCode.INTERNAL_ERROR
    }
