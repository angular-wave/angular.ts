package io.github.angularwave.android.navigation.elements

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import org.json.JSONObject

private fun firstFocusable(view: View): View? {
    if (view.isFocusable) return view
    if (view !is ViewGroup) return null
    for (index in 0 until view.childCount) {
        firstFocusable(view.getChildAt(index))?.let {
            return it
        }
    }
    return null
}

internal fun configureTraversal(views: List<View>) {
    var previousRoot: View? = null
    val focusTargets = mutableListOf<View>()
    views.forEach { view ->
        if (view.id == View.NO_ID) view.id = View.generateViewId()
        view.accessibilityTraversalAfter = previousRoot?.id ?: View.NO_ID
        previousRoot = view
        firstFocusable(view)?.let(focusTargets::add)
    }
    focusTargets.forEach { view ->
        if (view.id == View.NO_ID) view.id = View.generateViewId()
    }
    focusTargets.zipWithNext().forEach { (view, next) -> view.nextFocusForwardId = next.id }
    focusTargets.lastOrNull()?.nextFocusForwardId = View.NO_ID
}

/** Owns keyed child elements for native layout containers. */
internal class NativeChildStore(
    private val registry: NativeElementRegistry,
    private val context: NativeElementContext,
    private val container: ViewGroup,
) {
    data class Child(
        val key: String,
        val name: String,
        val view: View,
        var propertiesSignature: String,
        var retained: Boolean,
    )

    private data class Descriptor(
        val key: String,
        val name: String,
        val properties: JSONObjectProperties,
        val propertiesSignature: String,
        val retained: Boolean,
    )

    private val children = linkedMapOf<String, Child>()

    fun reconcile(values: NativeProperties): List<Child> {
        val activeKeys = linkedSetOf<String>()
        val descriptors =
            values.objects(NativeElementCatalog.Wire.CHILDREN).mapIndexed { index, descriptor ->
                val key = descriptor.optString("key").ifEmpty { index.toString() }
                require(activeKeys.add(key)) { "Native child keys must be unique: $key" }
                val name = descriptor.optString("name")
                require(name.isNotBlank()) { "Native child $key requires a name" }
                val values = descriptor.optJSONObject("props") ?: JSONObject()
                Descriptor(
                    key = key,
                    name = name,
                    properties = JSONObjectProperties(values),
                    propertiesSignature = values.toString(),
                    retained = descriptor.optBoolean("retain"),
                )
            }
        val ordered = descriptors.map { descriptor ->
            val key = descriptor.key
            val name = descriptor.name
            var mounted = children[key]
            if (mounted != null && mounted.name != name) {
                detachAndDispose(mounted)
                mounted = null
            }
            if (mounted == null) {
                val view =
                    registry.create(
                        name,
                        context.copy(
                            container = container,
                            events = { event, data ->
                                context.events.emit(
                                    NativeElementCatalog.Wire.CHILD_EVENT,
                                    JSONObject()
                                        .put("key", key)
                                        .put("event", event)
                                        .put("data", data),
                                )
                            },
                        ),
                        descriptor.properties,
                    )
                mounted =
                    Child(
                        key,
                        name,
                        view,
                        descriptor.propertiesSignature,
                        descriptor.retained,
                    )
                children[key] = mounted
            } else if (mounted.propertiesSignature != descriptor.propertiesSignature) {
                registry.update(mounted.view, descriptor.properties)
                mounted.propertiesSignature = descriptor.propertiesSignature
            }
            mounted.retained = descriptor.retained
            mounted
        }
        children.keys
            .filter { it !in activeKeys }
            .forEach { key ->
                children[key]?.let { child ->
                    if (child.retained) {
                        (child.view.parent as? ViewGroup)?.removeView(child.view)
                    } else {
                        children.remove(key)?.let(::detachAndDispose)
                    }
                }
            }
        configureTraversal(ordered.map(Child::view))
        return ordered
    }

    fun saveState(destination: Bundle) {
        children.forEach { (key, child) ->
            registry.saveState(child.view)?.let { destination.putBundle("child:$key", it) }
        }
    }

    fun restoreState(source: Bundle) {
        children.forEach { (key, child) ->
            source.getBundle("child:$key")?.let { registry.restoreState(child.view, it) }
        }
    }

    fun dispose() {
        children.values.toList().forEach(::detachAndDispose)
        children.clear()
    }

    private fun detachAndDispose(child: Child) {
        (child.view.parent as? ViewGroup)?.removeView(child.view)
        registry.dispose(child.view)
    }
}
