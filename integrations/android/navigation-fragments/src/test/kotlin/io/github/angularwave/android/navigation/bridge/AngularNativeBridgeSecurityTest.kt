package io.github.angularwave.android.navigation.bridge

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class AngularNativeBridgeSecurityTest {
    private val security = AngularNativeBridgeSecurity(
        destinationLocation = "https://example.com/dashboard",
        sessionToken = "session-1"
    )

    @Test
    fun `accepts matching sessions from the destination origin`() {
        assertThat(
            security.accepts("session-1", "https://EXAMPLE.com:443/settings?q=1")
        ).isTrue()
    }

    @Test
    fun `rejects missing and mismatched sessions`() {
        assertThat(security.accepts(null, "https://example.com/settings")).isFalse()
        assertThat(security.accepts("wrong", "https://example.com/settings")).isFalse()
    }

    @Test
    fun `rejects calls from another origin`() {
        assertThat(security.accepts("session-1", "http://example.com/settings")).isFalse()
        assertThat(security.accepts("session-1", "https://example.com:8443/settings")).isFalse()
        assertThat(security.accepts("session-1", "https://other.example/settings")).isFalse()
        assertThat(security.accepts("session-1", "not a url")).isFalse()
    }
}
