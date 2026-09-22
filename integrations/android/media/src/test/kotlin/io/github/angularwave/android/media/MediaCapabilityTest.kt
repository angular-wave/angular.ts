package io.github.angularwave.android.media

import androidx.test.core.app.ApplicationProvider
import io.github.angularwave.android.navigation.bridge.NativeCapabilityErrorCode
import io.github.angularwave.android.navigation.bridge.NativeCapabilityException
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class MediaCapabilityTest {
    private val capability = MediaCapability(ApplicationProvider.getApplicationContext())

    @Test
    fun `advertises playback operations without creating a player`() {
        assertEquals("media", capability.target)
        assertEquals(
            setOf("status", "load", "play", "pause", "stop", "seek", "release"),
            capability.methods,
        )
        val status = capability.invoke("status", JSONObject()) as JSONObject
        assertTrue(status.getBoolean("available"))
        assertFalse(status.getBoolean("loaded"))
        assertEquals("idle", status.getString("state"))
    }

    @Test
    fun `rejects unsafe sources and invalid positions`() {
        val source =
            assertThrows(NativeCapabilityException::class.java) {
                capability.invoke("load", JSONObject().put("url", "file:///private/video.mp4"))
            }
        val position =
            assertThrows(NativeCapabilityException::class.java) {
                capability.invoke("seek", JSONObject().put("position", -1))
            }

        assertEquals(NativeCapabilityErrorCode.INVALID_PARAMS, source.errorCode)
        assertEquals(NativeCapabilityErrorCode.INVALID_PARAMS, position.errorCode)
    }

    @Test
    fun `release is idempotent`() {
        capability.close()
        capability.close()
    }
}
