package io.github.angularwave.android.core.files.delegates

import android.content.Context
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import androidx.test.core.app.ApplicationProvider
import io.github.angularwave.android.core.files.util.AngularNativeFileProvider
import io.github.angularwave.android.core.turbo.BaseRepositoryTest
import io.github.angularwave.android.core.turbo.session.Session
import io.github.angularwave.android.core.turbo.webview.AngularNativeWebView
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.MockitoAnnotations
import org.robolectric.Robolectric.buildActivity
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

@ExperimentalCoroutinesApi
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Build.VERSION_CODES.R])
class FileChooserDelegateTest : BaseRepositoryTest() {
    @Mock
    private lateinit var webView: AngularNativeWebView
    private lateinit var activity: AppCompatActivity
    private lateinit var context: Context
    private lateinit var session: Session

    @Before
    override fun setup() {
        super.setup()
        MockitoAnnotations.openMocks(this)

        activity = buildActivity(TurboTestActivity::class.java).get()
        context = ApplicationProvider.getApplicationContext()
        session = Session("test", activity, webView)
    }

    @Test
    fun fileProviderDirectoryIsCleared() {
        val dir = AngularNativeFileProvider.directory(context)

        File(dir, "testFile.txt").apply {
            writeText("text")
        }

        assertThat(dir.listFiles()?.size).isEqualTo(1)
        assertThat(dir.listFiles()?.get(0)?.name).isEqualTo("testFile.txt")

        runBlocking {
            session.fileChooserDelegate.deleteCachedFiles()
            assertThat(dir.listFiles()?.size).isEqualTo(0)
        }
    }
}

internal class TurboTestActivity : AppCompatActivity()
