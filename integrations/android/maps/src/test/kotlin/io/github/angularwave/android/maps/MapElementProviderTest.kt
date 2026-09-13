package io.github.angularwave.android.maps

import io.github.angularwave.android.navigation.elements.NativeElementCatalog
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MapElementProviderTest {
    @Test
    fun `definition comes from the generated catalog`() {
        val definition = MapElementProvider().definitions().single()

        assertEquals("map", definition.name)
        assertEquals(setOf("move", "animate", "fitMarkers"), definition.methods)
        assertTrue("cameraChange" in definition.events)
        assertTrue(definition.properties.any { it.name == NativeElementCatalog.Wire.MARKERS })
    }
}
