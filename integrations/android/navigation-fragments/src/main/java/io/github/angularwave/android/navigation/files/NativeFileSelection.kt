package io.github.angularwave.android.navigation.files

import android.content.Context
import android.content.Intent
import android.provider.OpenableColumns
import org.json.JSONArray
import org.json.JSONObject

internal object NativeFileSelection {
    fun intent(
        acceptedTypes: List<String>,
        multiple: Boolean,
    ): Intent {
        val types = acceptedTypes.map(String::trim).filter(String::isNotEmpty).distinct()
        return Intent(Intent.ACTION_OPEN_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(types.singleOrNull() ?: "*/*")
            .addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
            )
            .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
            .apply {
                if (types.size > 1) putExtra(Intent.EXTRA_MIME_TYPES, types.toTypedArray())
            }
    }

    fun result(
        context: Context,
        intent: Intent,
    ): JSONObject {
        val uris =
            buildList {
                    intent.data?.let(::add)
                    intent.clipData?.let { clips ->
                        for (index in 0 until clips.itemCount) add(clips.getItemAt(index).uri)
                    }
                }
                .distinct()
        val files = JSONArray()
        uris.forEach { uri ->
            val persistableRead =
                intent.flags and Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION != 0 &&
                    intent.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0
            val persisted =
                persistableRead &&
                    runCatching {
                            context.contentResolver.takePersistableUriPermission(
                                uri,
                                Intent.FLAG_GRANT_READ_URI_PERMISSION,
                            )
                        }
                        .isSuccess
            var name: String? = null
            var size: Long? = null
            runCatching {
                    context.contentResolver.query(
                        uri,
                        arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE),
                        null,
                        null,
                        null,
                    )
                }
                .getOrNull()
                ?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        name = cursor.getString(0)
                        if (!cursor.isNull(1)) size = cursor.getLong(1)
                    }
                }
            files.put(
                JSONObject()
                    .put("uri", uri.toString())
                    .put("name", name ?: JSONObject.NULL)
                    .put("size", size ?: JSONObject.NULL)
                    .put(
                        "type",
                        runCatching { context.contentResolver.getType(uri) }.getOrNull()
                            ?: JSONObject.NULL,
                    )
                    .put("persisted", persisted)
            )
        }
        return JSONObject().put("files", files)
    }
}
