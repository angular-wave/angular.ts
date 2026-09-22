package io.github.angularwave.android.navigation.elements

import android.os.Build
import android.widget.FrameLayout
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import com.google.android.material.R as MaterialR
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import org.assertj.core.api.Assertions.assertThat
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowDialog

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Build.VERSION_CODES.R])
class AndroidNativeOverlayTest {
    @After fun tearDown() = NativeOverlayCoordinator.clear()

    @Test
    fun `dialog dismiss reports dismissal and restores focus`() {
        val mounted = mountedDialog()
        mounted.trigger.requestFocus()

        mounted.trigger.performClick()
        AndroidNativeElements.registry.invoke(
            mounted.trigger,
            NativeElementCatalog.Wire.DISMISS,
            JSONObjectProperties(JSONObject()),
        )

        assertThat(mounted.events).containsExactly("show", "dismiss")
        assertThat(mounted.trigger.hasFocus()).isTrue()
        AndroidNativeElements.registry.dispose(mounted.trigger)
        mounted.activity.finish()
    }

    @Test
    fun `dialog open state restores and disposal emits nothing`() {
        val first = mountedDialog()
        first.trigger.performClick()
        val state = requireNotNull(AndroidNativeElements.registry.saveState(first.trigger))
        AndroidNativeElements.registry.dispose(first.trigger)
        assertThat(first.events).containsExactly("show")

        val restored = createDialog(first.activity, first.host, first.owner, first.events)
        AndroidNativeElements.registry.restoreState(restored, state)
        assertThat(ShadowDialog.getLatestDialog().isShowing).isTrue()
        assertThat(first.events).containsExactly("show", "show")

        AndroidNativeElements.registry.invoke(
            restored,
            NativeElementCatalog.Wire.DISMISS,
            JSONObjectProperties(JSONObject()),
        )
        assertThat(first.events).containsExactly("show", "show", "dismiss")
        AndroidNativeElements.registry.dispose(restored)
        first.activity.finish()
    }

    @Test
    fun `dialog enables outside touch cancellation and wires cancel event`() {
        val mounted = mountedDialog()
        mounted.trigger.performClick()
        val dialog = ShadowDialog.getLatestDialog()

        val shadow = shadowOf(dialog)
        assertThat(shadow.isCancelableOnTouchOutside).isTrue()
        requireNotNull(shadow.onCancelListener).onCancel(dialog)
        dialog.dismiss()

        assertThat(mounted.events).containsExactly("show", "cancel")
        AndroidNativeElements.registry.dispose(mounted.trigger)
        mounted.activity.finish()
    }

    @Test
    fun `hidden bottom sheet state requests cancellation and wires cancel event`() {
        val mounted = mountedDialog()
        AndroidNativeElements.registry.dispose(mounted.trigger)
        mounted.host.removeView(mounted.trigger)
        val events = mutableListOf<String>()
        val sheet = createBottomSheet(mounted, events)
        sheet.performClick()
        val dialog = ShadowDialog.getLatestDialog() as BottomSheetDialog
        val content =
            requireNotNull(dialog.findViewById<FrameLayout>(MaterialR.id.design_bottom_sheet))

        var cancellations = 0
        val hidden = NativeBottomSheetDismissCallback { cancellations++ }
        hidden.onStateChanged(content, BottomSheetBehavior.STATE_COLLAPSED)
        assertThat(cancellations).isZero()
        hidden.onStateChanged(content, BottomSheetBehavior.STATE_HIDDEN)
        assertThat(cancellations).isEqualTo(1)
        requireNotNull(shadowOf(dialog).onCancelListener).onCancel(dialog)
        dialog.dismiss()

        assertThat(events).containsExactly("show", "cancel")
        AndroidNativeElements.registry.dispose(sheet)
        mounted.activity.finish()
    }

    @Test
    fun `transient overlays restore closed and honor enabled state`() {
        val mounted = mountedDialog()
        AndroidNativeElements.registry.dispose(mounted.trigger)

        listOf(
                NativeElementCatalog.Wire.MENU,
                NativeElementCatalog.Wire.SNACKBAR,
                NativeElementCatalog.Wire.TOOLTIP,
            )
            .forEach { name ->
                val events = mutableListOf<String>()
                val first = createTransient(name, mounted, events)
                mounted.host.addView(first)
                AndroidNativeElements.registry.invoke(
                    first,
                    NativeElementCatalog.Wire.SHOW,
                    JSONObjectProperties(JSONObject()),
                )
                val state = requireNotNull(AndroidNativeElements.registry.saveState(first))
                AndroidNativeElements.registry.dispose(first)
                mounted.host.removeView(first)

                val restored = createTransient(name, mounted, events)
                mounted.host.addView(restored)
                AndroidNativeElements.registry.restoreState(restored, state)

                assertThat(events).containsExactly(NativeElementCatalog.Wire.SHOW)
                if (name == NativeElementCatalog.Wire.SNACKBAR) {
                    assertThat(restored.isEnabled).isFalse()
                }
                AndroidNativeElements.registry.dispose(restored)
                mounted.host.removeView(restored)
            }

        mounted.activity.finish()
    }

    private fun mountedDialog(): MountedDialog {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java)
        val activity =
            controller.get().apply {
                setTheme(com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar)
            }
        controller.setup()
        val host = FrameLayout(activity)
        activity.setContentView(host)
        val owner = Fragment()
        activity.supportFragmentManager.beginTransaction().add(owner, "owner").commitNow()
        val events = mutableListOf<String>()
        return MountedDialog(
            activity,
            host,
            owner,
            events,
            createDialog(activity, host, owner, events),
        )
    }

    private fun createDialog(
        activity: FragmentActivity,
        host: FrameLayout,
        owner: Fragment,
        events: MutableList<String>,
    ) =
        AndroidNativeElements.registry
            .create(
                NativeElementCatalog.Wire.DIALOG,
                NativeElementContext(
                    activity,
                    host,
                    owner,
                    owner,
                    events = { event, _ -> events += event },
                ),
                JSONObjectProperties(
                    JSONObject()
                        .put(NativeElementCatalog.Wire.TITLE, "Delete item?")
                        .put(NativeElementCatalog.Wire.MESSAGE, "This cannot be undone")
                ),
            )
            .also(host::addView)

    private fun createTransient(
        name: String,
        mounted: MountedDialog,
        events: MutableList<String>,
    ): android.view.View {
        val properties =
            when (name) {
                NativeElementCatalog.Wire.MENU ->
                    JSONObject()
                        .put(NativeElementCatalog.Wire.TITLE, "Actions")
                        .put(
                            NativeElementCatalog.Wire.ITEMS,
                            JSONArray()
                                .put(JSONObject().put(NativeElementCatalog.Wire.LABEL, "Edit")),
                        )
                NativeElementCatalog.Wire.SNACKBAR ->
                    JSONObject()
                        .put(NativeElementCatalog.Wire.MESSAGE, "Saved")
                        .put(NativeElementCatalog.Wire.ENABLED, false)
                else ->
                    JSONObject()
                        .put(NativeElementCatalog.Wire.LABEL, "Help")
                        .put(NativeElementCatalog.Wire.MESSAGE, "More information")
            }
        return AndroidNativeElements.registry.create(
            name,
            NativeElementContext(
                mounted.activity,
                mounted.host,
                mounted.owner,
                mounted.owner,
                events = { event, _ -> events += event },
            ),
            JSONObjectProperties(properties),
        )
    }

    private fun createBottomSheet(
        mounted: MountedDialog,
        events: MutableList<String>,
    ) =
        AndroidNativeElements.registry
            .create(
                NativeElementCatalog.Wire.BOTTOM_SHEET,
                NativeElementContext(
                    mounted.activity,
                    mounted.host,
                    mounted.owner,
                    mounted.owner,
                    events = { event, _ -> events += event },
                ),
                JSONObjectProperties(
                    JSONObject()
                        .put(NativeElementCatalog.Wire.TITLE, "Filters")
                        .put(NativeElementCatalog.Wire.MESSAGE, "Choose filters")
                ),
            )
            .also(mounted.host::addView)

    private data class MountedDialog(
        val activity: FragmentActivity,
        val host: FrameLayout,
        val owner: Fragment,
        val events: MutableList<String>,
        val trigger: android.view.View,
    )
}
