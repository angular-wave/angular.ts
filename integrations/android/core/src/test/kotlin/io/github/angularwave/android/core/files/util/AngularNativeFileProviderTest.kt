package io.github.angularwave.android.core.files.util

import android.content.Context
import android.os.Build
import androidx.test.core.app.ApplicationProvider
import io.github.angularwave.android.core.ng.BaseUnitTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Build.VERSION_CODES.R])
class AngularNativeFileProviderTest : BaseUnitTest() {
    private lateinit var context: Context

    @Before
    override fun setup() {
        super.setup()
        context = ApplicationProvider.getApplicationContext()
    }

    @Test
    fun authority() {
        val authority = AngularNativeFileProvider.authority(context)
        assertThat(authority)
            .isEqualTo("io.github.angularwave.android.core.test.angularNative.fileprovider")
    }

    @Test
    fun directory() {
        val directory = AngularNativeFileProvider.directory(context)
        assertThat(directory.path)
            .endsWith("io.github.angularwave.android.core.test-dataDir/files/shared")
    }
}
