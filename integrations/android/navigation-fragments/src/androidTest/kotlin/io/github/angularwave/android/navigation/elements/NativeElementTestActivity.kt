package io.github.angularwave.android.navigation.elements

import android.os.Bundle
import android.view.View
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import org.json.JSONObject

class NativeElementTestActivity : ComponentActivity() {
    var restoredOverlay: View? = null
        private set

    val overlayEvents = mutableListOf<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!intent.getBooleanExtra(EXTRA_RESTORABLE_DIALOG, false)) return

        val host = FrameLayout(this)
        setContentView(host)
        val trigger =
            AndroidNativeElements.registry.create(
                NativeElementCatalog.Wire.DIALOG,
                NativeElementContext(
                    this,
                    host,
                    this,
                    this,
                    events = { event, _ -> overlayEvents += event },
                ),
                JSONObjectProperties(
                    JSONObject()
                        .put(NativeElementCatalog.Wire.TITLE, "Restored dialog")
                        .put(NativeElementCatalog.Wire.MESSAGE, "Activity state survived")
                ),
            )
        host.addView(trigger)
        restoredOverlay = trigger

        savedInstanceState?.getBundle(OVERLAY_STATE)?.let {
            AndroidNativeElements.registry.restoreState(trigger, it)
        }
            ?: AndroidNativeElements.registry.invoke(
                trigger,
                NativeElementCatalog.Wire.SHOW,
                JSONObjectProperties(JSONObject()),
            )
    }

    override fun onSaveInstanceState(outState: Bundle) {
        restoredOverlay?.let(AndroidNativeElements.registry::saveState)?.let {
            outState.putBundle(OVERLAY_STATE, it)
        }
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        restoredOverlay?.let(AndroidNativeElements.registry::dispose)
        restoredOverlay = null
        super.onDestroy()
    }

    companion object {
        const val EXTRA_RESTORABLE_DIALOG = "restorable-dialog"
        private const val OVERLAY_STATE = "overlay-state"
    }
}
