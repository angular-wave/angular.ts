package io.github.angularwave.android.navigation.bridge

import org.json.JSONObject

internal object NativeBridgeProtocol {
    const val VERSION = 1
    const val MAX_MESSAGE_BYTES = 256 * 1024

    enum class ErrorCode(val value: String) {
        INTERNAL("internal"),
        CANCELLED("cancelled"),
        DENIED("denied"),
        PERMANENTLY_DENIED("permanently_denied"),
        INTERRUPTED("interrupted"),
        INVALID_MESSAGE("invalid_message"),
        INVALID_PARAMS("invalid_params"),
        INVALID_PROPERTY("invalid_property"),
        PAYLOAD_TOO_LARGE("payload_too_large"),
        PROTOCOL_MISMATCH("protocol_mismatch"),
        UNAUTHORIZED("unauthorized"),
        UNKNOWN_ELEMENT("unknown_element"),
        UNKNOWN_INSTANCE("unknown_instance"),
        UNKNOWN_METHOD("unknown_method"),
        UNKNOWN_TARGET("unknown_target"),
        UNAVAILABLE("unavailable"),
    }

    data class Request(
        val id: String,
        val target: String,
        val method: String,
        val params: JSONObject?,
        val session: String?,
    )

    sealed interface ParseResult {
        data class Success(val request: Request) : ParseResult

        data class Failure(
            val id: String?,
            val code: ErrorCode,
            val message: String,
        ) : ParseResult
    }

    fun parse(message: String?): ParseResult {
        if (message.isNullOrBlank()) {
            return ParseResult.Failure(null, ErrorCode.INVALID_MESSAGE, "Native message is empty")
        }
        if (message.toByteArray(Charsets.UTF_8).size > MAX_MESSAGE_BYTES) {
            return ParseResult.Failure(
                null,
                ErrorCode.PAYLOAD_TOO_LARGE,
                "Native message exceeds $MAX_MESSAGE_BYTES bytes",
            )
        }

        val value =
            try {
                JSONObject(message)
            } catch (_: Exception) {
                return ParseResult.Failure(
                    null,
                    ErrorCode.INVALID_MESSAGE,
                    "Native message is not valid JSON",
                )
            }
        val id = value.optString("id").takeIf { it.isNotBlank() }

        if (id == null) {
            return ParseResult.Failure(
                null,
                ErrorCode.INVALID_MESSAGE,
                "Native message requires id",
            )
        }
        if (value.optInt("protocol", -1) != VERSION) {
            return ParseResult.Failure(
                id,
                ErrorCode.PROTOCOL_MISMATCH,
                "Unsupported native protocol version",
            )
        }

        val target = value.optString("target")
        val method = value.optString("method")
        if (target.isBlank()) {
            return ParseResult.Failure(
                id,
                ErrorCode.INVALID_MESSAGE,
                "Native message requires target",
            )
        }
        if (method.isBlank()) {
            return ParseResult.Failure(
                id,
                ErrorCode.INVALID_MESSAGE,
                "Native message requires method",
            )
        }

        return ParseResult.Success(
            Request(
                id = id,
                target = target,
                method = method,
                params = value.optJSONObject("params"),
                session = value.optString("session").takeIf { it.isNotBlank() },
            )
        )
    }
}
