package io.github.angularwave.android.core.ng.visit

import com.google.gson.annotations.SerializedName
import io.github.angularwave.android.core.ng.util.truncateMiddle
import io.github.angularwave.android.core.ng.util.withoutNewLineChars
import io.github.angularwave.android.core.ng.util.withoutRepeatingWhitespace

data class VisitResponse(
    @SerializedName("statusCode") val statusCode: Int,
    @SerializedName("responseHTML") val responseHTML: String? = null,
) {
    override fun toString(): String {
        val response =
            responseHTML
                ?.withoutNewLineChars()
                ?.withoutRepeatingWhitespace()
                ?.truncateMiddle(maxChars = 50)

        return "VisitResponse(" +
            "statusCode=$statusCode, " +
            "responseHTML=$response, " +
            "responseLength=${responseHTML?.length ?: 0}" +
            ")"
    }
}
