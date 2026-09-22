package io.github.angularwave.android.core.ng.session

import android.os.Build
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.util.size
import com.nhaarman.mockito_kotlin.never
import com.nhaarman.mockito_kotlin.times
import com.nhaarman.mockito_kotlin.whenever
import io.github.angularwave.android.core.ng.BaseRepositoryTest
import io.github.angularwave.android.core.ng.errors.HttpError
import io.github.angularwave.android.core.ng.errors.HttpError.ServerError
import io.github.angularwave.android.core.ng.errors.LoadError
import io.github.angularwave.android.core.ng.errors.WebError
import io.github.angularwave.android.core.ng.util.toJson
import io.github.angularwave.android.core.ng.visit.Visit
import io.github.angularwave.android.core.ng.visit.VisitAction
import io.github.angularwave.android.core.ng.visit.VisitDestination
import io.github.angularwave.android.core.ng.visit.VisitOptions
import io.github.angularwave.android.core.ng.webview.AngularNativeWebView
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.assertj.core.api.Assertions.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.MockitoAnnotations
import org.robolectric.Robolectric.buildActivity
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@ExperimentalCoroutinesApi
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Build.VERSION_CODES.R])
class SessionTest : BaseRepositoryTest() {
    @Mock private lateinit var callback: SessionCallback

    @Mock private lateinit var webView: AngularNativeWebView

    @Mock private lateinit var activity: AppCompatActivity
    private lateinit var session: Session
    private lateinit var visit: Visit

    @Before
    override fun setup() {
        super.setup()

        MockitoAnnotations.openMocks(this)

        activity = buildActivity(WebTestActivity::class.java).get()
        session = Session("test", activity, webView)
        visit =
            Visit(
                location = baseUrl(),
                destinationIdentifier = 1,
                restoreWithCachedSnapshot = false,
                reload = false,
                callback = callback,
                identifier = "",
                options = VisitOptions(),
            )

        val visitDestination =
            object : VisitDestination {
                override fun isActive() = true

                override fun activityResultLauncher(requestCode: Int) = null

                override fun activityPermissionResultLauncher(requestCode: Int) = null
            }

        whenever(callback.visitDestination()).thenReturn(visitDestination)
    }

    @Test
    fun `session is always new instance`() {
        val session = Session("test", activity, webView)
        val newSession = Session("test", activity, webView)

        assertThat(session).isNotEqualTo(newSession)
    }

    @Test
    fun `visit proposed to location fires callback`() {
        val options = VisitOptions()
        val newLocation = "${visit.location}/page"

        session.currentVisit = visit
        session.visitProposedToLocation(newLocation, options.toJson())

        verify(callback).visitProposedToLocation(newLocation, options)
    }

    @Test
    fun `visit started saves current visit identifier`() {
        val visitIdentifier = "12345"

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.visitStarted(
            visitIdentifier = visitIdentifier,
            visitHasCachedSnapshot = true,
            visitIsPageRefresh = false,
            location = visit.location,
        )

        assertThat(session.currentVisit?.identifier).isEqualTo(visitIdentifier)
    }

    @Test
    fun `visit failed to load calls adapter`() {
        val visitIdentifier = "12345"

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.webNavigationFailedToLoad()

        verify(callback).onReceivedError(LoadError.NotPresent)
    }

    @Test
    fun `visit request failed with status code calls adapter`() {
        val visitIdentifier = "12345"

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.visitRequestFailedWithStatusCode(visit.location, visitIdentifier, true, 500)

        verify(callback)
            .requestFailedWithError(
                visitHasCachedSnapshot = true,
                error = ServerError.InternalServerError,
            )
    }

    @Test
    fun `visit request failed with non http status code calls adapter for cross origin redirect`() {
        val redirectLocation = "https://example.com/"
        val visitIdentifier = "12345"

        enqueueResponse(
            fileName = "empty-body.json",
            responseCode = 301,
            headers = mapOf("Location" to redirectLocation),
        )

        enqueueResponse(
            fileName = "empty-body.json",
            responseCode = 200,
        )

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.visitRequestFailedWithNonHttpStatusCode(visit.location, visitIdentifier, true)

        verify(callback).visitProposedToCrossOriginRedirect(redirectLocation)
    }

    @Test
    fun `visit request failed with non http status code calls adapter without redirect`() {
        enqueueResponse(
            fileName = "empty-body.json",
            responseCode = 404,
        )

        val visitIdentifier = "12345"

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.visitRequestFailedWithNonHttpStatusCode(visit.location, visitIdentifier, true)

        verify(callback)
            .requestFailedWithError(
                visitHasCachedSnapshot = true,
                error = HttpError.from(WebError.Unknown.errorCode),
            )
    }

    @Test
    fun `visit request failed with non http status code calls adapter without redirect fails visit`() {
        enqueueResponse(
            fileName = "empty-body.json",
            responseCode = 200,
        )

        val visitIdentifier = "12345"

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.visitRequestFailedWithNonHttpStatusCode(visit.location, visitIdentifier, true)

        verify(callback)
            .requestFailedWithError(
                visitHasCachedSnapshot = true,
                error = HttpError.from(WebError.Unknown.errorCode),
            )
    }

    @Test
    fun `visit completed calls adapter`() {
        val visitIdentifier = "12345"
        val restorationIdentifier = "67890"

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.visitCompleted(visitIdentifier, restorationIdentifier)

        verify(callback).visitCompleted(false)
    }

    @Test
    fun `visit completed saves restoration identifier`() {
        val visitIdentifier = "12345"
        val restorationIdentifier = "67890"
        assertThat(session.restorationIdentifiers.size).isEqualTo(0)

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.visitCompleted(visitIdentifier, restorationIdentifier)

        assertThat(session.restorationIdentifiers.size).isEqualTo(1)
    }

    @Test
    fun `visit form submission started fires callback`() {
        session.currentVisit = visit
        session.formSubmissionStarted(visit.location)

        verify(callback).formSubmissionStarted(visit.location)
    }

    @Test
    fun `visit form submission finished fires callback`() {
        session.currentVisit = visit
        session.formSubmissionFinished(visit.location)

        verify(callback).formSubmissionFinished(visit.location)
    }

    @Test
    fun `page loaded saves restoration identifier`() {
        val restorationIdentifier = "67890"
        assertThat(session.restorationIdentifiers.size).isEqualTo(0)

        session.currentVisit = visit
        session.pageLoaded(restorationIdentifier)

        assertThat(session.restorationIdentifiers.size).isEqualTo(1)
    }

    @Test
    fun `pending visit is visited when ready`() {
        session.currentVisit = visit
        session.visitPending = true

        session.webNavigationIsReady(true)
        assertThat(session.visitPending).isFalse()
    }

    @Test
    fun `reset to cold boot`() {
        session.currentVisit = visit
        session.isReady = true
        session.isColdBooting = false
        session.reset()

        assertThat(session.isReady).isFalse()
        assertThat(session.isColdBooting).isFalse()
    }

    @Test
    fun `reset to cold boot clears identifiers`() {
        val visitIdentifier = "12345"
        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.coldBootVisitIdentifier = "0"
        session.reset()

        assertThat(session.coldBootVisitIdentifier).isEmpty()
        assertThat(session.currentVisit?.identifier).isEmpty()
    }

    @Test
    fun `restore current visit`() {
        val visitIdentifier = "12345"
        val restorationIdentifier = "67890"

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.webNavigationIsReady(true)
        session.pageLoaded(restorationIdentifier)
        whenever(webView.url).thenReturn(visit.location)

        assertThat(session.restoreCurrentVisit(callback)).isTrue()
        verify(callback, times(2)).visitCompleted(false)
        verify(webView, times(1)).restoreCurrentVisit()
    }

    @Test
    fun `restore current visit fails with no restoration identifier`() {
        val visitIdentifier = "12345"

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.webNavigationIsReady(true)

        assertThat(session.restoreCurrentVisit(callback)).isFalse()
        verify(callback, times(1)).visitCompleted(false)
    }

    @Test
    fun `restore visit with restoration identifier uses restore visit`() {
        val visitIdentifier = "12345"
        val restorationIdentifier = "67890"
        val restoreVisit = visit.copy(options = VisitOptions(action = VisitAction.RESTORE))

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.webNavigationIsReady(true)
        session.pageLoaded(restorationIdentifier)
        session.setWebNavigationEnabled(true)
        session.visit(restoreVisit)

        verify(webView, times(1))
            .visitLocation(
                location = restoreVisit.location,
                options = restoreVisit.options,
                restorationIdentifier = "67890",
            )
    }

    @Test
    fun `restore visit with no restoration identifier uses advance visit`() {
        val visitIdentifier = "12345"
        val restoreVisit = visit.copy(options = VisitOptions(action = VisitAction.RESTORE))

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.webNavigationIsReady(true)
        session.setWebNavigationEnabled(true)
        session.visit(restoreVisit)

        verify(webView, times(1))
            .visitLocation(
                location = restoreVisit.location,
                options = restoreVisit.options.copy(action = VisitAction.ADVANCE),
                restorationIdentifier = "",
            )
    }

    @Test
    fun `advance visit does not use restoration identifier`() {
        val visitIdentifier = "12345"
        val restorationIdentifier = "67890"
        val advanceVisit = visit.copy(options = VisitOptions(action = VisitAction.ADVANCE))

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.webNavigationIsReady(true)
        session.pageLoaded(restorationIdentifier)
        session.setWebNavigationEnabled(true)
        session.visit(advanceVisit)

        verify(webView, times(1))
            .visitLocation(
                location = advanceVisit.location,
                options = advanceVisit.options,
                restorationIdentifier = "",
            )
    }

    @Test
    fun `replace visit does not use restoration identifier`() {
        val visitIdentifier = "12345"
        val restorationIdentifier = "67890"
        val replaceVisit = visit.copy(options = VisitOptions(action = VisitAction.REPLACE))

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.webNavigationIsReady(true)
        session.pageLoaded(restorationIdentifier)
        session.setWebNavigationEnabled(true)
        session.visit(replaceVisit)

        verify(webView, times(1))
            .visitLocation(
                location = replaceVisit.location,
                options = replaceVisit.options,
                restorationIdentifier = "",
            )
    }

    @Test
    fun `restore current visit fails with session not ready`() {
        val visitIdentifier = "12345"
        val restorationIdentifier = "67890"

        session.currentVisit = visit.copy(identifier = visitIdentifier)
        session.pageLoaded(restorationIdentifier)
        session.webNavigationIsReady(false)

        assertThat(session.restoreCurrentVisit(callback)).isFalse()
        verify(callback, never()).visitCompleted(false)
        verify(callback).requestFailedWithError(false, LoadError.NotReady)
    }

    @Test
    fun `webView is not null`() {
        assertThat(session.webView).isNotNull
    }

    @Test
    fun `renderer termination invalidates the owned web view and notifies its destination`() {
        session.currentVisit = visit

        assertThat(session.handleRenderProcessGone(webView)).isTrue()

        assertThat(session.isRenderProcessGone).isTrue()
        verify(callback).onRenderProcessGone()
    }

    @Test
    fun `renderer termination from another web view does not invalidate the session`() {
        session.currentVisit = visit

        assertThat(session.handleRenderProcessGone(mock(WebView::class.java))).isTrue()

        assertThat(session.isRenderProcessGone).isFalse()
        verify(callback, never()).onRenderProcessGone()
    }
}

internal class WebTestActivity : AppCompatActivity()
