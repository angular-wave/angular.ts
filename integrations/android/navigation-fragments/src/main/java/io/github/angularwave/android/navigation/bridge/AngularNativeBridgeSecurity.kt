package io.github.angularwave.android.navigation.bridge

import java.net.URI
import java.security.MessageDigest
import java.util.UUID

internal class AngularNativeBridgeSecurity(
    destinationLocation: String,
    val sessionToken: String = UUID.randomUUID().toString()
) {
    private val destinationOrigin = origin(destinationLocation)

    fun accepts(session: String?, currentLocation: String?): Boolean {
        if (session == null || currentLocation == null) return false

        val sessionMatches = MessageDigest.isEqual(
            session.toByteArray(Charsets.UTF_8),
            sessionToken.toByteArray(Charsets.UTF_8)
        )

        return sessionMatches && destinationOrigin != null &&
            destinationOrigin == origin(currentLocation)
    }

    private fun origin(location: String): Origin? {
        return try {
            val uri = URI(location)
            val scheme = uri.scheme?.lowercase() ?: return null
            val host = uri.host?.lowercase() ?: return null

            if (scheme !in setOf("http", "https")) return null

            Origin(
                scheme = scheme,
                host = host,
                port = when {
                    uri.port >= 0 -> uri.port
                    scheme == "https" -> 443
                    else -> 80
                }
            )
        } catch (_: Exception) {
            null
        }
    }

    private data class Origin(
        val scheme: String,
        val host: String,
        val port: Int
    )
}
