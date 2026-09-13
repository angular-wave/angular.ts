package io.github.angularwave.android.navigation.elements

import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.fragment.app.FragmentActivity
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class RecyclingNativeCollectionTest {
    @Test
    fun `keyed diffs update only changed visible items`() {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java)
        val activity =
            controller.get().apply {
                setTheme(com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar)
            }
        controller.setup()
        val context =
            NativeElementContext(
                context = activity,
                container = null,
                lifecycleOwner = activity,
                savedStateOwner = activity,
                events = { _, _ -> },
            )
        var creates = 0
        var updates = 0
        var disposes = 0
        val definition =
            NativeElementDefinition(
                name = "counted-item",
                properties = listOf(NativePropertyDefinition("text", NativePropertyType.STRING)),
                factory =
                    NativeElementFactory { itemContext, initial ->
                        creates++
                        val text = TextView(itemContext.context)
                        object : NativeElementInstance {
                                override val view: View = text

                                override fun update(properties: NativeProperties) {
                                    updates++
                                    text.text = properties.string("text")
                                }

                                override fun dispose() {
                                    disposes++
                                }
                            }
                            .also { it.update(initial) }
                    },
            )
        val registry = NativeElementRegistry(listOf(definition))
        val instance =
            recyclingNativeCollectionFactory({ registry }, grid = false)
                .create(context, properties("a" to "A", "b" to "B", "c" to "C"))
        val recycler = instance.view as RecyclerView
        recycler.measure(exactly(600), exactly(600))
        recycler.layout(0, 0, 600, 600)
        val initialCreates = creates
        updates = 0
        val observer = OperationObserver()
        requireNotNull(recycler.adapter).registerAdapterDataObserver(observer)

        instance.update(properties("a" to "A", "b" to "B", "c" to "C"))
        assertEquals(0, observer.total)
        assertEquals(0, updates)
        assertEquals(initialCreates, creates)

        instance.update(properties("a" to "A", "b" to "B2", "c" to "C"))
        recycler.measure(exactly(600), exactly(600))
        recycler.layout(0, 0, 600, 600)
        org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle()
        assertEquals(1, observer.changed)
        assertEquals(1, updates)
        assertEquals(initialCreates, creates)
        assertEquals(0, disposes)

        observer.reset()
        updates = 0
        instance.update(properties("c" to "C", "a" to "A", "b" to "B2"))
        recycler.measure(exactly(600), exactly(600))
        recycler.layout(0, 0, 600, 600)
        org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle()
        assertTrue(observer.moved > 0)
        assertEquals(0, updates)
        assertEquals(initialCreates, creates)
        assertEquals(0, disposes)

        observer.reset()
        instance.update(properties("c" to "C", "a" to "A", "d" to "D", "b" to "B2"))
        assertEquals(1, observer.inserted)
        assertEquals(1, observer.total)

        observer.reset()
        instance.update(properties("c" to "C", "d" to "D", "b" to "B2"))
        assertEquals(1, observer.removed)
        assertEquals(1, observer.total)

        instance.dispose()
        assertEquals(creates, disposes)
    }

    @Test
    fun `restoring state updates children that are already bound`() {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java)
        val activity =
            controller.get().apply {
                setTheme(com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar)
            }
        controller.setup()
        val context =
            NativeElementContext(
                context = activity,
                container = null,
                lifecycleOwner = activity,
                savedStateOwner = activity,
                events = { _, _ -> },
            )
        var restorations = 0
        val definition =
            NativeElementDefinition(
                name = "stateful-item",
                properties = listOf(NativePropertyDefinition("text", NativePropertyType.STRING)),
                factory =
                    NativeElementFactory { itemContext, initial ->
                        val text = TextView(itemContext.context)
                        object : NativeElementInstance {
                                override val view: View = text

                                override fun update(properties: NativeProperties) {
                                    text.text = properties.string("text")
                                }

                                override fun saveState() =
                                    Bundle().apply { putBoolean("saved", true) }

                                override fun restoreState(state: Bundle) {
                                    assertTrue(state.getBoolean("saved"))
                                    restorations++
                                }
                            }
                            .also { it.update(initial) }
                    },
            )
        val registry = NativeElementRegistry(listOf(definition))
        val factory = recyclingNativeCollectionFactory({ registry }, grid = false)
        val first = factory.create(context, properties("stateful-item", "one" to "First"))
        layout(first.view as RecyclerView)
        val state = requireNotNull(first.saveState())
        first.dispose()

        val restored = factory.create(context, properties("stateful-item", "one" to "First"))
        layout(restored.view as RecyclerView)
        restored.restoreState(state)

        assertEquals(1, restorations)
        restored.dispose()
    }

    private fun properties(vararg items: Pair<String, String>): NativeProperties =
        properties("counted-item", *items)

    private fun properties(
        element: String,
        vararg items: Pair<String, String>,
    ): NativeProperties =
        NativeProperties(
            JSONObject()
                .put(
                    "children",
                    JSONArray(
                        items.map { (key, text) ->
                            JSONObject()
                                .put("key", key)
                                .put("name", element)
                                .put("props", JSONObject().put("text", text))
                        }
                    ),
                )
        )

    private fun layout(recycler: RecyclerView) {
        recycler.measure(exactly(600), exactly(600))
        recycler.layout(0, 0, 600, 600)
        org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle()
    }

    private fun exactly(size: Int): Int =
        View.MeasureSpec.makeMeasureSpec(size, View.MeasureSpec.EXACTLY)

    private class OperationObserver : RecyclerView.AdapterDataObserver() {
        var changed = 0
        var inserted = 0
        var removed = 0
        var moved = 0
        val total: Int
            get() = changed + inserted + removed + moved

        override fun onItemRangeChanged(
            positionStart: Int,
            itemCount: Int,
        ) {
            changed += itemCount
        }

        override fun onItemRangeInserted(
            positionStart: Int,
            itemCount: Int,
        ) {
            inserted += itemCount
        }

        override fun onItemRangeRemoved(
            positionStart: Int,
            itemCount: Int,
        ) {
            removed += itemCount
        }

        override fun onItemRangeMoved(
            fromPosition: Int,
            toPosition: Int,
            itemCount: Int,
        ) {
            moved += itemCount
        }

        fun reset() {
            changed = 0
            inserted = 0
            removed = 0
            moved = 0
        }
    }
}
