package io.github.angularwave.android.navigation.elements

import android.view.View
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeElementRegistryTest {
    private val factory = NativeElementFactory { context, _ ->
        object : NativeElementInstance {
            override val view = View(context.context)

            override fun update(properties: NativeProperties) {}
        }
    }

    @Test
    fun `resolves canonical names and aliases`() {
        val definition =
            NativeElementDefinition("button", setOf("native-button"), factory = factory)
        val registry = NativeElementRegistry(listOf(definition))

        assertTrue(registry.contains("button"))
        assertTrue(registry.contains(" NATIVE-BUTTON "))
        assertEquals(definition, registry.definition("native-button"))
        assertFalse(registry.contains("missing"))
    }

    @Test
    fun `rejects duplicate names and aliases`() {
        val first = NativeElementDefinition("button", setOf("action"), factory = factory)
        val second = NativeElementDefinition("action", factory = factory)

        assertThrows(IllegalArgumentException::class.java) {
            NativeElementRegistry(listOf(first, second))
        }
    }

    @Test
    fun `publishes current built-in metadata`() {
        assertTrue(AndroidNativeElements.registry.contains("native-card"))
        assertTrue(AndroidNativeElements.registry.contains("native-image"))
        assertTrue(AndroidNativeElements.registry.contains("compose-drawer"))
        assertEquals(
            NativeElementCatalog.builtIns.map { it.name }.toSet(),
            AndroidNativeElements.registry.definitions.map { it.name }.toSet(),
        )
        NativeElementCatalog.builtIns.forEach { expected ->
            val actual = AndroidNativeElements.registry.definition(expected.name)

            assertEquals(expected.aliases, actual?.aliases)
            assertEquals(expected.properties, actual?.properties)
            assertEquals(expected.events, actual?.events)
            assertEquals(expected.methods, actual?.methods)
            assertEquals(expected.category, actual?.category)
            assertEquals(expected.maturity, actual?.maturity)
            assertEquals(expected.minSdk, actual?.minSdk)
            assertEquals(expected.stateOwnership, actual?.stateOwnership)
            assertEquals(expected.accessibility, actual?.accessibility)
        }
    }

    @Test
    fun `discovers application and library providers`() {
        val definition = NativeElementDefinition("task-card", factory = factory)
        val provider = NativeElementProvider { listOf(definition) }

        val registry = NativeElementRegistry.fromProviders(emptyList(), listOf(provider))

        assertEquals(definition, registry.definition("task-card"))
    }
}
