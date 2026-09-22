package io.github.angularwave.android.core.bridge

import io.github.angularwave.android.core.config.AngularNative
import io.github.angularwave.android.core.logging.logError
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

abstract class BridgeComponentJsonConverter protected constructor() {
    companion object {
        const val NO_CONVERTER =
            "A AngularNative.config.jsonConverter must be set to encode or decode json"

        const val INVALID_CONVERTER =
            "The configured json converter must implement a BridgeComponentJsonTypeConverter " +
                "or use the provided KotlinXJsonConverter."

        inline fun <reified T> toObject(jsonData: String): T? {
            val converter = requireNotNull(AngularNative.config.jsonConverter) { NO_CONVERTER }

            return when (converter) {
                is KotlinXJsonConverter -> converter.toObject<T>(jsonData)
                is BridgeComponentJsonTypeConverter -> converter.toObject(jsonData, T::class.java)
                else -> throw IllegalStateException(INVALID_CONVERTER)
            }
        }

        inline fun <reified T> toJson(data: T): String {
            val converter = requireNotNull(AngularNative.config.jsonConverter) { NO_CONVERTER }

            return when (converter) {
                is KotlinXJsonConverter -> converter.toJson(data)
                is BridgeComponentJsonTypeConverter -> converter.toJson(data, T::class.java)
                else -> throw IllegalStateException(INVALID_CONVERTER)
            }
        }
    }
}

abstract class BridgeComponentJsonTypeConverter : BridgeComponentJsonConverter() {
    abstract fun <T> toObject(
        jsonData: String,
        type: Class<T>,
    ): T?

    abstract fun <T> toJson(
        data: T,
        type: Class<T>,
    ): String
}

class KotlinXJsonConverter(val json: Json = io.github.angularwave.android.core.bridge.json) :
    BridgeComponentJsonConverter() {
    inline fun <reified T> toObject(jsonData: String): T? =
        try {
            json.decodeFromString(jsonData)
        } catch (e: SerializationException) {
            logException(e)
            null
        }

    inline fun <reified T> toJson(data: T): String = json.encodeToString(data)

    fun logException(e: Exception) {
        logError("kotlinXJsonConverterFailedWithError", e)
    }
}
