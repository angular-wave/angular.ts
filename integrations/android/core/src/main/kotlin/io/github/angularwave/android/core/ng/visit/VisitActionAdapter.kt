package io.github.angularwave.android.core.ng.visit

import android.annotation.SuppressLint
import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonWriter

@SuppressLint("DefaultLocale")
internal class VisitActionAdapter : TypeAdapter<VisitAction>() {
    override fun read(reader: JsonReader): VisitAction =
        try {
            VisitAction.valueOf(reader.nextString().uppercase())
        } catch (ignored: IllegalArgumentException) {
            VisitAction.ADVANCE
        }

    override fun write(
        writer: JsonWriter,
        action: VisitAction,
    ) {
        writer.value(action.name.lowercase())
    }
}
