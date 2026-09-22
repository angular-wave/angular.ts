package io.github.angularwave.android.navigation.elements

import android.os.Bundle
import android.os.Parcelable
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.core.os.BundleCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.ItemTouchHelper
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.SimpleItemAnimator
import org.json.JSONObject

internal fun recyclingNativeCollectionFactory(
    registry: () -> NativeElementRegistry,
    grid: Boolean,
    configure: (View, NativeProperties) -> Unit = { _, _ -> },
) = NativeElementFactory { context, initialProperties ->
    data class Item(
        val key: String,
        val name: String,
        val properties: JSONObject,
    ) {
        val content = properties.toString()
    }

    class Holder(val host: FrameLayout) : RecyclerView.ViewHolder(host) {
        var item: Item? = null
        var child: View? = null
    }

    val childStates = mutableMapOf<String, Bundle>()
    val holders = mutableSetOf<Holder>()
    val stableIds = mutableMapOf<String, Long>()
    var nextStableId = 0L
    var items = emptyList<Item>()
    var pendingLayoutState: Parcelable? = null
    var lastLoadMoreKey: String? = null
    var swipeEnabled = false
    var reorderEnabled = false

    fun release(holder: Holder) {
        val item = holder.item
        val child = holder.child
        if (item != null && child != null) {
            registry().saveState(child)?.let { childStates[item.key] = it }
            holder.host.removeView(child)
            registry().dispose(child)
        }
        holder.item = null
        holder.child = null
    }

    val adapter =
        object : RecyclerView.Adapter<Holder>() {
            init {
                setHasStableIds(true)
            }

            override fun getItemCount(): Int = items.size

            override fun getItemId(position: Int): Long =
                stableIds.getOrPut(items[position].key) { nextStableId++ }

            override fun onCreateViewHolder(
                parent: ViewGroup,
                viewType: Int,
            ): Holder {
                val host =
                    FrameLayout(parent.context).apply {
                        layoutParams =
                            RecyclerView.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.WRAP_CONTENT,
                            )
                    }
                return Holder(host).also(holders::add)
            }

            override fun onBindViewHolder(
                holder: Holder,
                position: Int,
            ) {
                val item = items[position]
                val properties = JSONObjectProperties(item.properties)
                val child = holder.child

                if (
                    child != null && holder.item?.key == item.key && holder.item?.name == item.name
                ) {
                    registry().update(child, properties)
                    holder.item = item
                    return
                }

                release(holder)
                val view =
                    registry()
                        .create(
                            item.name,
                            context.copy(
                                container = holder.host,
                                events = { event, data ->
                                    context.events.emit(
                                        NativeElementCatalog.Wire.CHILD_EVENT,
                                        JSONObject()
                                            .put("key", item.key)
                                            .put("event", event)
                                            .put("data", data),
                                    )
                                },
                            ),
                            properties,
                        )
                holder.host.addView(view)
                holder.item = item
                holder.child = view
                childStates.remove(item.key)?.let { registry().restoreState(view, it) }
            }

            override fun onViewRecycled(holder: Holder) {
                release(holder)
                super.onViewRecycled(holder)
            }

            override fun onFailedToRecycleView(holder: Holder): Boolean {
                release(holder)
                return true
            }
        }

    val collection =
        RecyclerView(context.context).apply {
            layoutManager =
                if (grid) GridLayoutManager(context.context, 2)
                else LinearLayoutManager(context.context)
            this.adapter = adapter
            (itemAnimator as? SimpleItemAnimator)?.supportsChangeAnimations = false
            addOnScrollListener(
                object : RecyclerView.OnScrollListener() {
                    override fun onScrolled(
                        recyclerView: RecyclerView,
                        dx: Int,
                        dy: Int,
                    ) {
                        val manager = recyclerView.layoutManager as LinearLayoutManager
                        val lastVisible = manager.findLastVisibleItemPosition()
                        context.events.emit(
                            NativeElementCatalog.Wire.SCROLL,
                            JSONObject()
                                .put("firstVisible", manager.findFirstVisibleItemPosition())
                                .put("lastVisible", lastVisible)
                                .put("count", adapter.itemCount)
                                .put("dx", dx)
                                .put("dy", dy),
                        )
                        val endKey = items.lastOrNull()?.key
                        if (
                            adapter.itemCount > 0 &&
                                lastVisible == adapter.itemCount - 1 &&
                                endKey != null &&
                                lastLoadMoreKey != endKey
                        ) {
                            lastLoadMoreKey = endKey
                            context.events.emit(
                                NativeElementCatalog.Wire.LOAD_MORE,
                                JSONObject().put("count", adapter.itemCount),
                            )
                        }
                    }
                }
            )
        }

    val gestures =
        NativeCollectionGestureCallback(
            grid = grid,
            swipeEnabled = { swipeEnabled },
            reorderEnabled = { reorderEnabled },
            itemKey = { position -> items.getOrNull(position)?.key },
            move = { from, to ->
                val reordered = items.toMutableList()
                val item = reordered.removeAt(from)
                reordered.add(to, item)
                items = reordered
                adapter.notifyItemMoved(from, to)
                context.events.emit(
                    NativeElementCatalog.Wire.MOVE,
                    JSONObject().put("key", item.key).put("fromIndex", from).put("toIndex", to),
                )
            },
            swipe = { position, direction ->
                val item = items.getOrNull(position)
                if (item != null) {
                    context.events.emit(
                        NativeElementCatalog.Wire.SWIPE,
                        JSONObject()
                            .put("key", item.key)
                            .put("index", position)
                            .put("direction", direction),
                    )
                    adapter.notifyItemChanged(position)
                }
            },
        )
    val touchHelper = ItemTouchHelper(gestures).also { it.attachToRecyclerView(collection) }

    fun readItems(properties: NativeProperties): List<Item> {
        val keys = mutableSetOf<String>()
        return properties.objects(NativeElementCatalog.Wire.CHILDREN).map { child ->
            val key = child.optString("key")
            val name = child.optString("name")
            if (key.isBlank()) {
                throw NativeElementException(
                    NativeElementException.Code.INVALID_PROPERTY,
                    "Native collection children require stable keys",
                )
            }
            if (!keys.add(key)) {
                throw NativeElementException(
                    NativeElementException.Code.INVALID_PROPERTY,
                    "Duplicate native collection child key: $key",
                )
            }
            if (name.isBlank()) {
                throw NativeElementException(
                    NativeElementException.Code.INVALID_PROPERTY,
                    "Native collection child $key requires a name",
                )
            }
            Item(
                key,
                name,
                JSONObject(child.optJSONObject("props")?.toString() ?: "{}"),
            )
        }
    }

    object : NativeElementInstance {
            override val view: View = collection

            override fun update(properties: NativeProperties) {
                val next = readItems(properties)
                val previous = items
                val diff =
                    DiffUtil.calculateDiff(
                        object : DiffUtil.Callback() {
                            override fun getOldListSize(): Int = previous.size

                            override fun getNewListSize(): Int = next.size

                            override fun areItemsTheSame(
                                oldItemPosition: Int,
                                newItemPosition: Int,
                            ): Boolean = previous[oldItemPosition].key == next[newItemPosition].key

                            override fun areContentsTheSame(
                                oldItemPosition: Int,
                                newItemPosition: Int,
                            ): Boolean =
                                previous[oldItemPosition].name == next[newItemPosition].name &&
                                    previous[oldItemPosition].content ==
                                        next[newItemPosition].content
                        }
                    )

                items = next
                next.forEach { stableIds.getOrPut(it.key) { nextStableId++ } }
                diff.dispatchUpdatesTo(adapter)
                val activeKeys = next.mapTo(mutableSetOf(), Item::key)
                stableIds.keys.retainAll(activeKeys)
                childStates.keys.retainAll(activeKeys)
                if (next.isEmpty()) lastLoadMoreKey = null

                configure(collection, properties)
                swipeEnabled = properties.boolean(NativeElementCatalog.Wire.SWIPE_ENABLED, false)
                reorderEnabled =
                    properties.boolean(NativeElementCatalog.Wire.REORDER_ENABLED, false)
                if (grid) {
                    (collection.layoutManager as GridLayoutManager).spanCount =
                        properties.integer(NativeElementCatalog.Wire.COLUMNS, 2).coerceAtLeast(1)
                }
                pendingLayoutState?.let {
                    collection.layoutManager?.onRestoreInstanceState(it)
                    pendingLayoutState = null
                }
            }

            override fun invoke(
                method: String,
                parameters: NativeProperties,
            ): Any? {
                when (method) {
                    NativeElementCatalog.Wire.SCROLL_TO -> {
                        if (adapter.itemCount > 0) {
                            collection.scrollToPosition(
                                parameters.integer("index").coerceIn(0, adapter.itemCount - 1)
                            )
                        }
                    }

                    NativeElementCatalog.Wire.SCROLL_TO_START -> {
                        if (adapter.itemCount > 0) collection.scrollToPosition(0)
                    }

                    NativeElementCatalog.Wire.SCROLL_TO_END -> {
                        if (adapter.itemCount > 0)
                            collection.scrollToPosition(adapter.itemCount - 1)
                    }

                    else -> {
                        return super.invoke(method, parameters)
                    }
                }
                return null
            }

            override fun saveState(): Bundle =
                Bundle().apply {
                    holders.forEach { holder ->
                        val item = holder.item
                        val child = holder.child
                        if (item != null && child != null) {
                            registry().saveState(child)?.let { childStates[item.key] = it }
                        }
                    }
                    collection.layoutManager?.onSaveInstanceState()?.let {
                        putParcelable("layout", it)
                    }
                    putBundle("children", Bundle().apply { childStates.forEach(::putBundle) })
                }

            override fun restoreState(state: Bundle) {
                childStates.clear()
                state.getBundle("children")?.let { children ->
                    children.keySet().forEach { key ->
                        children.getBundle(key)?.let { childStates[key] = it }
                    }
                }
                holders.forEach { holder ->
                    val item = holder.item
                    val child = holder.child
                    if (item != null && child != null) {
                        childStates.remove(item.key)?.let { registry().restoreState(child, it) }
                    }
                }
                pendingLayoutState =
                    BundleCompat.getParcelable(state, "layout", Parcelable::class.java)
                pendingLayoutState?.let {
                    collection.layoutManager?.onRestoreInstanceState(it)
                    pendingLayoutState = null
                }
            }

            override fun dispose() {
                holders.toList().forEach(::release)
                holders.clear()
                collection.adapter = null
                touchHelper.attachToRecyclerView(null)
                collection.clearOnScrollListeners()
                items = emptyList()
                childStates.clear()
                stableIds.clear()
            }
        }
        .also { it.update(initialProperties) }
}
