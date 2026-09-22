package io.github.angularwave.android.core.ng.visit

import com.google.gson.JsonParseException
import com.google.gson.annotations.SerializedName
import com.google.gson.reflect.TypeToken
import io.github.angularwave.android.core.ng.util.toObject

data class VisitOptions(
    @SerializedName("action") val action: VisitAction = VisitAction.ADVANCE,
    @SerializedName("snapshotHTML") val snapshotHTML: String? = null,
    @SerializedName("response") val response: VisitResponse? = null,
) {
    companion object {
        fun fromJSON(json: String?): VisitOptions? =
            try {
                json?.toObject(object : TypeToken<VisitOptions>() {})
            } catch (ignored: JsonParseException) {
                null
            }
    }
}
