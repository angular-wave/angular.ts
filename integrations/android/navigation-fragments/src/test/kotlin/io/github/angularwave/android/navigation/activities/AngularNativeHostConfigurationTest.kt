package io.github.angularwave.android.navigation.activities

import android.os.Bundle
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AngularNativeHostConfigurationTest {
    @Test
    fun `reads a complete manifest configuration`() {
        val configuration =
            AngularNativeHostConfiguration.from(
                Bundle().apply {
                    putString(
                        AngularNativeHostConfiguration.START_LOCATION,
                        "https://pulse.example/feed",
                    )
                    putString(AngularNativeHostConfiguration.NAVIGATOR_NAME, "pulse")
                    putString(
                        AngularNativeHostConfiguration.PATH_CONFIGURATION_ASSET,
                        "pulse/navigation.json",
                    )
                    putString(
                        AngularNativeHostConfiguration.PATH_CONFIGURATION_URL,
                        "https://pulse.example/navigation.json",
                    )
                    putString(AngularNativeHostConfiguration.USER_AGENT_PREFIX, "Pulse;")
                }
            )

        assertEquals("https://pulse.example/feed", configuration.startLocation)
        assertEquals("pulse", configuration.navigatorName)
        assertEquals("pulse/navigation.json", configuration.pathConfigurationAsset)
        assertEquals(
            "https://pulse.example/navigation.json",
            configuration.pathConfigurationUrl,
        )
        assertEquals("Pulse;", configuration.userAgentPrefix)
    }

    @Test
    fun `supplies useful defaults`() {
        val configuration =
            AngularNativeHostConfiguration.from(
                Bundle().apply {
                    putString(
                        AngularNativeHostConfiguration.START_LOCATION,
                        "http://10.0.2.2:4175/",
                    )
                }
            )

        assertEquals("main", configuration.navigatorName)
        assertEquals(
            "angular-native/path-configuration.json",
            configuration.pathConfigurationAsset,
        )
        assertNull(configuration.pathConfigurationUrl)
        assertNull(configuration.userAgentPrefix)
    }

    @Test
    fun `rejects missing and unsafe locations`() {
        assertThrows(IllegalArgumentException::class.java) {
            AngularNativeHostConfiguration.from(Bundle())
        }
        assertThrows(IllegalArgumentException::class.java) {
            AngularNativeHostConfiguration.from(
                Bundle().apply {
                    putString(
                        AngularNativeHostConfiguration.START_LOCATION,
                        "file:///data/private.html",
                    )
                }
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AngularNativeHostConfiguration.from(
                Bundle().apply {
                    putString(
                        AngularNativeHostConfiguration.START_LOCATION,
                        "https://pulse.example",
                    )
                    putString(
                        AngularNativeHostConfiguration.PATH_CONFIGURATION_URL,
                        "javascript:alert(1)",
                    )
                }
            )
        }
    }
}
