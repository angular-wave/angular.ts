package io.github.angularwave.android.credentials

import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CreatePasswordRequest
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.Credential
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPasswordOption
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PasswordCredential
import androidx.credentials.PublicKeyCredential
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.CreateCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException
import androidx.credentials.exceptions.NoCredentialException
import androidx.lifecycle.lifecycleScope
import io.github.angularwave.android.navigation.bridge.NativeCapability
import io.github.angularwave.android.navigation.bridge.NativeCapabilityCatalog
import io.github.angularwave.android.navigation.bridge.NativeCapabilityContext
import io.github.angularwave.android.navigation.bridge.NativeCapabilityErrorCode
import io.github.angularwave.android.navigation.bridge.NativeCapabilityException
import io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider
import io.github.angularwave.android.navigation.bridge.RegisterNativeCapabilityProvider
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import java.util.Collections
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.json.JSONObject

@RegisterNativeCapabilityProvider(NativeCapabilityCatalog.Wire.CREDENTIALS)
class CredentialCapabilityProvider : NativeCapabilityProvider {
    override fun capabilities(context: NativeCapabilityContext): Collection<NativeCapability> =
        listOf(CredentialCapability(context.destination))
}

internal class CredentialCapability(
    private val destination: AngularNativeDestination,
    private val manager: CredentialManager =
        CredentialManager.create(destination.fragment.requireContext()),
) : NativeCapability {
    override val target = NativeCapabilityCatalog.Wire.CREDENTIALS
    override val methods = NativeCapabilityCatalog.methods(target)
    private val jobs = Collections.synchronizedSet(mutableSetOf<Job>())
    private val context: Context
        get() = destination.fragment.requireContext()

    override fun invoke(
        method: String,
        params: JSONObject,
    ): Any? =
        when (method) {
            "status" -> {
                JSONObject().put("available", true).put("passwords", true).put("passkeys", true)
            }

            else -> {
                throw NativeCapabilityException(
                    NativeCapabilityErrorCode.UNKNOWN_METHOD,
                    "Unsupported synchronous credentials method: $method",
                )
            }
        }

    override fun invokeAsync(
        method: String,
        params: JSONObject,
        complete: (Any?) -> Unit,
        fail: (NativeCapabilityException) -> Unit,
        onCancel: (() -> Unit) -> Unit,
    ): Boolean {
        if (method !in methods || method == "status") return false
        if (!destination.isActive) {
            fail(
                NativeCapabilityException(
                    NativeCapabilityErrorCode.INTERRUPTED,
                    "Destination is not active",
                )
            )
            return true
        }
        val job =
            destination.fragment.lifecycleScope.launch {
                runCatching {
                        when (method) {
                            "get" -> get(params)
                            "create-password" -> createPassword(params)
                            "create-passkey" -> createPasskey(params)
                            "clear" -> clear()
                            else -> error("unreachable")
                        }
                    }
                    .fold(
                        onSuccess = complete,
                        onFailure = { error ->
                            when (error) {
                                is CancellationException -> throw error
                                is Exception -> fail(error.toNativeCredentialFailure())
                                else -> throw error
                            }
                        },
                    )
            }
        jobs += job
        job.invokeOnCompletion { jobs -= job }
        onCancel(job::cancel)
        return true
    }

    private suspend fun get(params: JSONObject): JSONObject {
        val request =
            GetCredentialRequest.Builder()
                .apply {
                    if (params.optBoolean("passwords", true))
                        addCredentialOption(GetPasswordOption())
                    params.optString("passkeyRequestJson").takeIf(String::isNotBlank)?.let {
                        addCredentialOption(GetPublicKeyCredentialOption(it))
                    }
                }
                .build()
        if (request.credentialOptions.isEmpty())
            invalid("credentials.get requires passwords or passkeyRequestJson")
        return credentialJson(manager.getCredential(context, request).credential)
    }

    private suspend fun createPassword(params: JSONObject): JSONObject {
        val id = params.optString("id")
        val password = params.optString("password")
        if (id.isBlank() || password.isBlank()) {
            invalid("credentials.create-password requires params.id and params.password")
        }
        manager.createCredential(context, CreatePasswordRequest(id, password))
        return JSONObject().put("created", true).put("type", "password")
    }

    private suspend fun createPasskey(params: JSONObject): JSONObject {
        val requestJson = params.optString("requestJson")
        if (requestJson.isBlank()) invalid("credentials.create-passkey requires params.requestJson")
        manager.createCredential(context, CreatePublicKeyCredentialRequest(requestJson))
        return JSONObject().put("created", true).put("type", "public-key")
    }

    private suspend fun clear(): JSONObject {
        manager.clearCredentialState(ClearCredentialStateRequest())
        return JSONObject().put("cleared", true)
    }

    private fun credentialJson(credential: Credential): JSONObject =
        when (credential) {
            is PasswordCredential -> {
                JSONObject()
                    .put("type", "password")
                    .put("id", credential.id)
                    .put("password", credential.password)
            }

            is PublicKeyCredential -> {
                JSONObject()
                    .put("type", "public-key")
                    .put("authenticationResponseJson", credential.authenticationResponseJson)
            }

            is CustomCredential -> {
                JSONObject().put("type", credential.type)
            }

            else -> {
                JSONObject().put("type", credential.type)
            }
        }

    private fun invalid(message: String): Nothing =
        throw NativeCapabilityException(
            NativeCapabilityErrorCode.INVALID_PARAMS,
            message,
        )

    override fun close() {
        jobs.toList().forEach(Job::cancel)
        jobs.clear()
    }
}

internal fun Exception.toNativeCredentialFailure(): NativeCapabilityException =
    when (this) {
        is NativeCapabilityException -> {
            this
        }

        is CancellationException,
        is GetCredentialCancellationException,
        is CreateCredentialCancellationException -> {
            NativeCapabilityException(
                NativeCapabilityErrorCode.CANCELLED,
                "Credential operation was cancelled",
            )
        }

        is NoCredentialException,
        is GetCredentialProviderConfigurationException -> {
            NativeCapabilityException(
                NativeCapabilityErrorCode.UNAVAILABLE,
                message ?: "Credential provider is unavailable",
            )
        }

        is IllegalArgumentException -> {
            NativeCapabilityException(
                NativeCapabilityErrorCode.INVALID_PARAMS,
                message ?: "Credential parameters are invalid",
            )
        }

        is GetCredentialException,
        is CreateCredentialException,
        is ClearCredentialException -> {
            NativeCapabilityException(
                NativeCapabilityErrorCode.INTERNAL_ERROR,
                message ?: "Credential operation failed",
            )
        }

        else -> {
            NativeCapabilityException(
                NativeCapabilityErrorCode.INTERNAL_ERROR,
                "Credential operation failed",
            )
        }
    }
