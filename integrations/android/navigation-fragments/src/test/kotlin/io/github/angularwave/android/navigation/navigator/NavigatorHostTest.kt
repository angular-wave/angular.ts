package io.github.angularwave.android.navigation.navigator

import android.content.Intent
import android.os.Bundle
import io.github.angularwave.android.navigation.activities.AngularNativeActivity
import org.assertj.core.api.Assertions.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NavigatorHostTest {
    private lateinit var activity: TestActivity
    private lateinit var host: NavigatorHost

    @Before
    fun setUp() {
        host = NavigatorHost()
    }

    @Test
    fun `reverts to config start location when deep link host differs`() {
        val extras = Bundle().apply { putString(LOCATION_KEY, "https://other.com/path") }
        val intent = Intent().apply { putExtra(DEEPLINK_EXTRAS_KEY, extras) }
        activity = Robolectric.buildActivity(TestActivity::class.java, intent).get()

        host.activity = activity
        host.ensureDeeplinkStartLocationValid()

        val resultBundle = activity.intent.getBundleExtra(DEEPLINK_EXTRAS_KEY)
        assertThat(resultBundle?.getString(LOCATION_KEY)).isEqualTo("https://example.com/start")
    }

    @Test
    fun `does not change start location when deep link host matches config`() {
        val extras = Bundle().apply { putString(LOCATION_KEY, "https://example.com/path") }
        val intent = Intent().apply { putExtra(DEEPLINK_EXTRAS_KEY, extras) }
        activity = Robolectric.buildActivity(TestActivity::class.java, intent).get()

        host.activity = activity
        host.ensureDeeplinkStartLocationValid()

        val resultBundle = activity.intent.getBundleExtra(DEEPLINK_EXTRAS_KEY)
        assertThat(resultBundle?.getString(LOCATION_KEY)).isEqualTo("https://example.com/path")
    }

    @Test
    fun `reverts deep links with a different scheme or port`() {
        listOf("http://example.com/path", "https://example.com:8443/path", "/path").forEach {
            location ->
            val extras = Bundle().apply { putString(LOCATION_KEY, location) }
            val intent = Intent().apply { putExtra(DEEPLINK_EXTRAS_KEY, extras) }
            activity = Robolectric.buildActivity(TestActivity::class.java, intent).get()
            host.activity = activity

            host.ensureDeeplinkStartLocationValid()

            val resultBundle = activity.intent.getBundleExtra(DEEPLINK_EXTRAS_KEY)
            assertThat(resultBundle?.getString(LOCATION_KEY)).isEqualTo("https://example.com/start")
        }
    }

    @Test
    fun `accepts an explicit default origin port`() {
        val extras = Bundle().apply { putString(LOCATION_KEY, "https://example.com:443/path") }
        val intent = Intent().apply { putExtra(DEEPLINK_EXTRAS_KEY, extras) }
        activity = Robolectric.buildActivity(TestActivity::class.java, intent).get()
        host.activity = activity

        host.ensureDeeplinkStartLocationValid()

        val resultBundle = activity.intent.getBundleExtra(DEEPLINK_EXTRAS_KEY)
        assertThat(resultBundle?.getString(LOCATION_KEY)).isEqualTo("https://example.com:443/path")
    }

    private class TestActivity : AngularNativeActivity() {
        private val navConfig =
            NavigatorConfiguration(
                name = "test",
                startLocation = "https://example.com/start",
                navigatorHostId = 0,
            )

        override fun navigatorConfigurations(): List<NavigatorConfiguration> = listOf(navConfig)
    }
}
