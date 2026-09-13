package io.github.angularwave.android.core.ng.offline

import android.net.Uri
import android.os.Build
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import androidx.core.net.toUri
import io.github.angularwave.android.core.ng.BaseRepositoryTest
import java.io.ByteArrayInputStream
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import okhttp3.mockwebserver.MockResponse
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@ExperimentalCoroutinesApi
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Build.VERSION_CODES.R])
class OfflineHttpRepositoryTest : BaseRepositoryTest() {
    private val repository = OfflineHttpRepository(CoroutineScope(Job()))

    @Test
    fun `none strategy leaves the request to WebView`() {
        val handler = Handler(strategy = OfflineCacheStrategy.NONE)

        val result = repository.fetch(handler, Request(baseUrl()))

        assertThat(result.response).isNull()
        assertThat(result.offline).isFalse()
        assertThat(result.redirectToLocation).isNull()
        assertThat(server.requestCount).isZero()
    }

    @Test
    fun `immutable cached response avoids the network`() {
        val cached = response("cached")
        val handler =
            Handler(
                cached = cached,
                cachedHeaders = mapOf("Cache-Control" to "public, max-age=31536000, immutable"),
            )

        val result = repository.fetch(handler, Request(baseUrl()))

        assertThat(result.response).isSameAs(cached)
        assertThat(result.offline).isFalse()
        assertThat(server.requestCount).isZero()
    }

    @Test
    fun `successful response is normalized and offered to the application cache`() {
        server.enqueue(
            MockResponse().setBody("fresh").setHeader("Content-Type", "text/html; charset=utf-8")
        )
        val handler = Handler()
        val location = server.url("/fresh").toString()

        val result = repository.fetch(handler, Request(location))

        assertThat(result.offline).isFalse()
        assertThat(result.redirectToLocation).isNull()
        assertThat(result.response?.mimeType).isEqualTo("text/html")
        assertThat(result.response?.data?.readBytes()?.decodeToString()).isEqualTo("fresh")
        assertThat(handler.cachedLocations).containsExactly(location)
    }

    @Test
    fun `network redirect reports the final location`() {
        server.enqueue(MockResponse().setResponseCode(302).setHeader("Location", "/final"))
        server.enqueue(MockResponse().setBody("redirected"))
        val original = server.url("/start").toString()
        val destination = server.url("/final").toString()

        val result = repository.fetch(Handler(), Request(original))

        assertThat(result.redirectToLocation).isEqualTo(destination)
        assertThat(result.offline).isFalse()
        assertThat(result.response?.data?.readBytes()?.decodeToString()).isEqualTo("redirected")
    }

    @Test
    fun `http failure is not reported as an offline redirect`() {
        server.enqueue(MockResponse().setResponseCode(503))

        val result = repository.fetch(Handler(), Request(server.url("/failure").toString()))

        assertThat(result.response).isNull()
        assertThat(result.offline).isFalse()
        assertThat(result.redirectToLocation).isNull()
    }

    @Test
    fun `network failure returns a stale cached response`() {
        val stale = response("stale")
        val handler = Handler(cached = stale)

        val result = repository.fetch(handler, Request("http://127.0.0.1:1/unavailable"))

        assertThat(result.response).isSameAs(stale)
        assertThat(result.offline).isTrue()
        assertThat(handler.allowedStaleResponse).isTrue()
    }

    @Test
    fun `invalid cached headers do not prevent a network request`() {
        server.enqueue(MockResponse().setBody("fresh"))
        val handler = Handler(cachedHeaders = mapOf("Invalid\u0000Header" to "value"))

        val result = repository.fetch(handler, Request(server.url("/headers").toString()))

        assertThat(result.response).isNotNull()
        assertThat(result.offline).isFalse()
    }

    @Test
    fun `pre-cache request omits a missing cookie`() {
        val request = OfflinePreCacheRequest("https://no-cookie.example/resource", "AngularTS")

        assertThat(request.requestHeaders).containsEntry("User-Agent", "AngularTS")
        assertThat(request.requestHeaders).doesNotContainKey("Cookie")
    }

    private fun response(body: String): WebResourceResponse =
        WebResourceResponse(
            "text/plain",
            "utf-8",
            ByteArrayInputStream(body.encodeToByteArray()),
        )

    private class Request(private val location: String) : WebResourceRequest {
        override fun getUrl(): Uri = location.toUri()

        override fun isForMainFrame(): Boolean = true

        override fun isRedirect(): Boolean = false

        override fun hasGesture(): Boolean = false

        override fun getMethod(): String = "GET"

        override fun getRequestHeaders(): Map<String, String> = emptyMap()
    }

    private class Handler(
        private val strategy: OfflineCacheStrategy = OfflineCacheStrategy.APP,
        private val cached: WebResourceResponse? = null,
        private val cachedHeaders: Map<String, String>? = null,
    ) : OfflineRequestHandler {
        val cachedLocations = mutableListOf<String>()
        var allowedStaleResponse = false

        override fun getCacheStrategy(url: String): OfflineCacheStrategy = strategy

        override fun getCachedResponseHeaders(url: String): Map<String, String>? = cachedHeaders

        override fun getCachedResponse(
            url: String,
            allowStaleResponse: Boolean,
        ): WebResourceResponse? {
            allowedStaleResponse = allowStaleResponse
            return cached
        }

        override fun getCachedSnapshot(url: String): WebResourceResponse? = cached

        override fun cacheResponse(
            url: String,
            response: WebResourceResponse,
        ): WebResourceResponse {
            cachedLocations += url
            return response
        }
    }
}
