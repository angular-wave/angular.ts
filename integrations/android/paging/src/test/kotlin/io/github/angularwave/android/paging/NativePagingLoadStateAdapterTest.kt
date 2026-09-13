package io.github.angularwave.android.paging

import android.view.View
import android.widget.FrameLayout
import androidx.paging.LoadState
import androidx.test.core.app.ApplicationProvider
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativePagingLoadStateAdapterTest {
    @Test
    fun `renders localized loading retry and end states`() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        var retries = 0
        val adapter =
            NativePagingLoadStateAdapter(
                loadingLabel = "Fetching tasks",
                retryLabel = "Try again",
                endLabel = "All tasks loaded",
                retry = { retries++ },
            )
        val holder = adapter.onCreateViewHolder(FrameLayout(context), LoadState.Loading)

        adapter.onBindViewHolder(holder, LoadState.Loading)
        assertThat(holder.progress.visibility).isEqualTo(View.VISIBLE)
        assertThat(holder.retry.visibility).isEqualTo(View.GONE)
        assertThat(holder.message.text).isEqualTo("Fetching tasks")

        adapter.onBindViewHolder(holder, LoadState.Error(IllegalStateException("Offline")))
        assertThat(holder.progress.visibility).isEqualTo(View.GONE)
        assertThat(holder.retry.visibility).isEqualTo(View.VISIBLE)
        assertThat(holder.retry.text).isEqualTo("Try again")
        assertThat(holder.message.text).isEqualTo("Offline")
        holder.retry.performClick()
        assertThat(retries).isEqualTo(1)

        adapter.onBindViewHolder(holder, LoadState.NotLoading(true))
        assertThat(holder.message.text).isEqualTo("All tasks loaded")
        assertThat(adapter.displayLoadStateAsItem(LoadState.NotLoading(true))).isTrue()
        assertThat(adapter.displayLoadStateAsItem(LoadState.NotLoading(false))).isFalse()
    }
}
