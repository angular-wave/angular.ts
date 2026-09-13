package io.github.angularwave.android.browser

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BrowserProviderInstrumentedTest {
    @Test
    fun startupRegistersProviderOnAndroid() {
        val providers = AndroidNativeProviders.routeDecisionHandlerProviders()

        assertTrue(providers.any { it is BrowserRouteDecisionHandlerProvider })
    }
}
