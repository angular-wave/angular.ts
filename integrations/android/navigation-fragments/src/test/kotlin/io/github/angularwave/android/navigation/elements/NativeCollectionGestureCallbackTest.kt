package io.github.angularwave.android.navigation.elements

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativeCollectionGestureCallbackTest {
    @Test
    fun `gestures are opt in and retain logical directions`() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        val recycler = RecyclerView(context)
        recycler.layoutManager = LinearLayoutManager(context)
        recycler.adapter =
            object : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
                override fun onCreateViewHolder(
                    parent: ViewGroup,
                    viewType: Int,
                ): RecyclerView.ViewHolder =
                    object :
                        RecyclerView.ViewHolder(
                            FrameLayout(parent.context).apply {
                                layoutParams = RecyclerView.LayoutParams(100, 100)
                            }
                        ) {}

                override fun onBindViewHolder(
                    holder: RecyclerView.ViewHolder,
                    position: Int,
                ) {}

                override fun getItemCount(): Int = 3
            }
        recycler.measure(exactly(300), exactly(300))
        recycler.layout(0, 0, 300, 300)
        val first = requireNotNull(recycler.findViewHolderForAdapterPosition(0))
        val second = requireNotNull(recycler.findViewHolderForAdapterPosition(1))
        var swipeEnabled = false
        var reorderEnabled = false
        val moves = mutableListOf<Pair<Int, Int>>()
        val swipes = mutableListOf<Pair<Int, String>>()
        val callback =
            NativeCollectionGestureCallback(
                grid = false,
                swipeEnabled = { swipeEnabled },
                reorderEnabled = { reorderEnabled },
                itemKey = { "item-$it" },
                move = { from, to -> moves += from to to },
                swipe = { position, direction -> swipes += position to direction },
            )

        assertFalse(callback.isItemViewSwipeEnabled)
        assertFalse(callback.isLongPressDragEnabled)
        swipeEnabled = true
        reorderEnabled = true
        assertTrue(callback.isItemViewSwipeEnabled)
        assertTrue(callback.isLongPressDragEnabled)
        assertTrue(callback.onMove(recycler, first, second))
        callback.onSwiped(first, ItemTouchHelper.START)

        assertEquals(listOf(0 to 1), moves)
        assertEquals(listOf(0 to "start"), swipes)
    }

    private fun exactly(size: Int): Int =
        android.view.View.MeasureSpec.makeMeasureSpec(size, android.view.View.MeasureSpec.EXACTLY)
}
