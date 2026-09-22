package io.github.angularwave.android.navigation.fragments

import android.view.View
import android.webkit.HttpAuthHandler
import io.github.angularwave.android.core.ng.errors.VisitError
import io.github.angularwave.android.core.ng.webview.AngularNativeWebChromeClient
import io.github.angularwave.android.core.ng.webview.AngularNativeWebView
import io.github.angularwave.android.navigation.views.AngularNativeView

/**
 * Callback interface to be implemented by a [AngularNativeWebFragment],
 * [AngularNativeWebBottomSheetFragment], or subclass.
 */
interface AngularNativeWebFragmentCallback {
    /** The AngularNativeView instance located in the Fragment's view. */
    val angularNativeView: AngularNativeView?

    /** Inflate and return a new view to serve as an error view. */
    fun createErrorView(error: VisitError): View

    /** z Inflate and return a new view to serve as a progress view. */
    fun createProgressView(location: String): View

    /** Create and return a new web chrome client instance. */
    fun createWebChromeClient(): AngularNativeWebChromeClient

    /** Called when the WebView has been attached to the current destination. */
    fun onWebViewAttached(webView: AngularNativeWebView) {}

    /** Called when the WebView has been detached from the current destination. */
    fun onWebViewDetached(webView: AngularNativeWebView) {}

    /** Called when WebNavigation begins a WebView cold boot (fresh resources). */
    fun onColdBootPageStarted(location: String) {}

    /** Called when WebNavigation completes a WebView cold boot (fresh resources). */
    fun onColdBootPageCompleted(location: String) {}

    /** Called when a WebNavigation visit has started. */
    fun onVisitStarted(location: String) {}

    /**
     * Called when a WebNavigation visit has rendered (from a cached snapshot or from a fresh
     * network request). This may be called multiple times during a normal visit lifecycle.
     */
    fun onVisitRendered(location: String) {}

    /** Called when a WebNavigation visit request has finished. */
    fun onVisitRequestFinished(location: String) {}

    /** Called when a WebNavigation visit has completed. */
    fun onVisitCompleted(
        location: String,
        completedOffline: Boolean,
    ) {}

    /** Called when a WebNavigation visit resulted in an error. */
    fun onVisitErrorReceived(
        location: String,
        error: VisitError,
    ) {}

    /** Called when a WebNavigation form submission has started. */
    fun onFormSubmissionStarted(location: String) {}

    /** Called when a WebNavigation form submission has finished. */
    fun onFormSubmissionFinished(location: String) {}

    /**
     * Called when the WebNavigation visit resulted in an error, but a cached snapshot is being
     * displayed, which may be stale.
     */
    fun onVisitErrorReceivedWithCachedSnapshotAvailable(
        location: String,
        error: VisitError,
    ) {}

    /** Called when the WebView has received an HTTP authentication request. */
    fun onReceivedHttpAuthRequest(
        handler: HttpAuthHandler,
        host: String,
        realm: String,
    ) {
        handler.cancel()
    }
}
