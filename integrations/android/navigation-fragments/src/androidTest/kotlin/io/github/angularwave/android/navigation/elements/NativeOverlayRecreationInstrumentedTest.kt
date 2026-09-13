package io.github.angularwave.android.navigation.elements

import android.content.Intent
import android.view.KeyEvent
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeOverlayRecreationInstrumentedTest {
    @Test
    fun openDialogRestoresAcrossActivityRecreation() {
        ActivityScenario.launch<NativeElementTestActivity>(dialogIntent()).use { scenario ->
            assertOpenWithoutDuplicateEvents(scenario)
            scenario.recreate()
            assertOpenWithoutDuplicateEvents(scenario)
        }
    }

    @Test
    fun androidBackDismissesOnceAndReturnsFocus() {
        ActivityScenario.launch<NativeElementTestActivity>(dialogIntent()).use { scenario ->
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK)

            scenario.onActivity { activity ->
                val overlay = requireNotNull(activity.restoredOverlay)

                assertTrue(overlay.hasFocus())
                assertEquals(
                    listOf(
                        NativeElementCatalog.Wire.SHOW,
                        NativeElementCatalog.Wire.CANCEL,
                        NativeElementCatalog.Wire.DISMISS,
                    ),
                    activity.overlayEvents,
                )
            }
        }
    }

    private fun assertOpenWithoutDuplicateEvents(
        scenario: ActivityScenario<NativeElementTestActivity>
    ) {
        scenario.onActivity { activity ->
            val overlay = requireNotNull(activity.restoredOverlay)
            val state = requireNotNull(AndroidNativeElements.registry.saveState(overlay))

            assertTrue(state.keySet().any(state::getBoolean))
            assertEquals(listOf(NativeElementCatalog.Wire.SHOW), activity.overlayEvents)
        }
    }

    private fun dialogIntent() =
        Intent(
                ApplicationProvider.getApplicationContext(),
                NativeElementTestActivity::class.java,
            )
            .putExtra(NativeElementTestActivity.EXTRA_RESTORABLE_DIALOG, true)
}
