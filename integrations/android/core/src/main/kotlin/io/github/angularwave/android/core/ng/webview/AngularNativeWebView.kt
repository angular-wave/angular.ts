package io.github.angularwave.android.core.ng.webview

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.util.AttributeSet
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.FrameLayout.LayoutParams.MATCH_PARENT
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.google.gson.GsonBuilder
import io.github.angularwave.android.core.config.AngularNative
import io.github.angularwave.android.core.ng.util.contentFromAsset
import io.github.angularwave.android.core.ng.util.isNightModeEnabled
import io.github.angularwave.android.core.ng.util.runOnUiThread
import io.github.angularwave.android.core.ng.util.toJson
import io.github.angularwave.android.core.ng.visit.VisitOptions

/**
 * A WebNavigation-specific WebView that configures required settings and exposes some helpful info.
 *
 * Generally, you are not creating this view manually — it will be automatically created and
 * available from the WebNavigation session.
 */
@SuppressLint("SetJavaScriptEnabled")
open class AngularNativeWebView
@JvmOverloads
constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : WebView(context, attrs) {
    private val gson = GsonBuilder().disableHtmlEscaping().create()

    var elementTouchPreventsPullsToRefresh = false
        internal set

    init {
        id = generateViewId()
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.userAgentString = AngularNative.config.userAgentWithWebViewDefault(context)
        settings.setSupportMultipleWindows(true)
        isNestedScrollingEnabled = false
        overScrollMode = OVER_SCROLL_ALWAYS
        layoutParams = FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        initDayNightTheming()
    }

    /** Provides the WebView's package name (corresponds to Chrome or Android System WebView). */
    val packageName: String?
        get() = WebViewCompat.getCurrentWebViewPackage(context)?.packageName

    /** Provides the WebView's version name (corresponds to Chrome or Android System WebView). */
    val versionName: String?
        get() = WebViewCompat.getCurrentWebViewPackage(context)?.versionName

    /** Provides the WebView's major version (corresponds to Chrome or Android System WebView). */
    val majorVersion: Int?
        get() = versionName?.substringBefore(".")?.toIntOrNull()

    internal fun visitLocation(
        location: String,
        options: VisitOptions,
        restorationIdentifier: String,
    ) {
        val args = encodeArguments(location, options.toJson(), restorationIdentifier)
        runJavascript("nativeNavigation.visitLocationWithOptionsAndRestorationIdentifier($args)")
    }

    internal fun visitRenderedForColdBoot(coldBootVisitIdentifier: String) {
        runJavascript("nativeNavigation.visitRenderedForColdBoot('$coldBootVisitIdentifier')")
    }

    internal fun cacheSnapshot() {
        runJavascript("nativeNavigation.cacheSnapshot()")
    }

    internal fun restoreCurrentVisit() {
        runJavascript("nativeNavigation.restoreCurrentVisit()")
    }

    internal fun installBridge(onBridgeInstalled: () -> Unit) {
        val script = "window.nativeNavigation == null"
        val bridge = context.contentFromAsset("js/navigation-bridge.js")

        runJavascript(script) { s ->
            if (s?.toBoolean() == true) {
                runJavascript(bridge) {
                    onBridgeInstalled()
                }
            } else {
                onBridgeInstalled()
            }
        }
    }

    private fun WebView.runJavascript(
        javascript: String,
        onComplete: (String?) -> Unit = {},
    ) {
        context.runOnUiThread {
            evaluateJavascript(javascript) {
                onComplete(it)
            }
        }
    }

    private fun encodeArguments(vararg args: Any): String? =
        args.joinToString(",") { gson.toJson(it) }

    @Suppress("DEPRECATION")
    private fun initDayNightTheming() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK_STRATEGY)) {
                WebSettingsCompat.setForceDarkStrategy(
                    settings,
                    WebSettingsCompat.DARK_STRATEGY_WEB_THEME_DARKENING_ONLY,
                )
            }

            if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                when (context.isNightModeEnabled) {
                    true ->
                        WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_ON)
                    else ->
                        WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_AUTO)
                }
            }
        }
    }
}
