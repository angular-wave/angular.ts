package io.github.angularwave.android.navigation.session

import android.os.Bundle
import androidx.lifecycle.SavedStateHandle
import io.github.angularwave.android.core.ng.visit.VisitAction
import io.github.angularwave.android.core.ng.visit.VisitOptions
import io.github.angularwave.android.core.ng.visit.VisitResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class SessionViewModelTest {
    @Test
    fun `visit action survives process recreation without retaining response content`() {
        val state = SavedStateHandle()
        val original = SessionViewModel(state)
        original.saveVisitOptions(
            VisitOptions(
                action = VisitAction.REPLACE,
                snapshotHTML = "<p>cached</p>",
                response = VisitResponse(statusCode = 200, responseHTML = "<p>response</p>"),
            )
        )

        val restored = SessionViewModel(state)
        val options = restored.visitOptions?.getContentIfNotHandled()

        assertEquals(VisitAction.REPLACE, options?.action)
        assertNull(options?.snapshotHTML)
        assertNull(options?.response)
        assertNull(SessionViewModel(state).visitOptions)
    }

    @Test
    fun `modal result survives process recreation and is delivered once`() {
        val state = SavedStateHandle()
        val original = SessionViewModel(state)
        original.sendModalResult(
            SessionModalResult(
                location = "/posts/42",
                options = VisitOptions(action = VisitAction.RESTORE),
                bundle = Bundle().apply { putString("filter", "recent") },
            )
        )

        val restored = SessionViewModel(state)
        assertTrue(restored.modalResultExists)
        val result = restored.modalResult.value?.getContentIfNotHandled()

        assertEquals("/posts/42", result?.location)
        assertEquals(VisitAction.RESTORE, result?.options?.action)
        assertEquals("recent", result?.bundle?.getString("filter"))
        assertFalse(restored.modalResultExists)
        assertNull(restored.modalResult.value?.getContentIfNotHandled())
        assertFalse(SessionViewModel(state).modalResultExists)
    }

    @Test
    fun `malformed restored state is discarded`() {
        val state = SavedStateHandle(mapOf("angularNative.visitAction" to "unknown"))

        assertNull(SessionViewModel(state).visitOptions)
    }
}
