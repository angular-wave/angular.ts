package dev.hotwire.navigation.views

import android.content.Context
import android.util.AttributeSet
import androidx.core.view.children
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import dev.hotwire.core.turbo.webview.HotwireWebView

internal class HotwireSwipeRefreshLayout @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null) :
        SwipeRefreshLayout(context, attrs) {

    init {
        disableCustomDrawingOrder()
        isNestedScrollingEnabled = false
    }

    override fun canChildScrollUp(): Boolean {
        val webView = children.firstOrNull { it is HotwireWebView } as? HotwireWebView

        return webView?.let { it.canScrollVertically(-1) || it.scrollY > 0 } ?: super.canChildScrollUp()
    }

    /**
     * Disable custom child drawing order. This fixes a crash while using a
     * stylus that dispatches hover events when the WebView is being removed.
     * This doesn't have any unintended consequences, since the WebView is the
     * only possible child of this view.
     */
    private fun disableCustomDrawingOrder() {
        isChildrenDrawingOrderEnabled = false
    }
}
