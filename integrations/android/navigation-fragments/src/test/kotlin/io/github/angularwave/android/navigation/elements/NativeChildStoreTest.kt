package io.github.angularwave.android.navigation.elements

import android.view.View
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric.buildActivity
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativeChildStoreTest {
    @Test
    fun `reconcile updates only changed keyed children`() {
        var creates = 0
        var updates = 0
        var disposals = 0
        val registry =
            NativeElementRegistry(
                listOf(
                    NativeElementDefinition(
                        name = "probe",
                        properties =
                            listOf(NativePropertyDefinition("value", NativePropertyType.STRING)),
                        factory =
                            NativeElementFactory { context, _ ->
                                creates += 1
                                object : NativeElementInstance {
                                    override val view = View(context.context)

                                    override fun update(properties: NativeProperties) {
                                        updates += 1
                                    }

                                    override fun dispose() {
                                        disposals += 1
                                    }
                                }
                            },
                    )
                )
            )
        val activity = themedActivity()
        val host = FrameLayout(activity)
        val context = NativeElementContext(activity, host, activity, activity, events = { _, _ -> })
        val store = NativeChildStore(registry, context, host)

        val initial = store.reconcile(children("first", retained = true)).single()
        host.addView(initial.view)
        val unchanged = store.reconcile(children("first", retained = true)).single()
        val changed = store.reconcile(children("second", retained = true)).single()

        assertSame(initial.view, unchanged.view)
        assertSame(initial.view, changed.view)
        assertEquals(1, creates)
        assertEquals(1, updates)
        assertEquals(0, disposals)

        store.reconcile(emptyChildren())
        assertEquals(null, initial.view.parent)
        assertEquals(0, disposals)
        assertSame(
            initial.view,
            store.reconcile(children("second", retained = true)).single().view,
        )

        store.reconcile(children("second", retained = false))
        store.reconcile(emptyChildren())
        assertEquals(1, disposals)
        store.dispose()
        assertEquals(1, disposals)
        activity.finish()
    }

    private fun children(
        value: String,
        retained: Boolean,
    ) =
        NativeProperties(
            JSONObject()
                .put(
                    NativeElementCatalog.Wire.CHILDREN,
                    JSONArray()
                        .put(
                            JSONObject()
                                .put("key", "stable")
                                .put("name", "probe")
                                .put("props", JSONObject().put("value", value))
                                .put("retain", retained)
                        ),
                )
        )

    private fun emptyChildren() =
        NativeProperties(JSONObject().put(NativeElementCatalog.Wire.CHILDREN, JSONArray()))

    private fun themedActivity(): AppCompatActivity {
        val controller = buildActivity(AppCompatActivity::class.java)
        controller.get().setTheme(com.google.android.material.R.style.Theme_Material3_DayNight)
        return controller.setup().get()
    }
}
