package io.github.angularwave.android.navigation.bridge

import android.content.ClipboardManager
import android.location.Location
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import com.nhaarman.mockito_kotlin.any
import com.nhaarman.mockito_kotlin.eq
import com.nhaarman.mockito_kotlin.never
import com.nhaarman.mockito_kotlin.verify
import com.nhaarman.mockito_kotlin.whenever
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AndroidNativeCapabilitiesTest {
    private val capabilities = AndroidNativeCapabilities(mock(AngularNativeDestination::class.java))

    @Test
    fun `empty clipboard preserves nullable text field`() {
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        val fragment = Fragment()
        activity.supportFragmentManager.beginTransaction().add(fragment, "clipboard").commitNow()
        activity.getSystemService(ClipboardManager::class.java).clearPrimaryClip()
        val destination = mock(AngularNativeDestination::class.java)
        whenever(destination.fragment).thenReturn(fragment)

        val result = AndroidNativeCapabilities(destination).invoke("clipboard", "read", null)

        assertTrue(result is JSONObject)
        assertTrue((result as JSONObject).has("text"))
        assertTrue(result.isNull("text"))
    }

    @Test
    fun `describes every supported platform target`() {
        val description = capabilities.describe()

        assertEquals(capabilities.targets, description.keys().asSequence().toSet())
        assertEquals(
            setOf("status", "push", "replace", "pop", "modal", "deep-link", "external"),
            description.getJSONArray("navigation").let { values ->
                List(values.length(), values::getString).toSet()
            },
        )
        assertTrue(description.getJSONArray("clipboard").toString().contains("write"))
        assertTrue(description.getJSONArray("permissions").toString().contains("status"))
        assertTrue(description.getJSONArray("permissions").toString().contains("request"))
        assertTrue(description.getJSONArray("files").toString().contains("status"))
        assertTrue(description.getJSONArray("files").toString().contains("open"))
        assertTrue(description.getJSONArray("geolocation").toString().contains("current"))
        assertTrue(description.getJSONArray("notifications").toString().contains("open-settings"))
        assertTrue(description.getJSONArray("camera").toString().contains("capture"))
        assertEquals(
            setOf("status", "watch", "unwatch"),
            description.getJSONArray("connectivity").let { values ->
                List(values.length(), values::getString).toSet()
            },
        )
        assertEquals(
            setOf("status", "watch", "unwatch"),
            description.getJSONArray("lifecycle").let { values ->
                List(values.length(), values::getString).toSet()
            },
        )
        assertEquals(
            setOf("status", "watch", "unwatch"),
            description.getJSONArray("window").let { values ->
                List(values.length(), values::getString).toSet()
            },
        )
    }

    @Test
    fun `rejects methods not advertised by a capability`() {
        val error =
            assertThrows(NativeCapabilityException::class.java) {
                capabilities.invoke("clipboard", "delete", null)
            }

        assertEquals(NativeBridgeProtocol.ErrorCode.UNKNOWN_METHOD, error.code)
    }

    @Test
    fun `reports an optional capability that is not installed`() {
        val error =
            assertThrows(NativeCapabilityException::class.java) {
                capabilities.invoke("vendor-service", "status", null)
            }

        assertEquals(NativeBridgeProtocol.ErrorCode.UNKNOWN_TARGET, error.code)
        assertFalse(capabilities.invokeAsync("vendor-service", "status", null, {}, {}, {}))
    }

    @Test
    fun `serializes current location with nullable optional coordinates`() {
        val location =
            Location("test").apply {
                latitude = 56.9496
                longitude = 24.1052
                accuracy = 4.5f
                time = 1234L
            }

        val result = capabilities.locationResult(location)

        assertEquals(56.9496, result.getDouble("latitude"), 0.0001)
        assertEquals(24.1052, result.getDouble("longitude"), 0.0001)
        assertEquals(4.5, result.getDouble("accuracy"), 0.0001)
        assertTrue(result.isNull("altitude"))
        assertTrue(result.isNull("altitudeAccuracy"))
        assertTrue(result.isNull("heading"))
        assertTrue(result.isNull("speed"))
        assertEquals(1234L, result.getLong("timestamp"))
    }

    @Test
    fun `reports coarse location as usable without claiming fine accuracy`() {
        val status =
            capabilities.geolocationStatus(
                available = true,
                fineGranted = false,
                coarseGranted = true,
            )

        assertTrue(status.getBoolean("available"))
        assertTrue(status.getBoolean("granted"))
        assertEquals("coarse", status.getString("accuracy"))
        assertEquals(
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            status.getString("permission"),
        )
    }

    @Test
    fun `reports unavailable location without an accuracy`() {
        val status =
            capabilities.geolocationStatus(
                available = false,
                fineGranted = false,
                coarseGranted = false,
            )

        assertFalse(status.getBoolean("available"))
        assertFalse(status.getBoolean("granted"))
        assertTrue(status.isNull("accuracy"))
    }

    @Test
    fun `rejects unsupported haptic styles`() {
        val error =
            assertThrows(NativeCapabilityException::class.java) {
                capabilities.hapticFeedback("surprise")
            }

        assertEquals(NativeBridgeProtocol.ErrorCode.INVALID_PARAMS, error.code)
    }

    @Test
    fun `permission request completes immediately when already granted`() {
        val destination = mock(AngularNativeDestination::class.java)
        val requested = AndroidNativeCapabilities(destination, permissionGranted = { true })
        var result: JSONObject? = null

        assertTrue(
            requested.invokeAsync(
                "permissions",
                "request",
                permissionParameters(),
                { result = it as JSONObject },
                { throw it },
                {},
            )
        )

        assertTrue(result?.getBoolean("granted") == true)
        verify(destination, never()).launchNativePermission(any(), any())
    }

    @Test
    fun `permission request distinguishes denial from permanent denial`() {
        assertEquals(
            NativeBridgeProtocol.ErrorCode.DENIED,
            deniedPermissionError(showRationale = true).code,
        )
        assertEquals(
            NativeBridgeProtocol.ErrorCode.PERMANENTLY_DENIED,
            deniedPermissionError(showRationale = false).code,
        )
    }

    @Test
    fun `permission request reports inactive and unavailable destinations`() {
        val inactive = mock(AngularNativeDestination::class.java)
        whenever(inactive.isActive).thenReturn(false)
        assertEquals(
            NativeBridgeProtocol.ErrorCode.INTERRUPTED,
            requestPermissionError(inactive).code,
        )

        val unavailable = mock(AngularNativeDestination::class.java)
        whenever(unavailable.isActive).thenReturn(true)
        whenever(unavailable.launchNativePermission(any(), any())).thenReturn(false)
        assertEquals(
            NativeBridgeProtocol.ErrorCode.UNAVAILABLE,
            requestPermissionError(unavailable).code,
        )
    }

    @Test
    fun `permission request exposes destination cancellation`() {
        val destination = mock(AngularNativeDestination::class.java)
        whenever(destination.isActive).thenReturn(true)
        whenever(destination.launchNativePermission(any(), any())).thenReturn(true)
        var cancel: (() -> Unit)? = null
        val requested = AndroidNativeCapabilities(destination, permissionGranted = { false })

        requested.invokeAsync(
            "permissions",
            "request",
            permissionParameters(),
            {},
            { throw it },
            { cancel = it },
        )
        cancel?.invoke()

        verify(destination).cancelNativePermission()
    }

    @Test
    fun `serializes captured images as content uri metadata`() {
        val file = File.createTempFile("capture", ".jpg").apply { writeBytes(byteArrayOf(1, 2, 3)) }
        try {
            val result = capabilities.captureResult(file, "content://app/captures/${file.name}")

            assertEquals("content://app/captures/${file.name}", result.getString("uri"))
            assertEquals(file.name, result.getString("name"))
            assertEquals(3L, result.getLong("size"))
            assertEquals("image/jpeg", result.getString("type"))
        } finally {
            file.delete()
        }
    }

    @Test
    fun `advertises and invokes contributed capabilities`() {
        val contributed =
            AndroidNativeCapabilities(
                mock(AngularNativeDestination::class.java),
                listOf(
                    provider("device-info", setOf("status")) { _, params ->
                        JSONObject().put("value", params.getString("value"))
                    }
                ),
            )

        assertTrue("device-info" in contributed.targets)
        assertEquals(
            listOf("status"),
            contributed.describe().getJSONArray("device-info").let { values ->
                List(values.length(), values::getString)
            },
        )
        assertEquals(
            "ready",
            (contributed.invoke("device-info", "status", JSONObject().put("value", "ready"))
                    as JSONObject)
                .getString("value"),
        )
    }

    @Test
    fun `delegates asynchronous completion failure and cancellation`() {
        var cancelled = false
        var result: Any? = null
        var error: NativeCapabilityException? = null
        val provider = NativeCapabilityProvider {
            listOf(
                object : NativeCapability {
                    override val target = "scanner"
                    override val methods = setOf("scan")

                    override fun invoke(
                        method: String,
                        params: JSONObject,
                    ): Any? = null

                    override fun invokeAsync(
                        method: String,
                        params: JSONObject,
                        complete: (Any?) -> Unit,
                        fail: (NativeCapabilityException) -> Unit,
                        onCancel: (() -> Unit) -> Unit,
                    ): Boolean {
                        onCancel { cancelled = true }
                        complete(params.getString("value"))
                        fail(
                            NativeCapabilityException(
                                NativeCapabilityErrorCode.CANCELLED,
                                "cancelled",
                            )
                        )
                        return true
                    }
                }
            )
        }
        val contributed =
            AndroidNativeCapabilities(mock(AngularNativeDestination::class.java), listOf(provider))

        assertTrue(
            contributed.invokeAsync(
                "scanner",
                "scan",
                JSONObject().put("value", "result"),
                { result = it },
                { error = it },
                { cancel -> cancel() },
            )
        )
        assertTrue(cancelled)
        assertEquals("result", result)
        assertEquals(NativeCapabilityErrorCode.CANCELLED, error?.errorCode)
        assertEquals(NativeBridgeProtocol.ErrorCode.CANCELLED, error?.code)
        assertFalse(contributed.invokeAsync("scanner", "missing", null, {}, {}, {}))
    }

    @Test
    fun `rejects invalid conflicting and duplicate contributed targets`() {
        assertThrows(IllegalArgumentException::class.java) {
            AndroidNativeCapabilities(
                mock(AngularNativeDestination::class.java),
                listOf(provider("Bad Target", setOf("status")) { _, _ -> null }),
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidNativeCapabilities(
                mock(AngularNativeDestination::class.java),
                listOf(provider("clipboard", setOf("status")) { _, _ -> null }),
            )
        }
        assertThrows(IllegalArgumentException::class.java) {
            AndroidNativeCapabilities(
                mock(AngularNativeDestination::class.java),
                listOf(
                    provider("scanner", setOf("start")) { _, _ -> null },
                    provider("scanner", setOf("stop")) { _, _ -> null },
                ),
            )
        }
    }

    @Test
    fun `closes every contributed capability without leaking provider failures`() {
        var closed = 0
        val provider = NativeCapabilityProvider {
            listOf(
                closeableCapability("first") { closed++ },
                closeableCapability("second") {
                    closed++
                    error("failure")
                },
                closeableCapability("third") { closed++ },
            )
        }
        val contributed =
            AndroidNativeCapabilities(mock(AngularNativeDestination::class.java), listOf(provider))

        contributed.close()

        assertEquals(3, closed)
    }

    @Test
    fun `close is terminal idempotent and interrupts later capability calls`() {
        var closed = 0
        val contributed =
            AndroidNativeCapabilities(
                mock(AngularNativeDestination::class.java),
                listOf(
                    NativeCapabilityProvider {
                        listOf(closeableCapability("scanner") { closed++ })
                    }
                ),
            )

        contributed.close()
        contributed.close()

        val synchronous =
            assertThrows(NativeCapabilityException::class.java) {
                contributed.invoke("scanner", "status", null)
            }
        var asynchronous: NativeCapabilityException? = null
        assertTrue(
            contributed.invokeAsync(
                "scanner",
                "status",
                null,
                {},
                { asynchronous = it },
                {},
            )
        )

        assertEquals(1, closed)
        assertEquals(NativeBridgeProtocol.ErrorCode.INTERRUPTED, synchronous.code)
        assertEquals(NativeBridgeProtocol.ErrorCode.INTERRUPTED, asynchronous?.code)
    }

    @Test
    fun `contributed capabilities emit validated destination events`() {
        var emittedTarget: String? = null
        var emittedEvent: String? = null
        var emittedData: JSONObject? = null
        val provider = NativeCapabilityProvider { context ->
            listOf(
                object : NativeCapability {
                    override val target = "scanner"
                    override val methods = setOf("scan")

                    override fun invoke(
                        method: String,
                        params: JSONObject,
                    ): Any? {
                        context.emit(target, "result", params)
                        return null
                    }
                }
            )
        }
        val contributed =
            AndroidNativeCapabilities(
                mock(AngularNativeDestination::class.java),
                listOf(provider),
                NativeCapabilityEventSink { target, event, data ->
                    emittedTarget = target
                    emittedEvent = event
                    emittedData = data
                },
            )
        val result = JSONObject().put("value", "123")

        contributed.invoke("scanner", "scan", result)

        assertEquals("scanner", emittedTarget)
        assertEquals("result", emittedEvent)
        assertEquals("123", emittedData?.getString("value"))
        val context =
            NativeCapabilityContext(
                mock(AngularNativeDestination::class.java),
                NativeCapabilityEventSink { _, _, _ -> },
            )
        assertThrows(IllegalArgumentException::class.java) {
            context.emit("Bad Target", "result")
        }
        assertThrows(IllegalArgumentException::class.java) {
            context.emit("scanner", "Bad Event")
        }
    }

    private fun provider(
        target: String,
        methods: Set<String>,
        invoke: (String, JSONObject) -> Any?,
    ) = NativeCapabilityProvider {
        listOf(
            object : NativeCapability {
                override val target = target
                override val methods = methods

                override fun invoke(
                    method: String,
                    params: JSONObject,
                ): Any? = invoke(method, params)
            }
        )
    }

    private fun closeableCapability(
        target: String,
        close: () -> Unit,
    ) =
        object : NativeCapability {
            override val target = target
            override val methods = setOf("status")

            override fun invoke(
                method: String,
                params: JSONObject,
            ): Any? = null

            override fun close() = close()
        }

    private fun deniedPermissionError(showRationale: Boolean): NativeCapabilityException {
        val destination = mock(AngularNativeDestination::class.java)
        var result: ((Boolean) -> Unit)? = null
        whenever(destination.isActive).thenReturn(true)
        whenever(destination.launchNativePermission(eq(TEST_PERMISSION), any())).thenAnswer {
            result = it.getArgument(1)
            true
        }
        val requested =
            AndroidNativeCapabilities(
                destination,
                permissionGranted = { false },
                permissionRationale = { showRationale },
            )
        var error: NativeCapabilityException? = null

        requested.invokeAsync(
            "permissions",
            "request",
            permissionParameters(),
            {},
            { error = it },
            {},
        )
        result?.invoke(false)

        return requireNotNull(error)
    }

    private fun requestPermissionError(
        destination: AngularNativeDestination
    ): NativeCapabilityException {
        val requested = AndroidNativeCapabilities(destination, permissionGranted = { false })
        var error: NativeCapabilityException? = null
        requested.invokeAsync(
            "permissions",
            "request",
            permissionParameters(),
            {},
            { error = it },
            {},
        )
        return requireNotNull(error)
    }

    private fun permissionParameters() = JSONObject().put("permission", TEST_PERMISSION)

    private companion object {
        const val TEST_PERMISSION = "android.permission.CAMERA"
    }
}
