package io.github.angularwave.android.core.turbo.config

import com.google.gson.annotations.SerializedName
import io.github.angularwave.android.core.BuildConfig
import io.github.angularwave.android.core.logging.logError
import java.util.regex.PatternSyntaxException

internal data class PathConfigurationRule(
    @SerializedName("patterns") val patterns: List<String>,
    @SerializedName("properties") val properties: PathConfigurationProperties
) {

    fun matches(path: String): Boolean {
        return patterns.any { numberOfMatches(path, it) > 0 }
    }

    private fun numberOfMatches(path: String, patternRegex: String): Int = try {
        Regex(patternRegex, RegexOption.IGNORE_CASE).find(path)?.groups?.size ?: 0
    } catch (e: PatternSyntaxException) {
        logError("pathConfigurationPatternError", e)
        if (BuildConfig.DEBUG) throw e else 0
    }
}
