package io.github.angularwave.android.navigation.routing

import io.github.angularwave.android.navigation.activities.AngularNativeActivity
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric.buildActivity
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AppNavigationRouteDecisionHandlerTest {
    private lateinit var activity: AngularNativeActivity

    private val route = AppNavigationRouteDecisionHandler()
    private val config =
        NavigatorConfiguration(
            name = "test",
            startLocation = "https://my.app.com",
            navigatorHostId = 0,
        )

    @Before
    fun setup() {
        activity = buildActivity(TestActivity::class.java).get()
    }

    @Test
    fun `matching result navigates`() {
        val decision = route.handle(config.startLocation, config, activity)
        assertEquals(Router.Decision.NAVIGATE, decision)
    }

    @Test
    fun `url on app domain matches`() {
        val url = "https://my.app.com/page"
        assertTrue(route.matches(url, config))
    }

    @Test
    fun `url without subdomain does not match`() {
        val url = "https://app.com/page"
        assertFalse(route.matches(url, config))
    }

    @Test
    fun `masqueraded url does not match`() {
        val url = "https://app.my.com@fake.domain"
        assertFalse(route.matches(url, config))
    }

    private class TestActivity : AngularNativeActivity() {
        override fun navigatorConfigurations() = emptyList<NavigatorConfiguration>()
    }
}
