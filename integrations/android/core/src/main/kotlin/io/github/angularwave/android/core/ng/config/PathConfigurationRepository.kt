package io.github.angularwave.android.core.ng.config

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import io.github.angularwave.android.core.logging.logError
import io.github.angularwave.android.core.ng.http.AngularNativeHttpClient
import io.github.angularwave.android.core.ng.util.dispatcherProvider
import io.github.angularwave.android.core.ng.util.toJson
import java.io.IOException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.withContext
import okhttp3.Request
import okhttp3.coroutines.executeAsync

internal class PathConfigurationRepository {
    private val cacheFile = "webNavigation"

    suspend fun getRemoteConfiguration(
        url: String,
        options: PathConfiguration.LoaderOptions,
    ): String? {
        val requestBuilder = Request.Builder().url(url)

        options.httpHeaders.forEach { (key, value) ->
            requestBuilder.header(key, value)
        }

        val request = requestBuilder.build()
        return issueRequest(request)
    }

    fun getBundledConfiguration(
        context: Context,
        filePath: String,
    ): String = contentFromAsset(context, filePath)

    fun getCachedConfigurationForUrl(
        context: Context,
        url: String,
    ): String? = prefs(context).getString(url, null)

    fun cacheConfigurationForUrl(
        context: Context,
        url: String,
        pathConfiguration: PathConfigurationData,
    ) {
        prefs(context).edit {
            putString(url, pathConfiguration.toJson())
        }
    }

    private suspend fun issueRequest(request: Request): String? =
        try {
            val call = AngularNativeHttpClient.instance.newCall(request)

            call.executeAsync().use { response ->
                withContext(dispatcherProvider.io) {
                    if (response.isSuccessful) {
                        response.body.string()
                    } else {
                        logError(
                            "remotePathConfigurationFailure",
                            Exception("location: ${request.url}, status code: ${response.code}"),
                        )
                        null
                    }
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: IOException) {
            logError("remotePathConfigurationException", e)
            null
        }

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(cacheFile, Context.MODE_PRIVATE)

    private fun contentFromAsset(
        context: Context,
        filePath: String,
    ): String =
        context.assets.open(filePath).use {
            String(it.readBytes())
        }
}
