package io.github.angularwave.android.sample.elements

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TaskCardProviderInstrumentedTest {
    @Test
    fun startupRegistersProvidersOnAndroid() {
        val providers = AndroidNativeProviders.elementProviders()

        assertTrue(providers.any { it is TaskCardProvider })
        assertTrue(
            AndroidNativeProviders.capabilityProviders().any {
                it is DeviceInfoCapabilityProvider
            }
        )
    }
}
