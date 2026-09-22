package io.github.angularwave.android.benchmark

import android.content.Intent
import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Generates startup profiles from the same cold-start path measured by [StartupBenchmark]. */
@LargeTest
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
    @get:Rule val baselineProfileRule = BaselineProfileRule()

    @Test
    fun generate() {
        baselineProfileRule.collect(
            packageName = PACKAGE_NAME,
            includeInStartupProfile = true,
        ) {
            pressHome()
            startActivityAndWait(
                Intent(Intent.ACTION_MAIN).setClassName(PACKAGE_NAME, MAIN_ACTIVITY)
            )
        }
    }

    private companion object {
        const val PACKAGE_NAME = "io.github.angularwave.android.demo"
        const val MAIN_ACTIVITY = "$PACKAGE_NAME.main.MainActivity"
    }
}
