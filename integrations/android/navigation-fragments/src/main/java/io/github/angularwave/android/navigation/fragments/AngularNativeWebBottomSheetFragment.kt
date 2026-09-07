package io.github.angularwave.android.navigation.fragments

import android.annotation.SuppressLint
import android.content.DialogInterface
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.activity.result.ActivityResultLauncher
import io.github.angularwave.android.core.bridge.BridgeComponent
import io.github.angularwave.android.core.bridge.BridgeComponentFragmentLifecycle
import io.github.angularwave.android.core.bridge.BridgeDelegate
import io.github.angularwave.android.core.files.util.ANGULAR_NATIVE_REQUEST_CODE_FILES
import io.github.angularwave.android.core.files.util.ANGULAR_NATIVE_REQUEST_CODE_GEOLOCATION_PERMISSION
import io.github.angularwave.android.core.turbo.errors.VisitError
import io.github.angularwave.android.core.turbo.webview.AngularNativeWebChromeClient
import io.github.angularwave.android.core.turbo.webview.AngularNativeWebView
import io.github.angularwave.android.navigation.R
import io.github.angularwave.android.navigation.bridge.AngularNativeBridge
import io.github.angularwave.android.navigation.config.AngularNativeNavigation
import io.github.angularwave.android.navigation.destinations.AngularNativeDestinationDeepLink
import io.github.angularwave.android.navigation.views.AngularNativeView

/**
 * The base class from which all bottom sheet web fragments in a
 * AngularNative app should extend from.
 *
 * For native bottom sheet fragments, refer to [AngularNativeBottomSheetFragment].
 */
@AngularNativeDestinationDeepLink(uri = "angularNative://fragment/web/modal/sheet")
open class AngularNativeWebBottomSheetFragment : AngularNativeBottomSheetFragment(), AngularNativeWebFragmentCallback {
    private lateinit var webDelegate: AngularNativeWebFragmentDelegate

    private val angularNativeBridge by lazy {
        AngularNativeBridge(this)
    }

    private val bridgeDelegate by lazy {
        BridgeDelegate(
            location = location,
            destination = this,
            componentFactories = AngularNativeNavigation.registeredBridgeComponentFactories
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webDelegate = AngularNativeWebFragmentDelegate(delegate, this, this)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.angular_native_fragment_web_bottom_sheet, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        webDelegate.onViewCreated()
        bridgeDelegate.forEachInitializedComponent<BridgeComponentFragmentLifecycle> {
            it.onViewCreated()
        }
        viewLifecycleOwner.lifecycle.addObserver(bridgeDelegate)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        webDelegate.onDestroyView()
        bridgeDelegate.forEachInitializedComponent<BridgeComponentFragmentLifecycle> {
            it.onDestroyView()
        }
        viewLifecycleOwner.lifecycle.removeObserver(bridgeDelegate)
    }

    override fun activityResultLauncher(requestCode: Int): ActivityResultLauncher<Intent>? {
        return when (requestCode) {
            ANGULAR_NATIVE_REQUEST_CODE_FILES -> webDelegate.fileChooserResultLauncher
            else -> null
        }
    }

    override fun activityPermissionResultLauncher(requestCode: Int): ActivityResultLauncher<String>? {
        return when (requestCode) {
            ANGULAR_NATIVE_REQUEST_CODE_GEOLOCATION_PERMISSION -> webDelegate.geoLocationPermissionResultLauncher
            else -> null
        }
    }

    override fun onBridgeComponentInitialized(component: BridgeComponent<*>) {
        super.onBridgeComponentInitialized(component)

        if (component is BridgeComponentFragmentLifecycle) {
            component.onViewCreated()
        }
    }

    override fun onStart() {
        super.onStart()
        webDelegate.onStart()
    }

    override fun onCancel(dialog: DialogInterface) {
        webDelegate.onDialogCancel()
        super.onCancel(dialog)
    }

    override fun onDismiss(dialog: DialogInterface) {
        webDelegate.onDialogDismiss()
        super.onDismiss(dialog)
    }

    override fun refresh(displayProgress: Boolean) {
        webDelegate.refresh(displayProgress)
    }

    final override fun prepareNavigation(onReady: () -> Unit) {
        webDelegate.prepareNavigation(onReady)
    }

    override fun onColdBootPageStarted(location: String) {
        bridgeDelegate.onColdBootPageStarted()
    }

    override fun onColdBootPageCompleted(location: String) {
        angularNativeBridge.injectEnvironment()
        bridgeDelegate.onColdBootPageCompleted()
    }

    override fun onWebViewAttached(webView: AngularNativeWebView) {
        webView.addJavascriptInterface(angularNativeBridge, "AngularNative")
        angularNativeBridge.injectEnvironment()
        bridgeDelegate.onWebViewAttached(webView)
    }

    override fun onWebViewDetached(webView: AngularNativeWebView) {
        angularNativeBridge.unmountAll()
        bridgeDelegate.onWebViewDetached()
    }

    // ----------------------------------------------------------------------------
    // AngularNativeWebFragmentCallback interface
    // ----------------------------------------------------------------------------

    /**
     * Gets the AngularNativeView instance in the Fragment's view
     * with resource ID R.id.angular_native_view.
     */
    final override val angularNativeView: AngularNativeView?
        get() = view?.findViewById(R.id.angular_native_view)

    @SuppressLint("InflateParams")
    override fun createProgressView(location: String): View {
        return layoutInflater.inflate(R.layout.angular_native_progress_bottom_sheet, null)
    }

    @SuppressLint("InflateParams")
    override fun createErrorView(error: VisitError): View {
        return layoutInflater.inflate(R.layout.angular_native_error, null).apply {
            findViewById<TextView>(R.id.angular_native_error_description).text = error.description()
        }
    }

    override fun createWebChromeClient(): AngularNativeWebChromeClient {
        return AngularNativeWebChromeClient(navigator.session)
    }

    override fun onVisitErrorReceived(location: String, error: VisitError) {
        webDelegate.showErrorView(error)
    }
}
