package io.github.angularwave.android.sample.elements

import io.github.angularwave.android.navigation.bridge.NativeCapability
import io.github.angularwave.android.navigation.bridge.NativeCapabilityContext
import io.github.angularwave.android.navigation.bridge.NativeCapabilityErrorCode
import io.github.angularwave.android.navigation.bridge.NativeCapabilityException
import io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider
import io.github.angularwave.android.navigation.bridge.RegisterNativeCapabilityProvider
import org.json.JSONObject

@RegisterNativeCapabilityProvider("device-info")
class DeviceInfoCapabilityProvider : NativeCapabilityProvider {
    override fun capabilities(context: NativeCapabilityContext) =
        listOf(
            object : NativeCapability {
                override val target = "device-info"
                override val methods = setOf("status")

                override fun invoke(
                    method: String,
                    params: JSONObject,
                ): Any? {
                    if (method != "status") {
                        throw NativeCapabilityException(
                            NativeCapabilityErrorCode.UNKNOWN_METHOD,
                            "Unsupported device-info method: $method",
                        )
                    }
                    return JSONObject()
                        .put("package", context.context.packageName)
                        .put("active", context.destination.isActive)
                }
            }
        )
}
