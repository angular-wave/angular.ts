package io.github.angularwave.android.credentials

import io.github.angularwave.android.navigation.bridge.NativeCapabilityErrorCode
import io.github.angularwave.android.navigation.bridge.NativeCapabilityException
import io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider
import java.util.ServiceLoader
import kotlinx.coroutines.CancellationException
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class CredentialCapabilityContractTest {
    @Test
    fun `generated metadata discovers the provider`() {
        val providers = ServiceLoader.load(NativeCapabilityProvider::class.java).toList()

        assertTrue(providers.any { it is CredentialCapabilityProvider })
    }

    @Test
    fun `public failure preserves stable code`() {
        val failure =
            NativeCapabilityException(NativeCapabilityErrorCode.UNAVAILABLE, "unavailable")

        assertEquals(NativeCapabilityErrorCode.UNAVAILABLE, failure.errorCode)
        assertTrue(failure.message!!.contains("unavailable"))
    }

    @Test
    fun `unknown public operation is typed`() {
        val failure =
            assertThrows(NativeCapabilityException::class.java) {
                object : io.github.angularwave.android.navigation.bridge.NativeCapability {
                        override val target = "credentials"
                        override val methods = setOf("status")

                        override fun invoke(
                            method: String,
                            params: JSONObject,
                        ): Any? =
                            throw NativeCapabilityException(
                                NativeCapabilityErrorCode.UNKNOWN_METHOD,
                                "Unsupported credentials method: $method",
                            )
                    }
                    .invoke("missing", JSONObject())
            }

        assertEquals(NativeCapabilityErrorCode.UNKNOWN_METHOD, failure.errorCode)
    }

    @Test
    fun `credential failures use stable public error codes`() {
        assertEquals(
            NativeCapabilityErrorCode.INVALID_PARAMS,
            IllegalArgumentException("invalid request").toNativeCredentialFailure().errorCode,
        )
        assertEquals(
            NativeCapabilityErrorCode.CANCELLED,
            CancellationException("cancelled").toNativeCredentialFailure().errorCode,
        )
        assertEquals(
            NativeCapabilityErrorCode.INTERNAL_ERROR,
            IllegalStateException("private provider detail").toNativeCredentialFailure().errorCode,
        )
    }

    @Test
    fun `unexpected credential failures do not expose provider details`() {
        val failure = IllegalStateException("private provider detail").toNativeCredentialFailure()

        assertEquals("Credential operation failed", failure.message)
    }
}
