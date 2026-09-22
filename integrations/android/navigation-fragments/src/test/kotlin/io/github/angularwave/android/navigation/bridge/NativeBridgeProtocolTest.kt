package io.github.angularwave.android.navigation.bridge

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativeBridgeProtocolTest {
    @Test
    fun `parses a versioned request`() {
        val result =
            NativeBridgeProtocol.parse(
                """{"protocol":1,"id":"1","target":"navigation","method":"back"}"""
            )

        assertEquals(
            NativeBridgeProtocol.ParseResult.Success(
                NativeBridgeProtocol.Request("1", "navigation", "back", null, null)
            ),
            result,
        )
    }

    @Test
    fun `parses a cancellation control request`() {
        val result =
            NativeBridgeProtocol.parse(
                """{"protocol":1,"id":"1:cancel","target":"bridge","method":"cancel","params":{"id":"1"}}"""
            )

        assertTrue(result is NativeBridgeProtocol.ParseResult.Success)
        val request = (result as NativeBridgeProtocol.ParseResult.Success).request
        assertEquals("bridge", request.target)
        assertEquals("cancel", request.method)
        assertEquals("1", request.params?.getString("id"))
    }

    @Test
    fun `parses every shared request fixture`() {
        val resource = requireNotNull(javaClass.getResource("/native-bridge-fixtures.json"))
        val fixtures = JSONObject(resource.readText())
        val requests =
            JSONArray(
                listOf(fixtures.getJSONObject("request"), fixtures.getJSONObject("cancelRequest"))
            )

        for (index in 0 until requests.length()) {
            assertTrue(
                NativeBridgeProtocol.parse(requests.getJSONObject(index).toString())
                    is NativeBridgeProtocol.ParseResult.Success
            )
        }
    }

    @Test
    fun `rejects malformed and incomplete requests`() {
        assertFailure(null, NativeBridgeProtocol.ErrorCode.INVALID_MESSAGE)
        assertFailure("not-json", NativeBridgeProtocol.ErrorCode.INVALID_MESSAGE)
        assertFailure("{}", NativeBridgeProtocol.ErrorCode.INVALID_MESSAGE)
        assertFailure(
            """{"id":"1","target":"x","method":"y"}""",
            NativeBridgeProtocol.ErrorCode.PROTOCOL_MISMATCH,
        )
        assertFailure(
            """{"protocol":1,"id":"1","method":"y"}""",
            NativeBridgeProtocol.ErrorCode.INVALID_MESSAGE,
        )
        assertFailure(
            """{"protocol":1,"id":"1","target":"x"}""",
            NativeBridgeProtocol.ErrorCode.INVALID_MESSAGE,
        )
    }

    @Test
    fun `rejects oversized requests without parsing them`() {
        val result =
            NativeBridgeProtocol.parse("x".repeat(NativeBridgeProtocol.MAX_MESSAGE_BYTES + 1))

        assertTrue(result is NativeBridgeProtocol.ParseResult.Failure)
        assertEquals(
            NativeBridgeProtocol.ErrorCode.PAYLOAD_TOO_LARGE,
            (result as NativeBridgeProtocol.ParseResult.Failure).code,
        )
    }

    private fun assertFailure(
        message: String?,
        code: NativeBridgeProtocol.ErrorCode,
    ) {
        val result = NativeBridgeProtocol.parse(message)

        assertTrue(result is NativeBridgeProtocol.ParseResult.Failure)
        assertEquals(code, (result as NativeBridgeProtocol.ParseResult.Failure).code)
    }
}
