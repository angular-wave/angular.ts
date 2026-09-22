package io.github.angularwave.android.core.config

import android.content.Context
import android.webkit.WebView
import io.github.angularwave.android.core.bridge.BridgeComponent
import io.github.angularwave.android.core.bridge.BridgeComponentFactory
import io.github.angularwave.android.core.bridge.BridgeComponentJsonConverter
import io.github.angularwave.android.core.ng.config.PathConfiguration
import io.github.angularwave.android.core.ng.http.AngularNativeHttpClient
import io.github.angularwave.android.core.ng.offline.OfflineRequestHandler
import io.github.angularwave.android.core.ng.webview.AngularNativeWebView

class AngularNativeConfig internal constructor() {
    /** The path configuration that defines your navigation rules. */
    val pathConfiguration = PathConfiguration()

    var registeredBridgeComponentFactories: List<BridgeComponentFactory<*, BridgeComponent<*>>> =
        emptyList()

    /**
     * Set a custom JSON converter to easily decode Message.dataJson to a data object in received
     * messages and to encode a data object back to json to reply with a custom message back to the
     * web.
     */
    var jsonConverter: BridgeComponentJsonConverter? = null

    /** Experimental: API may be removed, not ready for production use. */
    var offlineRequestHandler: OfflineRequestHandler? = null

    /**
     * Enables/disables debug logging. This should be disabled in production environments. Disabled
     * by default.
     *
     * Important: You should not enable debug logging in production release builds.
     */
    var debugLoggingEnabled = false
        set(value) {
            field = value
            AngularNativeHttpClient.reset()
        }

    /**
     * Enables/disables debugging of web contents loaded into WebViews. Disabled by default.
     *
     * Important: You should not enable debugging in production release builds.
     */
    var webViewDebuggingEnabled = false
        set(value) {
            field = value
            WebView.setWebContentsDebuggingEnabled(value)
        }

    /**
     * Called whenever a new WebView instance needs to be (re)created. Provide your own
     * implementation and subclass [AngularNativeWebView] if you need custom behaviors.
     */
    var makeCustomWebView: (context: Context) -> AngularNativeWebView = { context ->
        AngularNativeWebView(context, null)
    }

    /**
     * Set a custom user agent application prefix for every WebView instance. The library will
     * automatically append a substring to your prefix which includes:
     * - "AngularNative Native Android; WebNavigation Native Android;"
     * - "bridge-components: [your bridge components];"
     * - The WebView's default Chromium user agent string
     */
    var applicationUserAgentPrefix: String? = null

    /**
     * Gets the user agent that the library builds to identify the app and its registered bridge
     * components. This includes:
     * - Your (optional) custom `applicationUserAgentPrefix`
     * - "AngularNative Native Android; WebNavigation Native Android;"
     * - "bridge-components: [your bridge components];"
     */
    val userAgent: String
        get() {
            val components = registeredBridgeComponentFactories.joinToString(" ") { it.name }

            return listOf(
                    applicationUserAgentPrefix,
                    "AngularNative Native Android; WebNavigation Native Android;",
                    "bridge-components: [$components];",
                )
                .filterNotNull()
                .joinToString(" ")
        }

    /**
     * Gets the full user agent that is used for every WebView instance. This includes:
     * - Your (optional) custom `applicationUserAgentPrefix`
     * - "AngularNative Native Android; WebNavigation Native Android;"
     * - "bridge-components: [your bridge components];"
     * - The WebView's default Chromium user agent string
     */
    fun userAgentWithWebViewDefault(context: Context): String =
        "$userAgent ${AngularNative.webViewInfo(context).defaultUserAgent}"
}
