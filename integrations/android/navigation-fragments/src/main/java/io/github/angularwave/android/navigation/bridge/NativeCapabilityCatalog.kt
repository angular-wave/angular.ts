// Generated code. Do not edit directly.
// Source: integrations/android/scripts/generate-native-capabilities.mjs.
package io.github.angularwave.android.navigation.bridge

enum class NativeCapabilityAvailability {
    DEVICE,
    OPTIONAL,
    REQUIRED,
}

enum class NativeCapabilityThreading(val value: String) {
    MAIN("main")
}

enum class NativeCapabilityLifecycle(val value: String) {
    DESTINATION("destination")
}

internal data class NativeCapabilityCatalogEntry(
    val name: String,
    val artifact: String,
    val availability: NativeCapabilityAvailability,
    val threading: NativeCapabilityThreading,
    val lifecycle: NativeCapabilityLifecycle,
    val errorProtocol: String,
    val minSdk: Int,
    val permission: String?,
    val methods: Set<String>,
    val events: Set<String>,
)

/** Native capability names and operations shared with AngularTS integrations. */
object NativeCapabilityCatalog {
    object Wire {
        const val BIOMETRICS = "biometrics"
        const val CAMERA = "camera"
        const val CAPTURE = "capture"
        const val CHANGE = "change"
        const val CLEAR = "clear"
        const val CLIPBOARD = "clipboard"
        const val CONNECTIVITY = "connectivity"
        const val CREATE_PASSKEY = "create-passkey"
        const val CREATE_PASSWORD = "create-password"
        const val CREDENTIALS = "credentials"
        const val CURRENT = "current"
        const val DEEP_LINK = "deep-link"
        const val EXTERNAL = "external"
        const val FILES = "files"
        const val GEOLOCATION = "geolocation"
        const val GET = "get"
        const val HAPTICS = "haptics"
        const val INTENTS = "intents"
        const val LIFECYCLE = "lifecycle"
        const val LOAD = "load"
        const val MEDIA = "media"
        const val MODAL = "modal"
        const val NAVIGATION = "navigation"
        const val NOTIFICATIONS = "notifications"
        const val OPEN = "open"
        const val OPEN_SETTINGS = "open-settings"
        const val PAUSE = "pause"
        const val PERFORM = "perform"
        const val PERMISSIONS = "permissions"
        const val PLATFORM = "platform"
        const val PLAY = "play"
        const val POP = "pop"
        const val PROGRESS = "progress"
        const val PUSH = "push"
        const val READ = "read"
        const val RELEASE = "release"
        const val REPLACE = "replace"
        const val REQUEST = "request"
        const val SEEK = "seek"
        const val SHARE = "share"
        const val SHARING = "sharing"
        const val STATUS = "status"
        const val STOP = "stop"
        const val UNWATCH = "unwatch"
        const val UPLOAD = "upload"
        const val WATCH = "watch"
        const val WINDOW = "window"
        const val WRITE = "write"
    }

    internal val all: List<NativeCapabilityCatalogEntry> =
        listOf(
            NativeCapabilityCatalogEntry(
                name = Wire.NAVIGATION,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.REQUIRED,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods =
                    linkedSetOf(
                        Wire.STATUS,
                        Wire.PUSH,
                        Wire.REPLACE,
                        Wire.POP,
                        Wire.MODAL,
                        Wire.DEEP_LINK,
                        Wire.EXTERNAL,
                    ),
                events = linkedSetOf(Wire.CHANGE),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.PLATFORM,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.REQUIRED,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.STATUS),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.PERMISSIONS,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.REQUIRED,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.STATUS, Wire.REQUEST),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.CLIPBOARD,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.DEVICE,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.READ, Wire.WRITE),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.SHARING,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.DEVICE,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.SHARE),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.INTENTS,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.DEVICE,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.OPEN),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.HAPTICS,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.DEVICE,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.PERFORM),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.CONNECTIVITY,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.REQUIRED,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = "android.permission.ACCESS_NETWORK_STATE",
                methods = linkedSetOf(Wire.STATUS, Wire.WATCH, Wire.UNWATCH),
                events = linkedSetOf(Wire.CHANGE),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.LIFECYCLE,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.REQUIRED,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.STATUS, Wire.WATCH, Wire.UNWATCH),
                events = linkedSetOf(Wire.CHANGE),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.WINDOW,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.REQUIRED,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.STATUS, Wire.WATCH, Wire.UNWATCH),
                events = linkedSetOf(Wire.CHANGE),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.NOTIFICATIONS,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.DEVICE,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = "android.permission.POST_NOTIFICATIONS",
                methods = linkedSetOf(Wire.STATUS, Wire.OPEN_SETTINGS),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.GEOLOCATION,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.DEVICE,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = "android.permission.ACCESS_FINE_LOCATION",
                methods = linkedSetOf(Wire.STATUS, Wire.CURRENT),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.BIOMETRICS,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.DEVICE,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.STATUS),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.CAMERA,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.DEVICE,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = "android.permission.CAMERA",
                methods = linkedSetOf(Wire.STATUS, Wire.CAPTURE),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.FILES,
                artifact = "navigation",
                availability = NativeCapabilityAvailability.DEVICE,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods = linkedSetOf(Wire.STATUS, Wire.OPEN, Wire.UPLOAD),
                events = linkedSetOf(Wire.PROGRESS),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.CREDENTIALS,
                artifact = "credentials",
                availability = NativeCapabilityAvailability.OPTIONAL,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods =
                    linkedSetOf(
                        Wire.STATUS,
                        Wire.GET,
                        Wire.CREATE_PASSWORD,
                        Wire.CREATE_PASSKEY,
                        Wire.CLEAR,
                    ),
                events = linkedSetOf(),
            ),
            NativeCapabilityCatalogEntry(
                name = Wire.MEDIA,
                artifact = "media",
                availability = NativeCapabilityAvailability.OPTIONAL,
                threading = NativeCapabilityThreading.MAIN,
                lifecycle = NativeCapabilityLifecycle.DESTINATION,
                errorProtocol = "native-bridge-v1",
                minSdk = 28,
                permission = null,
                methods =
                    linkedSetOf(
                        Wire.STATUS,
                        Wire.LOAD,
                        Wire.PLAY,
                        Wire.PAUSE,
                        Wire.STOP,
                        Wire.SEEK,
                        Wire.RELEASE,
                    ),
                events = linkedSetOf(),
            ),
        )

    internal val builtIns: LinkedHashMap<String, Set<String>> =
        all.filter { it.artifact == "navigation" }
            .associateTo(linkedMapOf()) { it.name to it.methods }

    fun methods(name: String): Set<String> =
        requireNotNull(all.find { it.name == name }) {
                "Unknown generated native capability: $name"
            }
            .methods
}
