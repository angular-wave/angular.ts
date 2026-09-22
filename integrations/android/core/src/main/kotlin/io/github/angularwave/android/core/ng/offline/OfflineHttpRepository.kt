package io.github.angularwave.android.core.ng.offline

import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import io.github.angularwave.android.core.logging.logError
import io.github.angularwave.android.core.ng.http.AngularNativeHttpClient
import io.github.angularwave.android.core.ng.util.dispatcherProvider
import java.io.IOException
import java.io.InputStream
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import okhttp3.CacheControl
import okhttp3.Headers.Companion.toHeaders
import okhttp3.Request
import okhttp3.Response

/** Experimental: API may change, not ready for production use. */
internal class OfflineHttpRepository(private val coroutineScope: CoroutineScope) {
    private val cookieManager = CookieManager.getInstance()

    // Limit pre-cache requests to 2 concurrently
    private val preCacheRequestQueue = Semaphore(2)

    data class Result(
        val response: WebResourceResponse?,
        val offline: Boolean,
        val redirectToLocation: String? = null,
    )

    internal fun preCache(
        requestHandler: OfflineRequestHandler,
        resourceRequest: WebResourceRequest,
    ) {
        coroutineScope.launch {
            preCacheRequestQueue.withPermit {
                withContext(dispatcherProvider.io) {
                    fetch(requestHandler, resourceRequest)
                }
            }
        }
    }

    internal fun fetch(
        requestHandler: OfflineRequestHandler,
        resourceRequest: WebResourceRequest,
    ): Result {
        val url = resourceRequest.url.toString()

        return when (requestHandler.getCacheStrategy(url)) {
            OfflineCacheStrategy.APP -> fetchAppCacheRequest(requestHandler, resourceRequest)
            OfflineCacheStrategy.NONE -> Result(null, false)
        }
    }

    private fun fetchAppCacheRequest(
        requestHandler: OfflineRequestHandler,
        resourceRequest: WebResourceRequest,
    ): Result {
        val url = resourceRequest.url.toString()
        val headers = requestHandler.getCachedResponseHeaders(url) ?: emptyMap()
        val cacheControl = cacheControl(headers)

        // If the app has an immutable response cached, don't hit the network
        if (cacheControl.immutable) {
            requestHandler.getCachedResponse(url)?.let {
                return Result(it, false)
            }
        }

        return try {
            val response = issueRequest(resourceRequest) ?: return Result(null, false)

            // Cache based on the response's request url, which may have been a redirect
            val responseUrl = response.request.url.toString()
            val isRedirect = url != responseUrl

            // Let the app cache the response
            val resourceResponse = resourceResponse(response)
            val cachedResponse = requestHandler.cacheResponse(responseUrl, resourceResponse)

            Result(
                response = cachedResponse ?: resourceResponse,
                offline = false,
                redirectToLocation = if (isRedirect) responseUrl else null,
            )
        } catch (ignored: IOException) {
            Result(
                response = requestHandler.getCachedResponse(url, allowStaleResponse = true),
                offline = true,
            )
        }
    }

    private fun issueRequest(resourceRequest: WebResourceRequest): Response? =
        try {
            val request = buildRequest(resourceRequest)
            getResponse(request)
        } catch (e: IOException) {
            throw e
        } catch (e: IllegalArgumentException) {
            logError("httpRequestError", e)
            null
        }

    private fun buildRequest(resourceRequest: WebResourceRequest): Request {
        val location = resourceRequest.url.toString()
        val headers = resourceRequest.requestHeaders
        val builder = Request.Builder().url(location)

        headers.forEach { builder.header(it.key, it.value) }

        getCookie(location)?.let {
            builder.header("Cookie", it)
        }

        return builder.build()
    }

    private fun getResponse(request: Request): Response? {
        val location = request.url.toString()
        val call = AngularNativeHttpClient.instance.newCall(request)

        return call.execute().let { response ->
            if (response.isSuccessful) {
                setCookies(location, response)
                response
            } else {
                response.close()
                null
            }
        }
    }

    private fun getCookie(location: String): String? = cookieManager.getCookie(location)

    private fun setCookies(
        location: String,
        response: Response,
    ) {
        response.headers("Set-Cookie").forEach {
            cookieManager.setCookie(location, it)
        }
    }

    private fun resourceResponse(response: Response): WebResourceResponse =
        WebResourceResponse(
            mimeType(response),
            encoding,
            statusCode(response),
            reasonPhrase(response),
            responseHeaders(response),
            data(response),
        )

    private fun mimeType(response: Response): String {
        // A Content-Type header may not exist, provide a fallback.
        return when (val contentType = response.headers["Content-Type"]) {
            null -> "text/plain"
            else -> sanitizeContentType(contentType)
        }
    }

    private fun sanitizeContentType(contentType: String): String {
        // The Content-Type header may contain a charset suffix,
        // but this is incompatible with a WebResourceResponse and
        // the resource will default to `text/plain` otherwise.
        return contentType.removeSuffix("; charset=utf-8")
    }

    private val encoding = "utf-8"

    private fun statusCode(response: Response): Int = response.code

    private fun reasonPhrase(response: Response): String {
        // A reason phrase cannot be empty
        return when (response.message.isBlank()) {
            true -> "OK"
            else -> response.message
        }
    }

    private fun responseHeaders(response: Response): Map<String, String> = response.headers.toMap()

    private fun cacheControl(headers: Map<String, String>): CacheControl =
        try {
            CacheControl.parse(headers.toHeaders())
        } catch (ignored: IllegalArgumentException) {
            // Bad header characters can cause the parser to fail
            CacheControl.parse(emptyMap<String, String>().toHeaders())
        }

    private fun data(response: Response): InputStream? =
        try {
            response.body.byteStream()
        } catch (e: IllegalStateException) {
            logError("byteStreamError", e)
            null
        }
}
