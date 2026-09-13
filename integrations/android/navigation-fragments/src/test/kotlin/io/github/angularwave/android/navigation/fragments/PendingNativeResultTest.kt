package io.github.angularwave.android.navigation.fragments

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PendingNativeResultTest {
    @Test
    fun `completes one registered result exactly once`() {
        val pending = PendingNativeResult<String>()
        val values = mutableListOf<String>()

        assertTrue(pending.register(values::add))
        assertFalse(pending.register { values += "duplicate:$it" })

        pending.complete("first")
        pending.complete("stale")

        assertEquals(listOf("first"), values)
    }

    @Test
    fun `cancellation suppresses a stale result and permits a new request`() {
        val pending = PendingNativeResult<String>()
        val values = mutableListOf<String>()

        assertTrue(pending.register { values += "removed:$it" })
        pending.cancel()
        pending.complete("stale")
        assertTrue(pending.register { values += "active:$it" })
        pending.complete("current")

        assertEquals(listOf("active:current"), values)
    }

    @Test
    fun `clears the request before invoking its callback`() {
        val pending = PendingNativeResult<String>()
        val values = mutableListOf<String>()

        pending.register {
            values += it
            assertTrue(pending.register(values::add))
        }
        pending.complete("first")
        pending.complete("second")

        assertEquals(listOf("first", "second"), values)
    }
}
