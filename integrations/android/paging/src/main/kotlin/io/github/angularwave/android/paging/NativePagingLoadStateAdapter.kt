package io.github.angularwave.android.paging

import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.paging.LoadState
import androidx.paging.LoadStateAdapter
import androidx.recyclerview.widget.RecyclerView

/** Localized loading, retry, and end-of-list rows for [NativePagingAdapter]. */
class NativePagingLoadStateAdapter(
    private val loadingLabel: CharSequence,
    private val retryLabel: CharSequence,
    private val endLabel: CharSequence,
    private val retry: () -> Unit,
) : LoadStateAdapter<NativePagingLoadStateAdapter.ViewHolder>() {
    override fun displayLoadStateAsItem(loadState: LoadState): Boolean =
        loadState is LoadState.Loading ||
            loadState is LoadState.Error ||
            loadState is LoadState.NotLoading && loadState.endOfPaginationReached

    override fun onCreateViewHolder(
        parent: ViewGroup,
        loadState: LoadState,
    ): ViewHolder {
        val content =
            LinearLayout(parent.context).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams =
                    RecyclerView.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                    )
            }
        val progress = ProgressBar(parent.context)
        val message = TextView(parent.context)
        val retryButton = Button(parent.context).apply { setOnClickListener { retry() } }
        content.addView(progress)
        content.addView(message)
        content.addView(retryButton)
        return ViewHolder(content, progress, message, retryButton)
    }

    override fun onBindViewHolder(
        holder: ViewHolder,
        loadState: LoadState,
    ) {
        holder.progress.isVisible = loadState is LoadState.Loading
        holder.retry.isVisible = loadState is LoadState.Error
        holder.retry.text = retryLabel
        holder.message.text =
            when (loadState) {
                is LoadState.Loading -> loadingLabel
                is LoadState.Error -> loadState.error.message.orEmpty()
                is LoadState.NotLoading -> endLabel
            }
    }

    class ViewHolder
    internal constructor(
        view: View,
        internal val progress: ProgressBar,
        internal val message: TextView,
        internal val retry: Button,
    ) : RecyclerView.ViewHolder(view)
}
