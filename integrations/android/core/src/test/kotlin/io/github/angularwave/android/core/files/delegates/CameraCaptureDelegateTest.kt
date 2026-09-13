package io.github.angularwave.android.core.files.delegates

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.webkit.WebChromeClient.FileChooserParams
import androidx.core.content.IntentCompat
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
class CameraCaptureDelegateTest : BaseUnitTest() {
    private lateinit var context: Context
    private lateinit var delegate: CameraCaptureDelegate

    @Before
    override fun setup() {
        super.setup()
        context = ApplicationProvider.getApplicationContext()
        delegate = CameraCaptureDelegate(context)
    }

    @Test
    fun buildIntentAcceptTypesValid() {
        val params =
            listOf(
                params(arrayOf("*/*"), captureEnabled = true),
                params(arrayOf("image/*"), captureEnabled = true),
                params(arrayOf("image/*"), captureEnabled = false),
                params(arrayOf("image/jpg"), captureEnabled = true),
                params(arrayOf("image/jpg"), captureEnabled = false),
                params(arrayOf("image/jpeg"), captureEnabled = true),
                params(arrayOf("image/jpeg"), captureEnabled = false),
            )

        params.forEach {
            val intent = delegate.buildIntent(it)
            val uri =
                intent
                    ?.let {
                        IntentCompat.getParcelableExtra(
                            it,
                            MediaStore.EXTRA_OUTPUT,
                            Uri::class.java,
                        )
                    }
                    .toString()

            assertThat(intent).isNotNull()
            assertThat(intent?.action).isEqualTo(MediaStore.ACTION_IMAGE_CAPTURE)
            assertThat(uri)
                .startsWith(
                    "content://io.github.angularwave.android.core.test.angularNative.fileprovider/shared"
                )
            assertThat(uri).contains("/Capture_")
            assertThat(uri).endsWith(".jpg")
        }
    }

    @Test
    fun buildIntentAcceptTypesInvalid() {
        val params =
            listOf(
                params(arrayOf("*/*"), captureEnabled = false),
                params(arrayOf("image/png"), captureEnabled = true),
                params(arrayOf("image/png"), captureEnabled = false),
                params(arrayOf("image/webp"), captureEnabled = true),
                params(arrayOf("image/webp"), captureEnabled = false),
                params(arrayOf("video/*"), captureEnabled = true),
                params(arrayOf("video/*"), captureEnabled = false),
            )

        params.forEach {
            val intent = delegate.buildIntent(it)
            assertThat(intent).isNull()
        }
    }

    @Test
    fun buildIntentCaptureDisabled() {
        val intent = delegate.buildIntent(params(captureEnabled = false))
        assertThat(intent).isNull()
    }

    private fun params(
        acceptTypes: Array<String> = arrayOf("*/*"),
        captureEnabled: Boolean = true,
    ): FileChooserParams =
        object : FileChooserParams() {
            override fun getMode() = MODE_OPEN

            override fun getAcceptTypes() = acceptTypes

            override fun isCaptureEnabled() = captureEnabled

            override fun getTitle() = "title"

            override fun getFilenameHint() = "hint"

            override fun createIntent() = Intent()
        }
}
