package io.github.angularwave.android.navigation.files

import android.content.ClipData
import android.content.Intent
import android.os.Build
import androidx.core.net.toUri
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Build.VERSION_CODES.R])
class NativeFileSelectionTest {
    @Test
    fun `single MIME type becomes the document intent type`() {
        val intent =
            NativeFileSelection.intent(listOf(" image/png ", "image/png", ""), multiple = false)

        assertEquals(Intent.ACTION_OPEN_DOCUMENT, intent.action)
        assertEquals("image/png", intent.type)
        assertTrue(intent.hasCategory(Intent.CATEGORY_OPENABLE))
        assertFalse(intent.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, true))
        assertNull(intent.getStringArrayExtra(Intent.EXTRA_MIME_TYPES))
    }

    @Test
    fun `results deduplicate content URIs and tolerate unavailable grants and metadata`() {
        val first = "content://missing/first".toUri()
        val second = "content://missing/second".toUri()
        val intent =
            Intent().apply {
                data = first
                clipData =
                    ClipData.newRawUri("files", first).apply { addItem(ClipData.Item(second)) }
            }

        val result = NativeFileSelection.result(ApplicationProvider.getApplicationContext(), intent)
        val files = result.getJSONArray("files")

        assertEquals(2, files.length())
        assertEquals(first.toString(), files.getJSONObject(0).getString("uri"))
        assertTrue(files.getJSONObject(0).isNull("name"))
        assertTrue(files.getJSONObject(0).isNull("size"))
        assertTrue(files.getJSONObject(0).isNull("type"))
        assertFalse(files.getJSONObject(0).getBoolean("persisted"))
    }
}
