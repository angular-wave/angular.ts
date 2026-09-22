package io.github.angularwave.android.navigation.elements

import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.RecyclerView

internal class NativeCollectionGestureCallback(
    private val grid: Boolean,
    private val swipeEnabled: () -> Boolean,
    private val reorderEnabled: () -> Boolean,
    private val itemKey: (Int) -> String?,
    private val move: (Int, Int) -> Unit,
    private val swipe: (Int, String) -> Unit,
) : ItemTouchHelper.Callback() {
    override fun getMovementFlags(
        recyclerView: RecyclerView,
        viewHolder: RecyclerView.ViewHolder,
    ): Int {
        val dragFlags =
            if (!reorderEnabled()) 0
            else if (grid) {
                ItemTouchHelper.UP or
                    ItemTouchHelper.DOWN or
                    ItemTouchHelper.START or
                    ItemTouchHelper.END
            } else {
                ItemTouchHelper.UP or ItemTouchHelper.DOWN
            }
        val swipeFlags = if (swipeEnabled()) ItemTouchHelper.START or ItemTouchHelper.END else 0
        return makeMovementFlags(dragFlags, swipeFlags)
    }

    override fun isLongPressDragEnabled(): Boolean = reorderEnabled()

    override fun isItemViewSwipeEnabled(): Boolean = swipeEnabled()

    override fun onMove(
        recyclerView: RecyclerView,
        viewHolder: RecyclerView.ViewHolder,
        target: RecyclerView.ViewHolder,
    ): Boolean {
        val from = viewHolder.bindingAdapterPosition
        val to = target.bindingAdapterPosition
        if (
            from == RecyclerView.NO_POSITION ||
                to == RecyclerView.NO_POSITION ||
                itemKey(from) == null
        ) {
            return false
        }
        move(from, to)
        return true
    }

    override fun onSwiped(
        viewHolder: RecyclerView.ViewHolder,
        direction: Int,
    ) {
        val position = viewHolder.bindingAdapterPosition
        if (position == RecyclerView.NO_POSITION || itemKey(position) == null) return
        swipe(
            position,
            if (direction == ItemTouchHelper.START) "start" else "end",
        )
    }
}
