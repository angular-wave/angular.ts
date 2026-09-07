package io.github.angularwave.android.navigation.fragments

import android.content.Intent
import android.webkit.HttpAuthHandler
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts.RequestPermission
import androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult
import androidx.lifecycle.Lifecycle.State.STARTED
import androidx.lifecycle.findViewTreeLifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.withStateAtLeast
import io.github.angularwave.android.core.config.AngularNative
import io.github.angularwave.android.core.turbo.config.pullToRefreshEnabled
import io.github.angularwave.android.core.turbo.errors.VisitError
import io.github.angularwave.android.core.turbo.session.SessionCallback
import io.github.angularwave.android.core.turbo.visit.Visit
import io.github.angularwave.android.core.turbo.visit.VisitAction
import io.github.angularwave.android.core.turbo.visit.VisitDestination
import io.github.angularwave.android.core.turbo.visit.VisitOptions
import io.github.angularwave.android.core.turbo.webview.AngularNativeWebView
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import io.github.angularwave.android.navigation.session.SessionModalResult
import io.github.angularwave.android.navigation.util.AngularNativeViewScreenshotHolder
import io.github.angularwave.android.navigation.util.dispatcherProvider
import io.github.angularwave.android.navigation.views.AngularNativeView
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URI
import java.util.Locale

/**
 * Provides all the hooks for a web Fragment to delegate its lifecycle events
 * to this class.
 */
internal class AngularNativeWebFragmentDelegate(
    private val delegate: AngularNativeFragmentDelegate,
    private val navDestination: AngularNativeDestination,
    private val callback: AngularNativeWebFragmentCallback
) : SessionCallback, VisitDestination {

    private val location: String
        get() = destinationLocation
    private val destinationLocation: String
        get() = navDestination.location
    private val visitOptions = currentVisitOptions()
    private val identifier = generateIdentifier()
    private var isWebViewAttachedToNewDestination = false
    private val screenshotHolder = AngularNativeViewScreenshotHolder()
    private val navigator get() = navDestination.navigator
    private val session get() = navigator.session
    private val angularNativeView get() = callback.angularNativeView
    private val viewTreeLifecycleOwner get() = angularNativeView?.findViewTreeLifecycleOwner()

    /**
     * Get the session's WebView instance
     */
    val webView: AngularNativeWebView
        get() = session.webView

    /**
     * The activity result launcher that handles file chooser results.
     */
    val fileChooserResultLauncher = registerFileChooserLauncher()

    /**
     * The activity result launcher that handles geolocation permission results.
     */
    val geoLocationPermissionResultLauncher = registerGeolocationPermissionLauncher()

    fun prepareNavigation(onReady: () -> Unit) {
        session.removeCallback(this)
        detachWebView(onReady)
    }

    /**
     * Should be called by the implementing Fragment during
     * [androidx.fragment.app.Fragment.onViewCreated].
     */
    fun onViewCreated() {
        if (session.isRenderProcessGone) {
            navigator.createNewSession()
        }
    }

    /**
     * Should be called by the implementing Fragment during
     * [androidx.fragment.app.Fragment.onStart].
     */
    fun onStart() {
        initNavigationVisit()
        initWebChromeClient()
    }

    /**
     * Provides a hook when a fragment has been started again after receiving a
     * modal result. Will navigate if the result indicates it should.
     */
    fun onStartAfterModalResult(result: SessionModalResult) {
        if (!navigator.willRouteToNewDestinationWithModalResult(result)) {
            initNavigationVisit()
            initWebChromeClient()
        }
    }

    /**
     * Provides a hook when the fragment has been started again after a dialog has
     * been dismissed/canceled and no result is passed back. Initializes all necessary views and
     * executes the visit.
     */
    fun onStartAfterDialogCancel() {
        initNavigationVisit()
        initWebChromeClient()
    }

    /**
     * Provides a hook when the dialog has been canceled. Detaches the WebView
     * before navigation.
     */
    fun onDialogCancel() {
        session.removeCallback(this)
        detachWebView()
    }

    /**
     * Provides a hook when the dialog has been dismissed. Detaches the WebView
     * before navigation.
     */
    fun onDialogDismiss() {
        // The WebView is already detached in most circumstances, but sometimes
        // fast user cancellation does not call onCancel() before onDismiss()
        if (webViewIsAttached()) {
            session.removeCallback(this)
            detachWebView()
        }
    }

    /**
     * Should be called by the implementing Fragment during
     * [androidx.fragment.app.Fragment.onDestroyView].
     */
    fun onDestroyView() {
        // Manually cache a snapshot of the WebView when navigating from a
        // web screen to a native screen. This allows a "restore" visit when
        // revisiting this location again.
        if (navigator.session.currentVisit?.location != navigator.location) {
            navigator.session.cacheSnapshot()
        }
    }

    /**
     * Should be called by the implementing Fragment during [AngularNativeDestination.refresh].
     */
    fun refresh(displayProgress: Boolean) {
        val refreshLocation = currentRefreshLocation().takeIf { it.isNotBlank() } ?: return

        angularNativeView?.webViewRefresh?.apply {
            if (displayProgress && !isRefreshing) {
                isRefreshing = true
            }
        }
        angularNativeView?.removeProgressView()
        angularNativeView?.removeScreenshot()
        angularNativeView?.removeErrorView()

        isWebViewAttachedToNewDestination = false
        if (session.isTurboEnabled()) {
            visit(refreshLocation, restoreWithCachedSnapshot = false, reload = true)
        } else {
            webView.reload()
        }
    }

    /**
     * Displays the error view that's implemented via [AngularNativeWebFragmentCallback.createErrorView].
     */
    fun showErrorView(error: VisitError) {
        angularNativeView?.addErrorView(callback.createErrorView(error))
    }

    // -----------------------------------------------------------------------
    // VisitDestination interface
    // -----------------------------------------------------------------------

    override fun isActive(): Boolean {
        return navDestination.isActive
    }

    override fun activityResultLauncher(requestCode: Int): ActivityResultLauncher<Intent>? {
        return navDestination.activityResultLauncher(requestCode)
    }

    override fun activityPermissionResultLauncher(requestCode: Int): ActivityResultLauncher<String>? {
        return navDestination.activityPermissionResultLauncher(requestCode)
    }

    // -----------------------------------------------------------------------
    // SessionCallback interface
    // -----------------------------------------------------------------------

    override fun onPageStarted(location: String) {
        callback.onColdBootPageStarted(location)
    }

    override fun onPageFinished(location: String) {
        callback.onColdBootPageCompleted(location)
        if (!session.isTurboEnabled()) {
            angularNativeView?.webViewRefresh?.isRefreshing = false
            angularNativeView?.removeScreenshot()
            angularNativeView?.removeErrorView()
        }
    }

    override fun onZoomed(newScale: Float) {
        screenshotHolder.currentlyZoomed = true
        pullToRefreshEnabled(false)
    }

    override fun onZoomReset(newScale: Float) {
        screenshotHolder.currentlyZoomed = false
        pullToRefreshEnabled(navDestination.pathProperties.pullToRefreshEnabled)
    }

    override fun pageInvalidated() {}

    override fun visitLocationStarted(location: String) {
        callback.onVisitStarted(location)

        if (isWebViewAttachedToNewDestination) {
            showProgressView(location)
        }
    }

    override fun visitRendered() {
        callback.onVisitRendered(destinationLocation)
        navDestination.fragmentViewModel.setTitle(title())
        removeTransitionalViews()
    }

    override fun visitRequestFinished() {
        callback.onVisitRequestFinished(destinationLocation)
    }

    override fun visitCompleted(completedOffline: Boolean) {
        callback.onVisitCompleted(destinationLocation, completedOffline)
        navDestination.fragmentViewModel.setTitle(title())
    }

    override fun onReceivedError(error: VisitError) {
        callback.onVisitErrorReceived(destinationLocation, error)
    }

    override fun onRenderProcessGone() {
        navigator.route(destinationLocation, VisitOptions(action = VisitAction.REPLACE))
    }

    override fun requestFailedWithError(visitHasCachedSnapshot: Boolean, error: VisitError) {
        if (visitHasCachedSnapshot) {
            callback.onVisitErrorReceivedWithCachedSnapshotAvailable(destinationLocation, error)
        } else {
            callback.onVisitErrorReceived(destinationLocation, error)
        }
    }

    override fun onReceivedHttpAuthRequest(handler: HttpAuthHandler, host: String, realm: String) {
        callback.onReceivedHttpAuthRequest(handler, host, realm)
    }

    override fun visitProposedToLocation(
        location: String,
        options: VisitOptions
    ) {
        navigator.route(location, options)
    }

    override fun visitProposedToCrossOriginRedirect(location: String) {
        // Pop the current destination from the backstack since it
        // resulted in a visit failure due to a cross-origin redirect.
        navigator.pop()
        navigator.route(location)
    }

    override fun visitDestination(): VisitDestination {
        return this
    }

    override fun formSubmissionStarted(location: String) {
        callback.onFormSubmissionStarted(location)
    }

    override fun formSubmissionFinished(location: String) {
        callback.onFormSubmissionFinished(location)
    }

    // -----------------------------------------------------------------------
    // Private
    // -----------------------------------------------------------------------

    private fun currentVisitOptions(): VisitOptions {
        val visitOptions = delegate.sessionViewModel.visitOptions
        return visitOptions?.getContentIfNotHandled() ?: VisitOptions()
    }

    private fun initNavigationVisit() {
        initView()
        attachWebViewAndVisit()
    }

    private fun initView() {
        screenshotHolder.currentlyZoomed = false
        angularNativeView?.let {
            initializePullToRefresh(it)
            initializeErrorPullToRefresh(it)

            screenshotHolder.showScreenshotIfAvailable(it)
            screenshotHolder.reset()
        }
    }

    private fun initWebChromeClient() {
        webView.webChromeClient = callback.createWebChromeClient()
    }

    private fun attachWebView(onReady: (Boolean) -> Unit = {}) {
        val view = angularNativeView

        if (view == null) {
            onReady(false)
            return
        }

        view.attachWebView(webView) { attachedToNewDestination ->
            onReady(attachedToNewDestination)

            if (attachedToNewDestination) {
                callback.onWebViewAttached(webView)
            }
        }
    }

    /**
     * It's necessary to detach the shared WebView from a screen *before* it is hidden or exits and
     * the navigation animations run. The framework animator expects that the View hierarchy will
     * not change during the transition. Because the incoming screen will attach the WebView to the
     * new view hierarchy, it needs to already be detached from the previous screen.
     */
    private fun detachWebView(onReady: () -> Unit = {}) {
        viewTreeLifecycleOwner?.lifecycleScope?.launch {
            val webView = webView
            screenshotView()

            angularNativeView?.detachWebView(webView) {
                callback.onWebViewDetached(webView)
                onReady()
            }
        }
    }

    private fun attachWebViewAndVisit() {
        // Attempt to attach the WebView. It may already be attached to the current instance.
        attachWebView {
            isWebViewAttachedToNewDestination = it

            // Visit every time the WebView is reattached to the current Fragment.
            if (isWebViewAttachedToNewDestination) {
                val shouldRestoreWithCachedSnapshot = session.currentVisit != null
                val currentSessionVisitRestored = shouldRestoreWithCachedSnapshot &&
                    session.currentVisit?.destinationIdentifier == identifier &&
                    webView.url?.isSameLocationAs(destinationLocation) == true &&
                    session.restoreCurrentVisit(this)

                if (!currentSessionVisitRestored) {
                    showProgressView(destinationLocation)
                    visit(destinationLocation, restoreWithCachedSnapshot = shouldRestoreWithCachedSnapshot, reload = false)
                }
            }
        }
    }

    private fun webViewIsAttached(): Boolean {
        val webView = webView
        return angularNativeView?.webViewIsAttached(webView) ?: false
    }

    private fun title(): String {
        return webView.title ?: ""
    }

    private fun registerFileChooserLauncher(): ActivityResultLauncher<Intent> {
        return navDestination.fragment.registerForActivityResult(StartActivityForResult()) { result ->
            session.fileChooserDelegate.onActivityResult(result)
        }
    }

    private fun registerGeolocationPermissionLauncher(): ActivityResultLauncher<String> {
        return navDestination.fragment.registerForActivityResult(RequestPermission()) { isGranted ->
            session.geolocationPermissionDelegate.onActivityResult(isGranted)
        }
    }

    private fun visit(location: String, restoreWithCachedSnapshot: Boolean, reload: Boolean) {
        val restore = restoreWithCachedSnapshot && !reload
        val options = when {
            restore -> VisitOptions(action = VisitAction.RESTORE)
            reload -> VisitOptions()
            else -> visitOptions
        }

        viewTreeLifecycleOwner?.lifecycleScope?.launch {
            val snapshot = when (options.action) {
                VisitAction.ADVANCE -> fetchCachedSnapshot(location)
                else -> null
            }

            viewTreeLifecycleOwner?.lifecycle?.withStateAtLeast(STARTED) {
                session.visit(
                    Visit(
                        location = location,
                        destinationIdentifier = identifier,
                        restoreWithCachedSnapshot = restoreWithCachedSnapshot,
                        reload = reload,
                        callback = this@AngularNativeWebFragmentDelegate,
                        options = options.copy(snapshotHTML = snapshot)
                    )
                )
            }
        }
    }

    private fun currentRefreshLocation(): String {
        val sessionLocation = session.currentVisit?.location
            ?.takeIf { it.isNotBlank() && it != "about:blank" }

        return sessionLocation
            ?: webView.url
            ?.takeIf { it.isNotBlank() && it != "about:blank" }
            ?: destinationLocation
    }

    private suspend fun fetchCachedSnapshot(location: String): String? {
        return withContext(dispatcherProvider.io) {
            val response = AngularNative.config.offlineRequestHandler?.getCachedSnapshot(
                url = location
            )

            response?.data?.use {
                String(it.readBytes())
            }
        }
    }

    private suspend fun screenshotView() {
        angularNativeView?.let {
            screenshotHolder.captureScreenshot(it)
            screenshotHolder.showScreenshotIfAvailable(it)
        }
    }

    private fun showProgressView(location: String) {
        angularNativeView?.addProgressView(callback.createProgressView(location))
    }

    private fun initializePullToRefresh(angularNativeView: AngularNativeView) {
        angularNativeView.webViewRefresh?.apply {
            val density = resources.displayMetrics.density
            setDistanceToTriggerSync((70 * density).toInt())
            setProgressViewOffset(false, ( -12 * density).toInt(), (64 * density).toInt())
            isEnabled = navDestination.pathProperties.pullToRefreshEnabled
            setOnRefreshListener {
                refresh(displayProgress = true)
            }
        }
    }

    private fun initializeErrorPullToRefresh(angularNativeView: AngularNativeView) {
        angularNativeView.errorRefresh?.apply {
            setOnRefreshListener {
                refresh(displayProgress = true)
            }
        }
    }

    private fun pullToRefreshEnabled(enabled: Boolean) {
        angularNativeView?.webViewRefresh?.isEnabled = enabled
    }

    private fun removeTransitionalViews() {
        angularNativeView?.webViewRefresh?.isRefreshing = false
        angularNativeView?.errorRefresh?.isRefreshing = false
        angularNativeView?.removeProgressView()
        angularNativeView?.removeScreenshot()
        angularNativeView?.removeErrorView()
    }

    private fun generateIdentifier(): Int {
        return destinationLocation.normalizedLocation().hashCode()
    }

    private fun String.normalizedLocation(): String {
        return try {
            val uri = URI(this)
            val scheme = uri.scheme?.lowercase(Locale.ROOT) ?: ""
            val host = uri.host?.lowercase(Locale.ROOT) ?: ""
            val port = uri.port
                .takeIf { it != -1 && it != defaultPortFor(scheme) }
                ?.let { ":$it" }
                ?: ""
            val path = uri.path.orEmpty().ifBlank { "/" }.let { rawPath ->
                when {
                    rawPath == "/" -> rawPath
                    rawPath.endsWith("/") -> rawPath.dropLastWhile { it == '/' }
                    else -> rawPath
                }
            }
            val query = uri.rawQuery.orEmpty().let { if (it.isBlank()) "" else "?$it" }
            "$scheme://$host$port$path$query"
        } catch (_: Throwable) {
            trim()
        }
    }

    private fun String.isSameLocationAs(location: String): Boolean {
        return normalizedLocation() == location.normalizedLocation()
    }

    private fun defaultPortFor(scheme: String): Int = when (scheme.lowercase(Locale.ROOT)) {
        "http" -> 80
        "https" -> 443
        else -> -1
    }
}
