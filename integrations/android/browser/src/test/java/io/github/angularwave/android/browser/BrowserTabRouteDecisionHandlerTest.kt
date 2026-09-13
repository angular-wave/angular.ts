package io.github.angularwave.android.browser

import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration
import io.github.angularwave.android.navigation.routing.RouteDecisionHandlerProvider
import java.util.ServiceLoader
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class BrowserTabRouteDecisionHandlerTest {
    private val route = BrowserTabRouteDecisionHandler()
    private val config = NavigatorConfiguration("test", "https://my.app.com", 0)

    @Test
    fun `matches only external HTTP locations`() {
        assertTrue(route.matches("https://external.com/page", config))
        assertTrue(route.matches("http://app.com/page", config))
        assertFalse(route.matches("https://my.app.com/page", config))
        assertFalse(route.matches("sms:555-555-5555", config))
    }

    @Test
    fun `generated metadata discovers the browser route provider`() {
        val providers = ServiceLoader.load(RouteDecisionHandlerProvider::class.java).toList()

        assertTrue(providers.any { it is BrowserRouteDecisionHandlerProvider })
    }
}
