package io.github.angularwave.android.navigation.elements

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import androidx.lifecycle.LifecycleOwner
import androidx.savedstate.SavedStateRegistryOwner
import org.json.JSONObject

enum class NativePropertyType {
    BOOLEAN,
    COLOR,
    FLOAT,
    INTEGER,
    JSON,
    STRING,
    STRING_LIST,
}

data class NativePropertyDefinition(
    val name: String,
    val type: NativePropertyType,
    val required: Boolean = false,
    val nullable: Boolean = false,
    val defaultValue: Any? = null,
)

enum class NativeElementCategory {
    ACTION,
    COLLECTION,
    DISPLAY,
    INPUT,
    LAYOUT,
    MEDIA,
    NAVIGATION,
    OVERLAY,
}

enum class NativeElementMaturity {
    EXPERIMENTAL,
    PREVIEW,
    STABLE,
}

data class NativeElementAccessibility(
    val role: String,
    val labelProperty: String,
    val required: Boolean = true,
)

enum class NativeElementStateOwnership {
    NONE,
    ELEMENT,
    DESTINATION,
}

fun interface NativeElementEventSink {
    fun emit(
        event: String,
        data: JSONObject?,
    )
}

interface NativeElementActivityLauncher {
    fun launch(
        intent: Intent,
        result: (Int, Intent?) -> Unit,
    ): Boolean

    fun cancel() {}
}

data class NativeElementContext(
    val context: Context,
    val container: ViewGroup?,
    val lifecycleOwner: LifecycleOwner,
    val savedStateOwner: SavedStateRegistryOwner,
    val events: NativeElementEventSink,
    val activityLauncher: NativeElementActivityLauncher? = null,
)

class NativeProperties internal constructor(private val values: JSONObject) {
    fun has(name: String): Boolean = values.has(name) && !values.isNull(name)

    fun string(
        name: String,
        default: String = "",
    ): String = values.optString(name).takeIf { it.isNotEmpty() } ?: default

    fun boolean(
        name: String,
        default: Boolean = false,
    ): Boolean = if (has(name)) values.optBoolean(name, default) else default

    fun integer(
        name: String,
        default: Int = 0,
    ): Int = if (has(name)) values.optInt(name, default) else default

    fun float(
        name: String,
        default: Float = 0f,
    ): Float = if (has(name)) values.optDouble(name, default.toDouble()).toFloat() else default

    fun objects(name: String): List<JSONObject> {
        val array = values.optJSONArray(name) ?: return emptyList()
        return buildList {
            for (index in 0 until array.length()) {
                when (val value = array.opt(index)) {
                    is JSONObject -> add(value)
                    is String -> add(JSONObject().put("label", value))
                }
            }
        }
    }

    fun stringList(name: String): List<String> {
        val array = values.optJSONArray(name) ?: return emptyList()
        return buildList {
            for (index in 0 until array.length()) add(array.optString(index))
        }
    }

    fun floats(name: String): List<Float> {
        val array = values.optJSONArray(name) ?: return emptyList()
        return buildList {
            for (index in 0 until array.length()) add(array.optDouble(index).toFloat())
        }
    }

    fun objectValue(name: String): NativeProperties? =
        values.optJSONObject(name)?.let(::NativeProperties)
}

internal fun ViewGroup.children(): Sequence<View> = sequence {
    for (index in 0 until childCount) yield(getChildAt(index))
}

interface NativeElementInstance {
    val view: View

    fun update(properties: NativeProperties)

    fun saveState(): Bundle? = null

    fun restoreState(state: Bundle) {}

    fun invoke(
        method: String,
        parameters: NativeProperties,
    ): Any? =
        throw NativeElementException(
            NativeElementException.Code.UNKNOWN_METHOD,
            "Native element does not support method $method",
        )

    fun dispose() {}
}

fun interface NativeElementProvider {
    fun definitions(): Collection<NativeElementDefinition>
}

fun interface NativeElementFactory {
    fun create(
        context: NativeElementContext,
        properties: NativeProperties,
    ): NativeElementInstance
}

data class NativeElementDefinition(
    val name: String,
    val aliases: Set<String> = emptySet(),
    val properties: List<NativePropertyDefinition> = emptyList(),
    val events: Set<String> = emptySet(),
    val methods: Set<String> = emptySet(),
    val category: NativeElementCategory = NativeElementCategory.DISPLAY,
    val maturity: NativeElementMaturity = NativeElementMaturity.EXPERIMENTAL,
    val minSdk: Int = 28,
    val stateOwnership: NativeElementStateOwnership = NativeElementStateOwnership.NONE,
    val accessibility: NativeElementAccessibility? = null,
    val factory: NativeElementFactory,
)

class NativeElementException(
    val code: Code,
    message: String,
) : IllegalArgumentException(message) {
    enum class Code {
        INVALID_PROPERTY,
        UNKNOWN_ELEMENT,
        UNKNOWN_INSTANCE,
        UNKNOWN_METHOD,
    }
}
