package io.github.angularwave.android.core.turbo.webview

import android.net.Uri
import android.os.Message
import android.webkit.GeolocationPermissions
import android.webkit.JsResult
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import io.github.angularwave.android.core.R
import io.github.angularwave.android.core.turbo.session.Session
import io.github.angularwave.android.core.turbo.util.toJson
import io.github.angularwave.android.core.turbo.visit.VisitOptions

open class AngularNativeWebChromeClient(val session: Session) : WebChromeClient() {
    override fun onJsAlert(
        view: WebView?,
        url: String?,
        message: String?,
        result: JsResult?
    ): Boolean {
        val context = view?.context ?: return false

        MaterialAlertDialogBuilder(context)
            .setMessage(message)
            .setPositiveButton(context.getString(R.string.angular_native_dialog_ok)) { dialog, _ ->
                dialog.cancel()
                result?.confirm()
            }
            .setCancelable(false)
            .create()
            .show()

        return true
    }

    override fun onJsConfirm(
        view: WebView?,
        url: String?,
        message: String?,
        result: JsResult?
    ): Boolean {
        val context = view?.context ?: return false

        MaterialAlertDialogBuilder(context)
            .setMessage(message)
            .setNegativeButton(context.getString(R.string.angular_native_dialog_cancel)) { dialog, _ ->
                dialog.cancel()
                result?.cancel()
            }
            .setPositiveButton(context.getString(R.string.angular_native_dialog_ok)) { dialog, _ ->
                dialog.cancel()
                result?.confirm()
            }
            .setCancelable(false)
            .create()
            .show()

        return true
    }

    override fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: FileChooserParams
    ): Boolean {
        return session.fileChooserDelegate.onShowFileChooser(
            filePathCallback = filePathCallback,
            params = fileChooserParams
        )
    }

    override fun onCreateWindow(
        webView: WebView,
        isDialog: Boolean,
        isUserGesture: Boolean,
        resultMsg: Message?
    ): Boolean {
        val message = webView.handler?.obtainMessage() ?: return false
        webView.requestFocusNodeHref(message)

        message.data.getString("url")?.let {
            session.visitProposedToLocation(
                location = it,
                optionsJson = VisitOptions().toJson()
            )
        }

        return false
    }

    override fun onGeolocationPermissionsShowPrompt(
        origin: String?,
        callback: GeolocationPermissions.Callback?
    ) {
        session.geolocationPermissionDelegate.onRequestPermission(origin, callback)
    }
}
