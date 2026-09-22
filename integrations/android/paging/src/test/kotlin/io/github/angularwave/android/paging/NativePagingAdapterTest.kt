package io.github.angularwave.android.paging

import android.os.Bundle
import androidx.paging.CombinedLoadStates
import androidx.paging.LoadState
import androidx.paging.LoadStates
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.json.JSONObject
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativePagingAdapterTest {
    @Test
    fun `items require stable keys and element names`() {
        assertThatThrownBy { NativePagingItem("", "text") }
            .isInstanceOf(IllegalArgumentException::class.java)
        assertThatThrownBy { NativePagingItem("one", "") }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `load states produce stable bridge payloads`() {
        val idle =
            LoadStates(
                LoadState.NotLoading(false),
                LoadState.NotLoading(false),
                LoadState.NotLoading(true),
            )
        val states =
            CombinedLoadStates(
                refresh = LoadState.Loading,
                prepend = LoadState.NotLoading(false),
                append = LoadState.Error(IllegalStateException("offline")),
                source = idle,
                mediator = null,
            )

        assertThat(states.toJson().toString())
            .isEqualTo(
                JSONObject()
                    .put("refresh", "loading")
                    .put("prepend", "idle")
                    .put("append", "error")
                    .put("endOfPaginationReached", false)
                    .put("empty", false)
                    .put("retryable", true)
                    .put("error", "offline")
                    .toString()
            )
    }

    @Test
    fun `empty and end states are explicit`() {
        val complete = LoadState.NotLoading(true)
        val states =
            CombinedLoadStates(
                refresh = complete,
                prepend = complete,
                append = complete,
                source = LoadStates(complete, complete, complete),
                mediator = null,
            )

        assertThat(states.toJson(itemCount = 0).getBoolean("empty")).isTrue()
        assertThat(states.toJson(itemCount = 0).getBoolean("endOfPaginationReached")).isTrue()
        assertThat(states.toJson(itemCount = 0).getBoolean("retryable")).isFalse()
    }

    @Test
    fun `saved item state is bounded and tied to its element type`() {
        val store = NativePagingStateStore(2)
        store.put("one", "text", Bundle().apply { putString("value", "one") })
        store.put("two", "text", Bundle().apply { putString("value", "two") })
        store.put("three", "text", Bundle().apply { putString("value", "three") })

        assertThat(store.take("one", "text")).isNull()
        assertThat(store.take("two", "button")).isNull()
        assertThat(store.take("three", "text")?.getString("value")).isEqualTo("three")
    }

    @Test
    fun `saved item state round trips through a bundle within its bound`() {
        val store = NativePagingStateStore(2)
        store.put("one", "text", Bundle().apply { putString("value", "one") })
        store.put("two", "button", Bundle().apply { putBoolean("enabled", true) })

        val restored = NativePagingStateStore(2)
        restored.restore(store.toBundle())

        assertThat(restored.take("one", "text")?.getString("value")).isEqualTo("one")
        assertThat(restored.take("two", "button")?.getBoolean("enabled")).isTrue()
    }

    @Test
    fun `saved item state requires a positive bound`() {
        assertThatThrownBy { NativePagingStateStore(0) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("maxSavedStates must be greater than zero")
    }
}
