package io.github.angularwave.android.core.ng.offline

import android.net.Uri
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import androidx.core.net.toUri

/** Experimental: API may change, not ready for production use. */
internal class OfflinePreCacheRequest(
    val url: String,
    val userAgent: String,
) : WebResourceRequest {
    private val cookieManager = CookieManager.getInstance()

    override fun getUrl(): Uri = url.toUri()

    override fun isRedirect(): Boolean = false

    override fun getMethod(): String = "GET"

    override fun getRequestHeaders(): Map<String, String> = buildMap {
        put("User-Agent", userAgent)
        cookieManager.getCookie(url)?.let { put("Cookie", it) }
    }

    override fun hasGesture(): Boolean = false

    override fun isForMainFrame(): Boolean = true
}
