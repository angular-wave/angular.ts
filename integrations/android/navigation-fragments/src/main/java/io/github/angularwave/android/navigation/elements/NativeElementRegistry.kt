package io.github.angularwave.android.navigation.elements

import android.os.Bundle
import android.view.View
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders
import java.util.WeakHashMap
import org.json.JSONObject

class NativeElementRegistry(definitions: Collection<NativeElementDefinition>) {
    companion object {
        fun discover(
            builtIns: Collection<NativeElementDefinition>,
            classLoader: ClassLoader =
                checkNotNull(NativeElementProvider::class.java.classLoader) {
                    "Native element provider class loader is unavailable"
                },
        ): NativeElementRegistry =
            fromProviders(
                builtIns,
                AndroidNativeProviders.discoverElementProviders(classLoader),
            )

        fun fromProviders(
            builtIns: Collection<NativeElementDefinition>,
            providers: Iterable<NativeElementProvider>,
        ): NativeElementRegistry =
            NativeElementRegistry(builtIns + providers.flatMap { it.definitions() })
    }

    val definitions: List<NativeElementDefinition> = definitions.sortedBy { it.name }

    private val definitionsByName = buildMap {
        this@NativeElementRegistry.definitions.forEach { definition ->
            putUnique(definition.name, definition)
            definition.aliases.forEach { alias -> putUnique(alias, definition) }
        }
    }

    private val instances = WeakHashMap<View, MountedElement>()

    fun contains(name: String): Boolean = definitionsByName.containsKey(normalize(name))

    fun definition(name: String): NativeElementDefinition? = definitionsByName[normalize(name)]

    fun create(
        name: String,
        context: NativeElementContext,
        properties: JSONObjectProperties,
    ): View {
        val definition =
            definition(name)
                ?: throw NativeElementException(
                    NativeElementException.Code.UNKNOWN_ELEMENT,
                    "Unsupported native element: $name",
                )
        val prepared = prepareProperties(definition, properties.value)
        val nativeProperties = NativeProperties(prepared)
        val instance = definition.factory.create(context, nativeProperties)
        applyNativePresentation(instance.view, nativeProperties, definition.name)
        instances[instance.view] = MountedElement(definition, instance)
        return instance.view
    }

    fun update(
        view: View,
        properties: JSONObjectProperties,
    ) {
        val mounted =
            instances[view]
                ?: throw NativeElementException(
                    NativeElementException.Code.UNKNOWN_INSTANCE,
                    "Unknown native element view",
                )
        val prepared = prepareProperties(mounted.definition, properties.value)
        val nativeProperties = NativeProperties(prepared)
        mounted.instance.update(nativeProperties)
        applyNativePresentation(
            mounted.instance.view,
            nativeProperties,
            mounted.definition.name,
        )
    }

    fun invoke(
        view: View,
        method: String,
        parameters: JSONObjectProperties,
    ): Any? {
        val mounted =
            instances[view]
                ?: throw NativeElementException(
                    NativeElementException.Code.UNKNOWN_INSTANCE,
                    "Unknown native element view",
                )
        if (method !in mounted.definition.methods) {
            throw NativeElementException(
                NativeElementException.Code.UNKNOWN_METHOD,
                "${mounted.definition.name} does not support method $method",
            )
        }
        return mounted.instance.invoke(method, NativeProperties(parameters.value))
    }

    fun saveState(view: View): Bundle? = instances[view]?.instance?.saveState()

    fun restoreState(
        view: View,
        state: Bundle,
    ) {
        instances[view]?.instance?.restoreState(state)
    }

    fun dispose(view: View) {
        instances.remove(view)?.instance?.dispose()
    }

    private fun MutableMap<String, NativeElementDefinition>.putUnique(
        name: String,
        definition: NativeElementDefinition,
    ) {
        val key = normalize(name)
        require(key.isNotEmpty()) { "Native element names cannot be empty" }
        require(put(key, definition) == null) { "Duplicate native element name: $name" }
    }

    private fun validateProperties(
        definition: NativeElementDefinition,
        properties: org.json.JSONObject,
    ) {
        val declared = definition.properties.associateBy { it.name }
        properties.keys().forEach { name ->
            if (name == NATIVE_STYLE_PROPERTY) {
                if (properties.opt(name) !is JSONObject) {
                    throw NativeElementException(
                        NativeElementException.Code.INVALID_PROPERTY,
                        "${definition.name} property $name must be json",
                    )
                }
                return@forEach
            }
            val property =
                declared[name]
                    ?: throw NativeElementException(
                        NativeElementException.Code.INVALID_PROPERTY,
                        "${definition.name} does not support property $name",
                    )
            val value = properties.opt(name)
            val valid =
                (value == JSONObject.NULL && property.nullable) ||
                    when (property.type) {
                        NativePropertyType.BOOLEAN -> {
                            value is Boolean
                        }

                        NativePropertyType.COLOR,
                        NativePropertyType.STRING -> {
                            value is String
                        }

                        NativePropertyType.FLOAT -> {
                            value is Number
                        }

                        NativePropertyType.INTEGER -> {
                            value is Number && value.toDouble() % 1.0 == 0.0
                        }

                        NativePropertyType.JSON -> {
                            value is JSONObject || value is org.json.JSONArray
                        }

                        NativePropertyType.STRING_LIST -> {
                            value is org.json.JSONArray &&
                                (0 until value.length()).all { value.opt(it) is String }
                        }
                    }
            if (!valid) {
                throw NativeElementException(
                    NativeElementException.Code.INVALID_PROPERTY,
                    "${definition.name} property $name must be ${property.type.name.lowercase()}",
                )
            }
        }
        definition.properties
            .filter { it.required }
            .forEach { property ->
                if (!properties.has(property.name) || properties.isNull(property.name)) {
                    throw NativeElementException(
                        NativeElementException.Code.INVALID_PROPERTY,
                        "${definition.name} requires property ${property.name}",
                    )
                }
            }
    }

    private fun prepareProperties(
        definition: NativeElementDefinition,
        properties: JSONObject,
    ): JSONObject {
        validateProperties(definition, properties)
        return JSONObject().apply {
            definition.properties.forEach { property ->
                property.defaultValue?.let { put(property.name, it) }
            }
            properties.keys().forEach { name -> put(name, properties.opt(name)) }
        }
    }

    private fun normalize(name: String): String = name.trim().lowercase()

    private data class MountedElement(
        val definition: NativeElementDefinition,
        val instance: NativeElementInstance,
    )
}

internal const val NATIVE_STYLE_PROPERTY = "style"

@JvmInline value class JSONObjectProperties(val value: org.json.JSONObject)
