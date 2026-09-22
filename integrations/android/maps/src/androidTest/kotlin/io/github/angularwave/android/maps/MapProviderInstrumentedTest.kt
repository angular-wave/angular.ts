package io.github.angularwave.android.maps

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MapProviderInstrumentedTest {
    @Test
    fun startupRegistersProviderOnAndroid() {
        val providers = AndroidNativeProviders.elementProviders()

        assertTrue(providers.any { it is MapElementProvider })
    }
}
