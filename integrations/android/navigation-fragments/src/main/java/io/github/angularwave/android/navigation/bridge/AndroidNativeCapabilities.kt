package io.github.angularwave.android.navigation.bridge

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import android.os.CancellationSignal
import android.provider.MediaStore
import android.provider.Settings
import android.view.HapticFeedbackConstants
import android.webkit.CookieManager
import android.webkit.WebSettings
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import androidx.core.net.toUri
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import io.github.angularwave.android.core.files.util.AngularNativeFileProvider
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import io.github.angularwave.android.navigation.files.NativeFileSelection
import io.github.angularwave.android.navigation.files.NativeFileUploader
import java.io.File
import java.net.HttpURLConnection
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel as cancelScope
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

internal class AndroidNativeCapabilities(
    private val destination: AngularNativeDestination,
    providers: Iterable<NativeCapabilityProvider> =
        AndroidNativeProviders.discoverCapabilityProviders(),
    private val eventSink: NativeCapabilityEventSink = NativeCapabilityEventSink { _, _, _ -> },
    private val permissionGranted: (String) -> Boolean = { permission ->
        ContextCompat.checkSelfPermission(destination.fragment.requireContext(), permission) ==
            PackageManager.PERMISSION_GRANTED
    },
    private val permissionRationale: (String) -> Boolean = { permission ->
        destination.fragment.shouldShowRequestPermissionRationale(permission)
    },
) {
    private val closed = AtomicBoolean(false)
    private val asynchronousScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val extensions = providers.flatMap {
        it.capabilities(NativeCapabilityContext(destination, eventSink))
    }
    private var connectivityWatching = false
    private var lifecycleWatching = false
    private val windowStateDelegate = lazy {
        AndroidWindowState(
            destination.fragment.requireActivity(),
            emit = { emitStatus("window", it) },
        )
    }
    private val windowState by windowStateDelegate
    private val navigationDelegate = lazy {
        NativeNavigationDispatcher.create(
            destination,
            openExternal = { url -> openIntent(JSONObject().put("url", url)) },
            changed = { data -> eventSink.emit("navigation", "change", data) },
        )
    }
    private val navigation by navigationDelegate
    private val networkCallback =
        object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) = emitConnectivityStatus()

            override fun onLost(network: Network) = emitConnectivityStatus()

            override fun onCapabilitiesChanged(
                network: Network,
                capabilities: NetworkCapabilities,
            ) = emitConnectivityStatus()
        }
    private val lifecycleObserver =
        object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) = emitLifecycleStatus()

            override fun onResume(owner: LifecycleOwner) = emitLifecycleStatus()

            override fun onPause(owner: LifecycleOwner) = emitLifecycleStatus()

            override fun onStop(owner: LifecycleOwner) = emitLifecycleStatus()
        }

    internal fun emitConnectivityStatus() {
        if (connectivityWatching) emitStatus("connectivity", connectivityStatus())
    }

    internal fun emitLifecycleStatus() {
        if (lifecycleWatching) emitStatus("lifecycle", lifecycleStatus())
    }

    private val extensionsByTarget = buildMap {
        extensions.forEach { capability ->
            require(capability.target.matches(Identifier)) {
                "Native capability targets must use lowercase kebab-case: ${capability.target}"
            }
            require(capability.methods.isNotEmpty()) {
                "Native capability ${capability.target} must declare at least one method"
            }
            require(capability.methods.all { it.matches(Identifier) }) {
                "Native capability methods must use lowercase kebab-case"
            }
            require(capability.target !in NativeCapabilityCatalog.builtIns) {
                "Native capability target conflicts with a built-in target: ${capability.target}"
            }
            require(put(capability.target, capability) == null) {
                "Duplicate native capability target: ${capability.target}"
            }
        }
    }
    private val advertisedOperations =
        NativeCapabilityCatalog.builtIns + extensionsByTarget.mapValues { it.value.methods }

    val targets: Set<String> = advertisedOperations.keys

    fun close() {
        if (!closed.compareAndSet(false, true)) return
        stopConnectivityWatch()
        stopLifecycleWatch()
        if (navigationDelegate.isInitialized()) navigation.close()
        if (windowStateDelegate.isInitialized()) windowState.close()
        asynchronousScope.cancelScope()
        extensions.forEach { capability -> runCatching(capability::close) }
    }

    fun describe(): JSONObject =
        JSONObject().apply {
            advertisedOperations.forEach { (target, methods) -> put(target, JSONArray(methods)) }
        }

    fun invoke(target: String, method: String, params: JSONObject?): Any? {
        val methods =
            advertisedOperations[target]
                ?: throw NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.UNKNOWN_TARGET,
                    "Unsupported native target: $target",
                )
        if (method !in methods) {
            throw NativeCapabilityException(
                NativeBridgeProtocol.ErrorCode.UNKNOWN_METHOD,
                "Unsupported $target method: $method",
            )
        }
        ensureOpen()
        val values = params ?: JSONObject()
        extensionsByTarget[target]?.let {
            return it.invoke(method, values)
        }
        return when (target) {
            "navigation" -> navigation.invoke(method, values)
            "platform" -> platformStatus()
            "permissions" -> permissionStatus(values)
            "clipboard" -> clipboard(method, values)
            "sharing" -> share(values)
            "intents" -> openIntent(values)
            "haptics" -> haptic(values)
            "connectivity" ->
                watch(
                    method,
                    ::connectivityStatus,
                    ::startConnectivityWatch,
                    ::stopConnectivityWatch,
                )
            "lifecycle" ->
                watch(method, ::lifecycleStatus, ::startLifecycleWatch, ::stopLifecycleWatch)
            "window" ->
                when (method) {
                    "watch" -> windowState.watch()
                    "unwatch" -> windowState.unwatch()
                    else -> windowState.status()
                }
            "notifications" ->
                if (method == "open-settings") openNotificationSettings() else notificationStatus()
            "geolocation" -> geolocationStatus()
            "biometrics" -> biometricStatus()
            "camera" -> featureStatus(PackageManager.FEATURE_CAMERA_ANY, Manifest.permission.CAMERA)
            "files" ->
                JSONObject().put("available", true).put("contentUris", true).put("upload", true)
            else ->
                throw NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.UNKNOWN_TARGET,
                    "Unsupported native target: $target",
                )
        }
    }

    fun invokeAsync(
        target: String,
        method: String,
        params: JSONObject?,
        complete: (Any?) -> Unit,
        fail: (NativeCapabilityException) -> Unit,
        onCancel: (() -> Unit) -> Unit,
    ): Boolean {
        val methods = advertisedOperations[target] ?: return false
        if (method !in methods) return false
        if (closed.get()) {
            fail(interrupted())
            return true
        }
        val values = params ?: JSONObject()
        extensionsByTarget[target]?.let {
            return it.invokeAsync(method, values, complete, fail, onCancel)
        }
        return when {
            target == "permissions" && method == "request" ->
                requestPermission(values, complete, fail, onCancel)
            target == "geolocation" && method == "current" ->
                currentLocation(complete, fail, onCancel)
            target == "files" && method == "open" -> openFiles(values, complete, fail, onCancel)
            target == "files" && method == "upload" -> uploadFile(values, complete, fail, onCancel)
            target == "camera" && method == "capture" -> captureImage(complete, fail, onCancel)
            else -> false
        }
    }

    private fun requestPermission(
        values: JSONObject,
        complete: (Any?) -> Unit,
        fail: (NativeCapabilityException) -> Unit,
        onCancel: (() -> Unit) -> Unit,
    ): Boolean {
        val permission = values.optString("permission")
        if (permission.isBlank()) invalid("permissions.request requires params.permission")
        if (permissionGranted(permission)) {
            complete(permissionStatus(values))
        } else if (!destination.isActive) {
            fail(interrupted())
        } else if (
            !destination.launchNativePermission(permission) { granted ->
                if (granted) complete(permissionStatus(values))
                else {
                    val code =
                        if (permissionRationale(permission)) {
                            NativeBridgeProtocol.ErrorCode.DENIED
                        } else {
                            NativeBridgeProtocol.ErrorCode.PERMANENTLY_DENIED
                        }
                    fail(NativeCapabilityException(code, "Permission was denied"))
                }
            }
        ) {
            fail(
                NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
                    "Permission request is unavailable",
                )
            )
        } else {
            onCancel(destination::cancelNativePermission)
        }
        return true
    }

    @SuppressLint("MissingPermission")
    private fun currentLocation(
        complete: (Any?) -> Unit,
        fail: (NativeCapabilityException) -> Unit,
        onCancel: (() -> Unit) -> Unit,
    ): Boolean {
        if (!destination.isActive) {
            fail(interrupted())
            return true
        }
        val fine = permissionGranted(Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = permissionGranted(Manifest.permission.ACCESS_COARSE_LOCATION)
        if (!fine && !coarse) {
            fail(
                NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.DENIED,
                    "Location permission is required",
                )
            )
            return true
        }
        val manager = context.getSystemService(LocationManager::class.java)
        val provider = manager?.allProviders?.firstOrNull { manager.isProviderEnabled(it) }
        if (manager == null || provider == null) {
            fail(
                NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
                    "Location is unavailable",
                )
            )
            return true
        }
        val cancellation = CancellationSignal()
        onCancel(cancellation::cancel)
        try {
            LocationManagerCompat.getCurrentLocation(
                manager,
                provider,
                cancellation,
                ContextCompat.getMainExecutor(context),
            ) { location ->
                if (location == null) {
                    fail(
                        NativeCapabilityException(
                            NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
                            "Current location is unavailable",
                        )
                    )
                } else {
                    complete(locationResult(location))
                }
            }
        } catch (_: SecurityException) {
            fail(
                NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.DENIED,
                    "Location permission is required",
                )
            )
        }
        return true
    }

    private fun openFiles(
        values: JSONObject,
        complete: (Any?) -> Unit,
        fail: (NativeCapabilityException) -> Unit,
        onCancel: (() -> Unit) -> Unit,
    ): Boolean {
        if (!destination.isActive) {
            fail(interrupted())
            return true
        }
        val accepted = values.optJSONArray("accept")
        val types = buildList {
            if (accepted != null)
                for (index in 0 until accepted.length()) {
                    accepted.optString(index).takeIf(String::isNotBlank)?.let(::add)
                }
        }
        val intent = NativeFileSelection.intent(types, values.optBoolean("multiple"))
        if (
            !destination.launchNativeActivity(intent) { resultCode, data ->
                if (resultCode != Activity.RESULT_OK || data == null) {
                    fail(fileSelectionCancelled())
                } else {
                    val result = NativeFileSelection.result(context, data)
                    if (result.getJSONArray("files").length() == 0) {
                        fail(fileSelectionCancelled())
                    } else {
                        complete(result)
                    }
                }
            }
        ) {
            fail(
                NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
                    "File selection is unavailable",
                )
            )
        } else {
            onCancel(destination::cancelNativeActivity)
        }
        return true
    }

    private fun captureImage(
        complete: (Any?) -> Unit,
        fail: (NativeCapabilityException) -> Unit,
        onCancel: (() -> Unit) -> Unit,
    ): Boolean {
        if (!destination.isActive) {
            fail(interrupted())
            return true
        }
        if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            fail(
                NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
                    "Camera is unavailable",
                )
            )
            return true
        }
        val declaresCamera =
            context.packageManager
                .getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
                .requestedPermissions
                ?.contains(Manifest.permission.CAMERA) == true
        if (declaresCamera && !permissionGranted(Manifest.permission.CAMERA)) {
            fail(
                NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.DENIED,
                    "Camera permission is required",
                )
            )
            return true
        }
        val file =
            runCatching {
                    File.createTempFile(
                        "Capture_",
                        ".jpg",
                        AngularNativeFileProvider.directory(context, "captures"),
                    )
                }
                .getOrElse {
                    fail(
                        NativeCapabilityException(
                            NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
                            "Capture storage is unavailable",
                        )
                    )
                    return true
                }
        val uri = AngularNativeFileProvider.contentUriForFile(context, file)
        val intent =
            Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                .putExtra(MediaStore.EXTRA_OUTPUT, uri)
                .addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                )
                .apply { clipData = ClipData.newRawUri("capture", uri) }
        if (
            !destination.launchNativeActivity(intent) { resultCode, _ ->
                if (resultCode != Activity.RESULT_OK || file.length() == 0L) {
                    file.delete()
                    fail(
                        NativeCapabilityException(
                            NativeBridgeProtocol.ErrorCode.CANCELLED,
                            "Image capture was cancelled",
                        )
                    )
                } else {
                    complete(captureResult(file, uri.toString()))
                }
            }
        ) {
            file.delete()
            fail(
                NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
                    "Image capture is unavailable",
                )
            )
        } else {
            onCancel {
                destination.cancelNativeActivity()
                file.delete()
            }
        }
        return true
    }

    private fun uploadFile(
        values: JSONObject,
        complete: (Any?) -> Unit,
        fail: (NativeCapabilityException) -> Unit,
        onCancel: (() -> Unit) -> Unit,
    ): Boolean {
        if (!destination.isActive) {
            fail(interrupted())
            return true
        }
        val connection = AtomicReference<HttpURLConnection?>()
        val uploadId = values.optString("uploadId").take(128)
        val target = values.optString("url")
        val headers = mutableMapOf("User-Agent" to WebSettings.getDefaultUserAgent(context))
        CookieManager.getInstance().getCookie(target)?.takeIf(String::isNotBlank)?.let {
            headers["Cookie"] = it
        }
        val uploader =
            NativeFileUploader(
                origin = destination.location,
                openInput = { context.contentResolver.openInputStream(it) },
                contentType = { context.contentResolver.getType(it) },
                contentLength = { uri ->
                    runCatching {
                            context.contentResolver.openAssetFileDescriptor(uri, "r")?.use {
                                descriptor ->
                                descriptor.length.takeIf { length -> length >= 0 }
                            }
                        }
                        .getOrNull()
                },
                defaultHeaders = headers,
                progress = { sent, total ->
                    context.mainExecutor.execute {
                        if (!closed.get() && destination.isActive) {
                            eventSink.emit(
                                "files",
                                "progress",
                                JSONObject()
                                    .put("uploadId", uploadId)
                                    .put("sent", sent)
                                    .put("total", total ?: JSONObject.NULL),
                            )
                        }
                    }
                },
            )
        val job = asynchronousScope.launch {
            try {
                complete(uploader.upload(values, connection::set))
            } catch (_: CancellationException) {
                // The bridge cancellation reply owns this terminal state.
            } catch (error: NativeCapabilityException) {
                fail(error)
            } catch (_: Exception) {
                fail(
                    NativeCapabilityException(
                        NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
                        "File upload failed",
                    )
                )
            } finally {
                connection.set(null)
            }
        }
        onCancel {
            connection.getAndSet(null)?.disconnect()
            job.cancel()
        }
        return true
    }

    private fun interrupted() =
        NativeCapabilityException(
            NativeBridgeProtocol.ErrorCode.INTERRUPTED,
            "Destination is not active",
        )

    private fun ensureOpen() {
        if (closed.get()) throw interrupted()
    }

    private fun fileSelectionCancelled() =
        NativeCapabilityException(
            NativeBridgeProtocol.ErrorCode.CANCELLED,
            "File selection was cancelled",
        )

    private val context: Context
        get() = destination.fragment.requireContext()

    private fun watch(
        method: String,
        status: () -> JSONObject,
        start: () -> Unit,
        stop: () -> Unit,
    ): JSONObject {
        when (method) {
            "watch" -> start()
            "unwatch" -> stop()
        }
        return status()
    }

    private fun startConnectivityWatch() {
        if (connectivityWatching) return
        val manager =
            context.getSystemService(ConnectivityManager::class.java)
                ?: unavailable("Connectivity service is unavailable")
        try {
            manager.registerDefaultNetworkCallback(networkCallback)
            connectivityWatching = true
        } catch (_: SecurityException) {
            unavailable("Connectivity access is unavailable")
        }
    }

    private fun stopConnectivityWatch() {
        if (!connectivityWatching) return
        runCatching {
            context
                .getSystemService(ConnectivityManager::class.java)
                ?.unregisterNetworkCallback(networkCallback)
        }
        connectivityWatching = false
    }

    private fun startLifecycleWatch() {
        if (lifecycleWatching) return
        destination.fragment.lifecycle.addObserver(lifecycleObserver)
        lifecycleWatching = true
    }

    private fun stopLifecycleWatch() {
        if (!lifecycleWatching) return
        destination.fragment.lifecycle.removeObserver(lifecycleObserver)
        lifecycleWatching = false
    }

    private fun emitStatus(target: String, data: JSONObject) {
        eventSink.emit(target, "change", data)
    }

    private fun platformStatus() =
        JSONObject()
            .put("platform", "android")
            .put("sdk", Build.VERSION.SDK_INT)
            .put("package", context.packageName)
            .put(
                "darkMode",
                (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                    Configuration.UI_MODE_NIGHT_YES,
            )

    private fun permissionStatus(params: JSONObject): JSONObject {
        val permission = params.optString("permission")
        if (permission.isBlank()) invalid("permissions.status requires params.permission")
        return JSONObject()
            .put("permission", permission)
            .put(
                "granted",
                permissionGranted(permission),
            )
            .put("canRequest", destination.isActive)
    }

    private fun clipboard(method: String, params: JSONObject): Any? {
        val clipboard =
            context.getSystemService(ClipboardManager::class.java)
                ?: unavailable("Clipboard is unavailable")
        return when (method) {
            "read" ->
                JSONObject()
                    .put(
                        "text",
                        clipboard.primaryClip?.getItemAt(0)?.coerceToText(context)?.toString()
                            ?: JSONObject.NULL,
                    )
            "write" -> {
                clipboard.setPrimaryClip(
                    ClipData.newPlainText(
                        params.optString("label", "AngularTS"),
                        params.optString("text"),
                    )
                )
                JSONObject().put("written", true)
            }
            else -> null
        }
    }

    private fun share(params: JSONObject): JSONObject {
        val text = params.optString("text")
        if (text.isBlank()) invalid("sharing.share requires params.text")
        val intent =
            Intent(Intent.ACTION_SEND)
                .setType(params.optString("type", "text/plain"))
                .putExtra(Intent.EXTRA_TEXT, text)
        context.startActivity(Intent.createChooser(intent, params.optString("title", "Share")))
        return JSONObject().put("opened", true)
    }

    private fun openIntent(params: JSONObject): JSONObject {
        val value = params.optString("url")
        val uri =
            runCatching { value.toUri() }.getOrNull()
                ?: invalid("intents.open requires a valid params.url")
        if (uri.scheme !in setOf("https", "http", "mailto", "tel", "geo")) {
            throw NativeCapabilityException(
                NativeBridgeProtocol.ErrorCode.UNAUTHORIZED,
                "Intent scheme is not allowed",
            )
        }
        val intent = Intent(Intent.ACTION_VIEW, uri)
        try {
            context.startActivity(intent)
        } catch (_: android.content.ActivityNotFoundException) {
            unavailable("No application can open this URL")
        }
        return JSONObject().put("opened", true)
    }

    private fun haptic(params: JSONObject): JSONObject {
        val feedback = hapticFeedback(params.optString("style", "click"))
        val performed = destination.fragment.view?.performHapticFeedback(feedback) == true
        return JSONObject().put("performed", performed)
    }

    internal fun hapticFeedback(style: String): Int =
        when (style) {
            "longPress" -> HapticFeedbackConstants.LONG_PRESS
            "keyboard" -> HapticFeedbackConstants.KEYBOARD_TAP
            "click" -> HapticFeedbackConstants.CONTEXT_CLICK
            else -> invalid("haptics.perform params.style is invalid")
        }

    private fun connectivityStatus(): JSONObject {
        val manager =
            context.getSystemService(ConnectivityManager::class.java)
                ?: return JSONObject()
                    .put("connected", false)
                    .put("validated", false)
                    .put("metered", false)
        val capabilities = manager.getNetworkCapabilities(manager.activeNetwork)
        return JSONObject()
            .put(
                "connected",
                capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true,
            )
            .put(
                "validated",
                capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true,
            )
            .put("metered", manager.isActiveNetworkMetered)
    }

    private fun lifecycleStatus() =
        JSONObject()
            .put("state", destination.fragment.lifecycle.currentState.name.lowercase())
            .put("active", destination.isActive)

    private fun notificationStatus(): JSONObject {
        val permission =
            if (Build.VERSION.SDK_INT >= 33) Manifest.permission.POST_NOTIFICATIONS else null
        val manager = context.getSystemService(NotificationManager::class.java)
        return JSONObject()
            .put("available", manager != null)
            .put(
                "granted",
                manager?.areNotificationsEnabled() == true &&
                    (permission == null || permissionGranted(permission)),
            )
            .put("permission", permission)
    }

    private fun openNotificationSettings(): JSONObject {
        val intent =
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        try {
            context.startActivity(intent)
        } catch (_: android.content.ActivityNotFoundException) {
            unavailable("Notification settings are unavailable")
        }
        return JSONObject().put("opened", true)
    }

    private fun biometricStatus(): JSONObject {
        val manager = context.getSystemService(KeyguardManager::class.java)
        val hardware =
            listOf(
                    PackageManager.FEATURE_FINGERPRINT,
                    "android.hardware.biometrics.face",
                    "android.hardware.biometrics.iris",
                )
                .any(context.packageManager::hasSystemFeature)
        return JSONObject()
            .put("available", hardware)
            .put("enrolled", hardware && manager?.isDeviceSecure == true)
            .put("permission", JSONObject.NULL)
    }

    private fun geolocationStatus(): JSONObject =
        geolocationStatus(
            available = context.packageManager.hasSystemFeature(PackageManager.FEATURE_LOCATION),
            fineGranted = permissionGranted(Manifest.permission.ACCESS_FINE_LOCATION),
            coarseGranted = permissionGranted(Manifest.permission.ACCESS_COARSE_LOCATION),
        )

    internal fun geolocationStatus(
        available: Boolean,
        fineGranted: Boolean,
        coarseGranted: Boolean,
    ): JSONObject =
        JSONObject()
            .put("available", available)
            .put("granted", fineGranted || coarseGranted)
            .put(
                "accuracy",
                when {
                    fineGranted -> "fine"
                    coarseGranted -> "coarse"
                    else -> JSONObject.NULL
                },
            )
            .put("permission", Manifest.permission.ACCESS_FINE_LOCATION)

    private fun featureStatus(feature: String, permission: String?): JSONObject =
        JSONObject()
            .put("available", context.packageManager.hasSystemFeature(feature))
            .put(
                "granted",
                permission == null || permissionGranted(permission),
            )
            .put("permission", permission)

    internal fun locationResult(location: Location): JSONObject =
        JSONObject()
            .put("latitude", location.latitude)
            .put("longitude", location.longitude)
            .put("accuracy", location.accuracy)
            .put("altitude", if (location.hasAltitude()) location.altitude else JSONObject.NULL)
            .put(
                "altitudeAccuracy",
                if (location.hasVerticalAccuracy()) {
                    location.verticalAccuracyMeters
                } else {
                    JSONObject.NULL
                },
            )
            .put("heading", if (location.hasBearing()) location.bearing else JSONObject.NULL)
            .put("speed", if (location.hasSpeed()) location.speed else JSONObject.NULL)
            .put("timestamp", location.time)

    internal fun captureResult(file: File, uri: String): JSONObject =
        JSONObject()
            .put("uri", uri)
            .put("name", file.name)
            .put("size", file.length())
            .put("type", "image/jpeg")

    private fun invalid(message: String): Nothing =
        throw NativeCapabilityException(
            NativeBridgeProtocol.ErrorCode.INVALID_PARAMS,
            message,
        )

    private fun unavailable(message: String): Nothing =
        throw NativeCapabilityException(
            NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
            message,
        )

    private companion object {
        val Identifier = Regex("[a-z][a-z0-9]*(?:-[a-z0-9]+)*")
    }
}
