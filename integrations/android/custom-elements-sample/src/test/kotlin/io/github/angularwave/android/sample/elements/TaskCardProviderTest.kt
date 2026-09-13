package io.github.angularwave.android.sample.elements

import io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider
import io.github.angularwave.android.navigation.elements.NativeElementProvider
import java.util.ServiceLoader
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TaskCardProviderTest {
    @Test
    fun `provider is discovered without application registration`() {
        val providers =
            ServiceLoader.load(
                    NativeElementProvider::class.java,
                    TaskCardProvider::class.java.classLoader,
                )
                .toList()

        assertTrue(providers.any { it is TaskCardProvider })
        assertEquals(
            setOf("task-card", "task-status"),
            TaskCardProvider().definitions().map { it.name }.toSet(),
        )
    }

    @Test
    fun `capability provider is discovered without application registration`() {
        val providers =
            ServiceLoader.load(
                    NativeCapabilityProvider::class.java,
                    DeviceInfoCapabilityProvider::class.java.classLoader,
                )
                .toList()

        assertTrue(providers.any { it is DeviceInfoCapabilityProvider })
    }
}
