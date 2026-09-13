package io.github.angularwave.android.navigation.activities

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.core.net.toUri
import io.github.angularwave.android.core.config.AngularNative
import io.github.angularwave.android.core.ng.config.PathConfiguration
import io.github.angularwave.android.navigation.R
import io.github.angularwave.android.navigation.config.defaultFragmentDestination
import io.github.angularwave.android.navigation.config.registerFragmentDestinations
import io.github.angularwave.android.navigation.fragments.AngularNativeWebBottomSheetFragment
import io.github.angularwave.android.navigation.fragments.AngularNativeWebFragment
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration

/**
 * A complete single-navigator Angular Native host configured through Android manifest metadata.
 * Applications using this activity need no custom Kotlin or Java bootstrap code.
 */
open class AngularNativeHostActivity : AngularNativeActivity() {
    private lateinit var hostConfiguration: AngularNativeHostConfiguration

    override fun onCreate(savedInstanceState: Bundle?) {
        hostConfiguration = AngularNativeHostConfiguration.from(metadata())
        configureRuntime(hostConfiguration)
        super.onCreate(savedInstanceState)
        setContentView(R.layout.angular_native_activity_host)
    }

    override fun navigatorConfigurations(): List<NavigatorConfiguration> =
        listOf(
            NavigatorConfiguration(
                name = hostConfiguration.navigatorName,
                startLocation = hostConfiguration.startLocation,
                navigatorHostId = R.id.angular_native_navigator_host,
            )
        )

    private fun configureRuntime(configuration: AngularNativeHostConfiguration) {
        AngularNative.defaultFragmentDestination = AngularNativeWebFragment::class
        AngularNative.registerFragmentDestinations(
            AngularNativeWebFragment::class,
            AngularNativeWebBottomSheetFragment::class,
        )
        val debuggable = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
        AngularNative.config.debugLoggingEnabled = debuggable
        AngularNative.config.webViewDebuggingEnabled = debuggable
        AngularNative.config.applicationUserAgentPrefix = configuration.userAgentPrefix
        AngularNative.loadPathConfiguration(
            context = this,
            location =
                PathConfiguration.Location(
                    assetFilePath = configuration.pathConfigurationAsset,
                    remoteFileUrl = configuration.pathConfigurationUrl,
                ),
        )
    }

    @Suppress("DEPRECATION")
    private fun metadata(): Bundle =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManager
                .getActivityInfo(
                    componentName,
                    PackageManager.ComponentInfoFlags.of(PackageManager.GET_META_DATA.toLong()),
                )
                .metaData
        } else {
            packageManager.getActivityInfo(componentName, PackageManager.GET_META_DATA).metaData
        } ?: Bundle.EMPTY
}

/** Values accepted by [AngularNativeHostActivity]. */
data class AngularNativeHostConfiguration(
    val startLocation: String,
    val navigatorName: String,
    val pathConfigurationAsset: String,
    val pathConfigurationUrl: String?,
    val userAgentPrefix: String?,
) {
    companion object {
        const val START_LOCATION = "io.github.angularwave.android.START_LOCATION"
        const val NAVIGATOR_NAME = "io.github.angularwave.android.NAVIGATOR_NAME"
        const val PATH_CONFIGURATION_ASSET =
            "io.github.angularwave.android.PATH_CONFIGURATION_ASSET"
        const val PATH_CONFIGURATION_URL = "io.github.angularwave.android.PATH_CONFIGURATION_URL"
        const val USER_AGENT_PREFIX = "io.github.angularwave.android.USER_AGENT_PREFIX"

        internal fun from(metadata: Bundle): AngularNativeHostConfiguration {
            val startLocation = metadata.getString(START_LOCATION).orEmpty().trim()
            val uri = startLocation.toUri()
            require(uri.scheme in setOf("http", "https") && !uri.host.isNullOrBlank()) {
                "$START_LOCATION must be an absolute HTTP or HTTPS URL"
            }
            val navigatorName = metadata.getString(NAVIGATOR_NAME, "main").trim()
            require(navigatorName.isNotEmpty()) { "$NAVIGATOR_NAME must not be empty" }
            val asset =
                metadata
                    .getString(PATH_CONFIGURATION_ASSET, "angular-native/path-configuration.json")
                    .trim()
            require(asset.isNotEmpty()) { "$PATH_CONFIGURATION_ASSET must not be empty" }
            val remote = metadata.optionalString(PATH_CONFIGURATION_URL)
            remote?.let {
                val remoteUri = it.toUri()
                require(
                    remoteUri.scheme in setOf("http", "https") && !remoteUri.host.isNullOrBlank()
                ) {
                    "$PATH_CONFIGURATION_URL must be an absolute HTTP or HTTPS URL"
                }
            }
            return AngularNativeHostConfiguration(
                startLocation = startLocation,
                navigatorName = navigatorName,
                pathConfigurationAsset = asset,
                pathConfigurationUrl = remote,
                userAgentPrefix = metadata.optionalString(USER_AGENT_PREFIX),
            )
        }

        private fun Bundle.optionalString(name: String): String? =
            getString(name)?.trim()?.takeIf(String::isNotEmpty)
    }
}
