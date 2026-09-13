package io.github.angularwave.android.navigation.files

import io.github.angularwave.android.navigation.bridge.NativeBridgeProtocol
import io.github.angularwave.android.navigation.bridge.NativeCapabilityException
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativeFileUploaderTest {
    @Test
    fun `uploads selected content as multipart data`() {
        val connection = FakeConnection(201, "{\"id\":\"post-9\"}")
        val progress = mutableListOf<Pair<Long, Long?>>()
        val uploader = uploader(connection, progress)
        val result =
            uploader.upload(
                JSONObject()
                    .put("uri", "content://pulse/photo.jpg")
                    .put("url", "https://pulse.example/api/uploads")
                    .put("name", "photo.jpg")
                    .put("type", "image/jpeg")
                    .put("fields", JSONObject().put("caption", "Morning light"))
                    .put("headers", JSONObject().put("X-Request-Id", "request-1"))
            )

        val body = connection.output.toString(Charsets.UTF_8.name())
        assertEquals(201, result.getInt("status"))
        assertEquals("post-9", result.getJSONObject("body").getString("id"))
        assertEquals("request-1", connection.getRequestProperty("X-Request-Id"))
        assertEquals("pulse_session=demo", connection.getRequestProperty("Cookie"))
        assertTrue(body.contains("name=\"caption\""))
        assertTrue(body.contains("Morning light"))
        assertTrue(body.contains("filename=\"photo.jpg\""))
        assertTrue(body.contains("image-bytes"))
        assertEquals(listOf(0L to 11L, 11L to 11L), progress)
    }

    @Test
    fun `rejects cross-origin uploads`() {
        val error =
            assertThrows(NativeCapabilityException::class.java) {
                uploader(FakeConnection())
                    .upload(
                        JSONObject()
                            .put("uri", "content://pulse/photo.jpg")
                            .put("url", "https://attacker.example/upload")
                    )
            }
        assertEquals(NativeBridgeProtocol.ErrorCode.UNAUTHORIZED, error.code)
    }

    @Test
    fun `rejects non-content file sources and forbidden headers`() {
        val uploader = uploader(FakeConnection())
        assertThrows(NativeCapabilityException::class.java) {
            uploader.upload(
                JSONObject()
                    .put("uri", "file:///data/private.jpg")
                    .put("url", "https://pulse.example/upload")
            )
        }
        assertThrows(NativeCapabilityException::class.java) {
            uploader.upload(
                JSONObject()
                    .put("uri", "content://pulse/photo.jpg")
                    .put("url", "https://pulse.example/upload")
                    .put("headers", JSONObject().put("Content-Type", "text/plain"))
            )
        }
    }

    @Test
    fun `reports unsuccessful upload responses`() {
        val error =
            assertThrows(NativeCapabilityException::class.java) {
                uploader(FakeConnection(503, "unavailable"))
                    .upload(
                        JSONObject()
                            .put("uri", "content://pulse/photo.jpg")
                            .put("url", "https://pulse.example/upload")
                    )
            }
        assertEquals(NativeBridgeProtocol.ErrorCode.UNAVAILABLE, error.code)
    }

    private fun uploader(
        connection: FakeConnection,
        progress: MutableList<Pair<Long, Long?>> = mutableListOf(),
    ) =
        NativeFileUploader(
            origin = "https://pulse.example/feed",
            openInput = { ByteArrayInputStream("image-bytes".toByteArray()) },
            contentType = { "image/jpeg" },
            contentLength = { 11L },
            defaultHeaders = mapOf("Cookie" to "pulse_session=demo"),
            progress = { sent, total -> progress += sent to total },
            openConnection = { connection },
        )

    private class FakeConnection(
        private val status: Int = 200,
        private val response: String = "{}",
    ) : HttpURLConnection(URL("https://pulse.example/upload")) {
        val output = ByteArrayOutputStream()

        override fun connect() = Unit

        override fun disconnect() = Unit

        override fun usingProxy() = false

        override fun getOutputStream() = output

        override fun getResponseCode() = status

        override fun getInputStream() = ByteArrayInputStream(response.toByteArray())

        override fun getErrorStream() = ByteArrayInputStream(response.toByteArray())
    }
}
