package io.github.angularwave.android.navigation.files

import android.net.Uri
import androidx.core.net.toUri
import io.github.angularwave.android.navigation.bridge.NativeBridgeProtocol
import io.github.angularwave.android.navigation.bridge.NativeCapabilityException
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.nio.charset.StandardCharsets
import java.util.UUID
import org.json.JSONObject
import org.json.JSONTokener

internal class NativeFileUploader(
    private val origin: String,
    private val openInput: (Uri) -> InputStream?,
    private val contentType: (Uri) -> String?,
    private val contentLength: (Uri) -> Long? = { null },
    private val defaultHeaders: Map<String, String> = emptyMap(),
    private val progress: (sent: Long, total: Long?) -> Unit = { _, _ -> },
    private val openConnection: (URL) -> HttpURLConnection = {
        it.openConnection() as HttpURLConnection
    },
) {
    fun upload(
        parameters: JSONObject,
        connected: (HttpURLConnection) -> Unit = {},
    ): JSONObject {
        val uri = requireContentUri(parameters.optString("uri"))
        val target = requireSameOriginUrl(parameters.optString("url"))
        val field = parameters.optString("field", "file")
        if (!field.matches(FIELD_NAME)) invalid("files.upload params.field is invalid")
        val name = sanitizeName(parameters.optString("name", "upload"))
        val type =
            parameters.optString("type").takeIf(String::isNotBlank)
                ?: contentType(uri)
                ?: "application/octet-stream"
        if (!type.matches(MIME_TYPE)) invalid("files.upload params.type is invalid")
        val boundary = "AngularNative-${UUID.randomUUID()}"
        val connection = openConnection(target.toURL())
        connected(connection)
        try {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.instanceFollowRedirects = false
            connection.connectTimeout = CONNECT_TIMEOUT_MS
            connection.readTimeout = READ_TIMEOUT_MS
            connection.setChunkedStreamingMode(BUFFER_SIZE)
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            applyDefaultHeaders(connection)
            applyHeaders(connection, parameters.optJSONObject("headers"))
            connection.outputStream.buffered(BUFFER_SIZE).use { output ->
                parameters.optJSONObject("fields")?.let { fields ->
                    if (fields.length() > MAX_FIELDS) {
                        invalid("files.upload accepts at most $MAX_FIELDS fields")
                    }
                    fields.keys().forEach { key ->
                        writePart(output, boundary, key, fields.optString(key))
                    }
                }
                output.write("--$boundary\r\n".bytes())
                output.write(
                    "Content-Disposition: form-data; name=\"$field\"; filename=\"$name\"\r\n"
                        .bytes()
                )
                output.write("Content-Type: $type\r\n\r\n".bytes())
                val input = openInput(uri) ?: unavailable("Selected file is no longer available")
                val total = contentLength(uri)?.takeIf { it >= 0 }
                progress(0, total)
                input.use { stream -> copyBounded(stream, output, total) }
                output.write("\r\n--$boundary--\r\n".bytes())
            }
            val status = connection.responseCode
            val response =
                (if (status in HTTP_SUCCESS) connection.inputStream else connection.errorStream)
                    ?.use(::readBounded)
                    .orEmpty()
            if (status !in HTTP_SUCCESS) {
                unavailable("File upload failed with HTTP $status")
            }
            return JSONObject()
                .put("status", status)
                .put("body", parseResponse(response))
                .put("name", name)
                .put("type", type)
        } finally {
            connection.disconnect()
        }
    }

    private fun requireContentUri(value: String): Uri {
        val uri = value.toUri()
        if (uri.scheme != "content" || uri.authority.isNullOrBlank()) {
            invalid("files.upload requires a content:// params.uri")
        }
        return uri
    }

    private fun requireSameOriginUrl(value: String): URI {
        val source = runCatching { URI(origin) }.getOrNull() ?: unauthorizedUpload()
        val target = runCatching { URI(value) }.getOrNull() ?: unauthorizedUpload()
        if (target.scheme !in HTTP_SCHEMES || target.host.isNullOrBlank()) unauthorizedUpload()
        if (target.userInfo != null || target.fragment != null) unauthorizedUpload()
        if (!source.scheme.equals(target.scheme, ignoreCase = true)) unauthorizedUpload()
        if (!source.host.equals(target.host, ignoreCase = true)) unauthorizedUpload()
        if (effectivePort(source) != effectivePort(target)) unauthorizedUpload()
        return target
    }

    private fun unauthorizedUpload(): Nothing =
        throw NativeCapabilityException(
            NativeBridgeProtocol.ErrorCode.UNAUTHORIZED,
            "files.upload only permits the current application origin",
        )

    private fun applyHeaders(connection: HttpURLConnection, headers: JSONObject?) {
        headers?.keys()?.forEach { name ->
            if (!name.matches(HEADER_NAME) || name.lowercase() in FORBIDDEN_HEADERS) {
                invalid("files.upload header is not allowed: $name")
            }
            connection.setRequestProperty(name, requireHeaderValue(headers.optString(name)))
        }
    }

    private fun applyDefaultHeaders(connection: HttpURLConnection) {
        defaultHeaders.forEach { (name, value) ->
            if (!name.matches(HEADER_NAME)) invalid("files.upload default header is invalid: $name")
            connection.setRequestProperty(name, requireHeaderValue(value))
        }
    }

    private fun requireHeaderValue(value: String): String {
        if (value.length > MAX_HEADER_VALUE_LENGTH || value.any { it == '\r' || it == '\n' }) {
            invalid("files.upload header value is invalid")
        }
        return value
    }

    private fun copyBounded(
        input: InputStream,
        output: java.io.OutputStream,
        expected: Long?,
    ) {
        val buffer = ByteArray(BUFFER_SIZE)
        var total = 0L
        var reported = 0L
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            total += count
            if (total > MAX_UPLOAD_BYTES) invalid("Selected file exceeds the 100 MiB limit")
            output.write(buffer, 0, count)
            if (total - reported >= PROGRESS_STEP_BYTES) {
                progress(total, expected)
                reported = total
            }
        }
        if (total != reported) progress(total, expected ?: total)
    }

    private fun readBounded(input: InputStream): String {
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(BUFFER_SIZE)
        var total = 0
        while (true) {
            val count = input.read(buffer)
            if (count < 0) break
            total += count
            if (total > MAX_RESPONSE_BYTES) unavailable("Upload response is too large")
            output.write(buffer, 0, count)
        }
        return output.toString(StandardCharsets.UTF_8.name())
    }

    private fun writePart(
        output: java.io.OutputStream,
        boundary: String,
        name: String,
        value: String,
    ) {
        if (!name.matches(FIELD_NAME)) invalid("files.upload field is invalid: $name")
        if (value.toByteArray(StandardCharsets.UTF_8).size > MAX_FIELD_BYTES) {
            invalid("files.upload field is too large: $name")
        }
        output.write("--$boundary\r\n".bytes())
        output.write("Content-Disposition: form-data; name=\"$name\"\r\n\r\n".bytes())
        output.write(value.bytes())
        output.write("\r\n".bytes())
    }

    private fun parseResponse(value: String): Any =
        value.takeIf(String::isNotBlank)?.let {
            runCatching { JSONTokener(it).nextValue() }.getOrElse { value }
        } ?: JSONObject.NULL

    private fun sanitizeName(value: String): String =
        value
            .substringAfterLast('/')
            .replace(UNSAFE_FILE_NAME, "_")
            .take(MAX_FILE_NAME_LENGTH)
            .ifBlank { "upload" }

    private fun String.bytes() = toByteArray(StandardCharsets.UTF_8)

    private fun effectivePort(uri: URI): Int =
        if (uri.port >= 0) {
            uri.port
        } else if (uri.scheme == "https") {
            DEFAULT_HTTPS_PORT
        } else {
            DEFAULT_HTTP_PORT
        }

    private fun invalid(message: String): Nothing =
        throw NativeCapabilityException(NativeBridgeProtocol.ErrorCode.INVALID_PARAMS, message)

    private fun unavailable(message: String): Nothing =
        throw NativeCapabilityException(NativeBridgeProtocol.ErrorCode.UNAVAILABLE, message)

    private companion object {
        const val BUFFER_SIZE = 16 * 1024
        const val CONNECT_TIMEOUT_MS = 15_000
        const val DEFAULT_HTTP_PORT = 80
        const val DEFAULT_HTTPS_PORT = 443
        const val READ_TIMEOUT_MS = 60_000
        const val MAX_FILE_NAME_LENGTH = 160
        const val MAX_FIELDS = 64
        const val MAX_FIELD_BYTES = 64 * 1024
        const val MAX_HEADER_VALUE_LENGTH = 8 * 1024
        const val MAX_RESPONSE_BYTES = 1_048_576
        const val MEBIBYTE_BYTES = 1_048_576L
        const val MAX_UPLOAD_BYTES = 100L * MEBIBYTE_BYTES
        const val PROGRESS_STEP_BYTES = 256L * 1024L
        val FIELD_NAME = Regex("[A-Za-z][A-Za-z0-9_.-]{0,63}")
        val HEADER_NAME = Regex("[A-Za-z0-9][A-Za-z0-9-]{0,63}")
        val MIME_TYPE = Regex("[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+")
        val UNSAFE_FILE_NAME = Regex("[^A-Za-z0-9._ -]")
        val HTTP_SUCCESS = 200..299
        val HTTP_SCHEMES = setOf("http", "https")
        val FORBIDDEN_HEADERS =
            setOf("connection", "content-length", "content-type", "cookie", "host")
    }
}
