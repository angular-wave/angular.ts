package io.github.angularwave.android.paging

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.paging.CombinedLoadStates
import androidx.paging.LoadState
import androidx.paging.PagingDataAdapter
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import io.github.angularwave.android.navigation.elements.JSONObjectProperties
import io.github.angularwave.android.navigation.elements.NativeElementContext
import io.github.angularwave.android.navigation.elements.NativeElementRegistry
import org.json.JSONObject

/** One stable, catalog-backed item rendered by [NativePagingAdapter]. */
data class NativePagingItem(
    val key: String,
    val element: String,
    val properties: JSONObject = JSONObject(),
) {
    init {
        require(key.isNotBlank()) { "A paging item requires a stable key" }
        require(element.isNotBlank()) { "A paging item requires a native element name" }
    }

    internal val content: String = properties.toString()
}

/** RecyclerView holder exposed for layout-manager and decoration integrations. */
class NativePagingViewHolder internal constructor(internal val host: FrameLayout) :
    RecyclerView.ViewHolder(host) {
    internal var item: NativePagingItem? = null
    internal var child: View? = null
}

/**
 * Paging 3 adapter that renders catalog elements without retaining recycled scopes. Load state
 * changes are emitted through [NativeElementContext.events].
 */
class NativePagingAdapter
@JvmOverloads
constructor(
    private val registry: NativeElementRegistry,
    private val context: NativeElementContext,
    maxSavedStates: Int = DEFAULT_MAX_SAVED_STATES,
) : PagingDataAdapter<NativePagingItem, NativePagingViewHolder>(ItemCallback) {
    private val childStates = NativePagingStateStore(maxSavedStates)
    private val boundHolders = mutableSetOf<NativePagingViewHolder>()

    init {
        addLoadStateListener { context.events.emit("loadState", it.toJson(itemCount)) }
    }

    override fun onCreateViewHolder(
        parent: ViewGroup,
        viewType: Int,
    ): NativePagingViewHolder =
        NativePagingViewHolder(
            FrameLayout(parent.context).apply {
                layoutParams =
                    RecyclerView.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                    )
            }
        )

    override fun onBindViewHolder(
        holder: NativePagingViewHolder,
        position: Int,
    ) {
        val item = getItem(position) ?: return release(holder)
        val child = holder.child
        val properties = JSONObjectProperties(JSONObject(item.properties.toString()))

        if (child != null && holder.item?.key == item.key && holder.item?.element == item.element) {
            registry.update(child, properties)
            holder.item = item
            boundHolders += holder
            return
        }

        release(holder)
        val view =
            registry.create(
                item.element,
                context.copy(
                    container = holder.host,
                    events = { event, data ->
                        context.events.emit(
                            "childEvent",
                            JSONObject().put("key", item.key).put("event", event).put("data", data),
                        )
                    },
                ),
                properties,
            )
        holder.host.addView(view)
        holder.item = item
        holder.child = view
        boundHolders += holder
        childStates.take(item.key, item.element)?.let { registry.restoreState(view, it) }
    }

    override fun onViewRecycled(holder: NativePagingViewHolder) {
        release(holder)
        super.onViewRecycled(holder)
    }

    override fun onFailedToRecycleView(holder: NativePagingViewHolder): Boolean {
        release(holder)
        return true
    }

    /** Saves visible child state before a destination is replaced. */
    fun saveChildState(): Bundle {
        boundHolders.forEach(::save)
        return childStates.toBundle()
    }

    /** Restores child state by stable item key without emitting item events. */
    fun restoreChildState(state: Bundle) {
        childStates.restore(state)
    }

    /** Releases mounted native children when the owning destination is destroyed. */
    fun dispose() {
        boundHolders.toList().forEach(::release)
        boundHolders.clear()
        childStates.clear()
    }

    private fun release(holder: NativePagingViewHolder) {
        boundHolders -= holder
        save(holder)
        val child = holder.child
        if (child != null) {
            holder.host.removeView(child)
            registry.dispose(child)
        }
        holder.item = null
        holder.child = null
    }

    private fun save(holder: NativePagingViewHolder) {
        val item = holder.item
        val child = holder.child
        if (item != null && child != null) {
            registry.saveState(child)?.let { childStates.put(item.key, item.element, it) }
        }
    }

    companion object {
        const val DEFAULT_MAX_SAVED_STATES = 100
    }

    private object ItemCallback : DiffUtil.ItemCallback<NativePagingItem>() {
        override fun areItemsTheSame(
            oldItem: NativePagingItem,
            newItem: NativePagingItem,
        ): Boolean = oldItem.key == newItem.key

        override fun areContentsTheSame(
            oldItem: NativePagingItem,
            newItem: NativePagingItem,
        ): Boolean = oldItem.element == newItem.element && oldItem.content == newItem.content
    }
}

internal class NativePagingStateStore(private val capacity: Int) {
    private val states = LinkedHashMap<String, SavedState>(capacity, 0.75f, true)

    init {
        require(capacity > 0) { "maxSavedStates must be greater than zero" }
    }

    fun put(
        key: String,
        element: String,
        state: Bundle,
    ) {
        states[key] = SavedState(element, state)
        while (states.size > capacity) states.remove(states.keys.first())
    }

    fun take(
        key: String,
        element: String,
    ): Bundle? = states.remove(key)?.takeIf { it.element == element }?.state

    fun toBundle(): Bundle =
        Bundle().apply {
            states.forEach { (key, saved) ->
                putBundle(
                    key,
                    Bundle().apply {
                        putString(ELEMENT_KEY, saved.element)
                        putBundle(STATE_KEY, saved.state)
                    },
                )
            }
        }

    fun restore(source: Bundle) {
        source.keySet().forEach { key ->
            val saved = source.getBundle(key) ?: return@forEach
            val element = saved.getString(ELEMENT_KEY) ?: return@forEach
            val state = saved.getBundle(STATE_KEY) ?: return@forEach
            put(key, element, state)
        }
    }

    fun clear() = states.clear()

    private data class SavedState(val element: String, val state: Bundle)

    private companion object {
        const val ELEMENT_KEY = "element"
        const val STATE_KEY = "state"
    }
}

internal fun CombinedLoadStates.toJson(itemCount: Int = 1): JSONObject =
    JSONObject()
        .put("refresh", refresh.toName())
        .put("prepend", prepend.toName())
        .put("append", append.toName())
        .put(
            "endOfPaginationReached",
            append is LoadState.NotLoading && append.endOfPaginationReached,
        )
        .put("empty", refresh is LoadState.NotLoading && itemCount == 0)
        .put(
            "retryable",
            listOf(refresh, prepend, append).any { it is LoadState.Error },
        )
        .apply {
            listOf(refresh, prepend, append)
                .filterIsInstance<LoadState.Error>()
                .firstOrNull()
                ?.let {
                    put("error", it.error.message ?: it.error::class.java.simpleName)
                }
        }

private fun LoadState.toName(): String =
    when (this) {
        is LoadState.Loading -> "loading"
        is LoadState.Error -> "error"
        is LoadState.NotLoading -> "idle"
    }
