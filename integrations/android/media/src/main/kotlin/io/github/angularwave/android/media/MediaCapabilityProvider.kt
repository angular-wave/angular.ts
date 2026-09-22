package io.github.angularwave.android.media

import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import io.github.angularwave.android.navigation.bridge.NativeCapability
import io.github.angularwave.android.navigation.bridge.NativeCapabilityCatalog
import io.github.angularwave.android.navigation.bridge.NativeCapabilityContext
import io.github.angularwave.android.navigation.bridge.NativeCapabilityErrorCode
import io.github.angularwave.android.navigation.bridge.NativeCapabilityException
import io.github.angularwave.android.navigation.bridge.NativeCapabilityProvider
import io.github.angularwave.android.navigation.bridge.RegisterNativeCapabilityProvider
import org.json.JSONObject

@RegisterNativeCapabilityProvider(NativeCapabilityCatalog.Wire.MEDIA)
class MediaCapabilityProvider : NativeCapabilityProvider {
    override fun capabilities(context: NativeCapabilityContext): Collection<NativeCapability> =
        listOf(MediaCapability(context.context))
}

internal class MediaCapability(private val context: Context) : NativeCapability {
    override val target = NativeCapabilityCatalog.Wire.MEDIA
    override val methods = NativeCapabilityCatalog.methods(target)
    private var player: ExoPlayer? = null

    override fun invoke(
        method: String,
        params: JSONObject,
    ): Any? =
        when (method) {
            "status" -> status()

            "load" -> load(params)

            "play" -> player().also(Player::play).let { status() }

            "pause" -> player().also(Player::pause).let { status() }

            "stop" -> player().also(Player::stop).let { status() }

            "seek" -> player().also { it.seekTo(requiredPosition(params)) }.let { status() }

            "release" -> close().let { status() }

            else ->
                throw NativeCapabilityException(
                    NativeCapabilityErrorCode.UNKNOWN_METHOD,
                    "Unsupported media method: $method",
                )
        }

    private fun load(params: JSONObject): JSONObject {
        val source = params.optString("url")
        if (source.isBlank()) invalid("media.load requires params.url")
        val uri = Uri.parse(source)
        if (uri.scheme?.lowercase() !in SupportedSchemes) {
            invalid("media.load supports https, content, and android.resource URLs")
        }
        player().apply {
            setMediaItem(MediaItem.fromUri(uri))
            prepare()
            playWhenReady = params.optBoolean("autoplay", false)
        }
        return status()
    }

    private fun requiredPosition(params: JSONObject): Long {
        if (!params.has("position") || params.optLong("position", -1L) < 0L) {
            invalid("media.seek requires a non-negative params.position")
        }
        return params.getLong("position")
    }

    private fun status(): JSONObject {
        val current = player
        return JSONObject()
            .put("available", true)
            .put("loaded", current?.currentMediaItem != null)
            .put("playing", current?.isPlaying == true)
            .put("position", current?.currentPosition ?: 0L)
            .put("duration", current?.duration?.takeIf { it >= 0L } ?: JSONObject.NULL)
            .put("state", current?.playbackState?.let(::stateName) ?: "idle")
    }

    private fun player(): ExoPlayer =
        player ?: ExoPlayer.Builder(context.applicationContext).build().also { player = it }

    override fun close() {
        player?.release()
        player = null
    }

    private fun invalid(message: String): Nothing =
        throw NativeCapabilityException(
            NativeCapabilityErrorCode.INVALID_PARAMS,
            message,
        )

    private fun stateName(state: Int): String =
        when (state) {
            Player.STATE_BUFFERING -> "buffering"
            Player.STATE_READY -> "ready"
            Player.STATE_ENDED -> "ended"
            else -> "idle"
        }

    private companion object {
        val SupportedSchemes = setOf("https", "content", "android.resource")
    }
}
