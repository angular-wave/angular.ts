package io.github.angularwave.android.navigation.bridge

import io.github.angularwave.android.core.ng.visit.VisitAction
import io.github.angularwave.android.navigation.R
import org.assertj.core.api.Assertions.assertThat
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativeNavigationDispatcherTest {
    private var snapshot = NativeNavigationSnapshot("https://example.com/current", null, false)
    private val requests = mutableListOf<NativeNavigationRequest>()
    private val changes = mutableListOf<JSONObject>()
    private var pops = 0
    private var reducedMotion = false
    private var externalUrl: String? = null
    private var routeError: RuntimeException? = null
    private var navigationObserver: (String?) -> Unit = {}
    private var observerRemoved = false
    private val dispatcher = dispatcher()

    @Test
    fun `status reports the authoritative stack snapshot`() {
        val status = dispatcher.invoke("status", JSONObject())

        assertEquals("https://example.com/current", status.getString("location"))
        assertTrue(status.isNull("previousLocation"))
        assertFalse(status.getBoolean("canPop"))
        assertFalse(status.getBoolean("modal"))
    }

    @Test
    fun `push replace and deep link preserve explicit semantics`() {
        dispatcher.invoke("push", params("next", "slide"))
        dispatcher.invoke("replace", params("replacement", "fade"))
        dispatcher.invoke("deep-link", params("/linked", "cover"))

        assertThat(requests.map(NativeNavigationRequest::location))
            .containsExactly(
                "https://example.com/next",
                "https://example.com/replacement",
                "https://example.com/linked",
            )
        assertThat(requests.map(NativeNavigationRequest::action))
            .containsExactly(VisitAction.ADVANCE, VisitAction.REPLACE, VisitAction.ADVANCE)
        assertEquals(R.animator.enter_slide_in_right, requests[0].options?.enterAnim)
        assertEquals(R.animator.fade_in, requests[1].options?.enterAnim)
        assertEquals(R.animator.enter_slide_in_bottom, requests[2].options?.enterAnim)
        assertThat(changes.map { it.getString("phase") }).containsExactly("cancelled", "cancelled")
        navigationObserver("https://example.com/linked")
        assertEquals("deep-link", changes.last().getString("method"))
        assertEquals("completed", changes.last().getString("phase"))
    }

    @Test
    fun `modal requires a route configured for modal presentation`() {
        dispatcher.invoke("modal", params("modal", "dive"))
        assertEquals("https://example.com/modal", requests.single().location)

        val error =
            assertThrows(NativeCapabilityException::class.java) {
                dispatcher.invoke("modal", params("page", "dive"))
            }
        assertEquals(NativeBridgeProtocol.ErrorCode.INVALID_PARAMS, error.code)
    }

    @Test
    fun `pop is deterministic at root and with previous history`() {
        val root = dispatcher.invoke("pop", JSONObject())
        assertFalse(root.getBoolean("routed"))
        assertEquals(0, pops)

        snapshot =
            NativeNavigationSnapshot(
                "https://example.com/current",
                "https://example.com/previous",
                false,
            )
        val result = dispatcher.invoke("pop", JSONObject())
        assertTrue(result.getBoolean("routed"))
        assertEquals("accepted", result.getString("phase"))
        assertEquals("https://example.com/previous", result.getString("url"))
        assertEquals(1, pops)
        assertThat(changes).isEmpty()
        navigationObserver("https://example.com/previous")
        assertEquals("pop", changes.single().getString("method"))
        assertEquals("completed", changes.single().getString("phase"))
    }

    @Test
    fun `reduced motion removes explicit navigation animations`() {
        reducedMotion = true
        dispatcher.invoke("push", params("next", "flip"))

        val options = requireNotNull(requests.single().options)
        assertEquals(0, options.enterAnim)
        assertEquals(0, options.exitAnim)
        assertEquals(0, options.popEnterAnim)
        assertEquals(0, options.popExitAnim)
    }

    @Test
    fun `external navigation resolves URLs without changing history`() {
        val result = dispatcher.invoke("external", params("support", "default"))

        assertEquals("https://example.com/support", externalUrl)
        assertTrue(result.getBoolean("opened"))
        assertThat(requests).isEmpty()
        assertThat(changes).isEmpty()
    }

    @Test
    fun `all routed operations require a URL`() {
        listOf("push", "replace", "modal", "deep-link", "external").forEach { method ->
            val error =
                assertThrows(NativeCapabilityException::class.java) {
                    dispatcher.invoke(method, JSONObject())
                }
            assertEquals(NativeBridgeProtocol.ErrorCode.INVALID_PARAMS, error.code)
        }
    }

    @Test
    fun `committed repeated routes complete exactly once`() {
        val result = dispatcher.invoke("push", params("current", "none"))

        assertEquals("accepted", result.getString("phase"))
        assertThat(changes).isEmpty()
        navigationObserver("https://example.com/current")
        navigationObserver("https://example.com/current")

        assertThat(changes).hasSize(1)
        assertEquals("completed", changes.single().getString("phase"))
        assertEquals(result.getLong("transaction"), changes.single().getLong("transaction"))
    }

    @Test
    fun `new commands cancel pending navigation before completing`() {
        val first = dispatcher.invoke("push", params("slow", "slide"))
        val second = dispatcher.invoke("replace", params("fast", "fade"))

        assertEquals("cancelled", changes.single().getString("phase"))
        assertEquals(first.getLong("transaction"), changes.single().getLong("transaction"))
        navigationObserver("https://example.com/fast")

        assertEquals("completed", changes.last().getString("phase"))
        assertEquals(second.getLong("transaction"), changes.last().getLong("transaction"))
    }

    @Test
    fun `failed native dispatch cancels its transaction without poisoning navigation`() {
        routeError = IllegalStateException("route rejected")

        assertThrows(IllegalStateException::class.java) {
            dispatcher.invoke("push", params("rejected", "slide"))
        }
        routeError = null
        navigationObserver("https://example.com/linked")

        assertThat(changes.map { it.getString("phase") }).containsExactly("cancelled", "completed")
        assertEquals("failed", changes[0].getString("reason"))
        assertEquals("deep-link", changes[1].getString("method"))
        assertEquals("android", changes[1].getString("source"))
    }

    @Test
    fun `Android back is observed without replaying a bridge command`() {
        snapshot =
            NativeNavigationSnapshot(
                "https://example.com/current",
                "https://example.com/previous",
                false,
            )
        dispatcher()
        navigationObserver("https://example.com/previous")
        navigationObserver("https://example.com/previous")

        assertThat(requests).isEmpty()
        assertThat(changes).hasSize(1)
        assertEquals("pop", changes.single().getString("method"))
        assertEquals("android", changes.single().getString("source"))
    }

    @Test
    fun `Android navigation supersedes a pending bridge transaction`() {
        snapshot =
            NativeNavigationSnapshot(
                "https://example.com/current",
                "https://example.com/previous",
                false,
            )
        val currentDispatcher = dispatcher()
        val pending = currentDispatcher.invoke("push", params("next", "slide"))

        navigationObserver("https://example.com/previous")
        navigationObserver("https://example.com/next")

        assertThat(changes.map { it.getString("phase") })
            .containsExactly("cancelled", "completed", "completed")
        assertEquals("destination-changed", changes[0].getString("reason"))
        assertEquals(pending.getLong("transaction"), changes[0].getLong("transaction"))
        assertEquals("pop", changes[1].getString("method"))
        assertEquals("deep-link", changes[2].getString("method"))
        assertThat(
                changes.filter {
                    it.optLong("transaction", -1) == pending.getLong("transaction")
                }
            )
            .hasSize(1)
    }

    @Test
    fun `close cancels pending navigation and removes the observer exactly once`() {
        val pending = dispatcher.invoke("push", params("next", "slide"))

        dispatcher.close()
        dispatcher.close()

        assertTrue(observerRemoved)
        assertThat(changes).hasSize(1)
        assertEquals("cancelled", changes.single().getString("phase"))
        assertEquals("closed", changes.single().getString("reason"))
        assertEquals(pending.getLong("transaction"), changes.single().getLong("transaction"))
    }

    private fun dispatcher(): NativeNavigationDispatcher =
        NativeNavigationDispatcher(
            snapshot = { snapshot },
            resolve = { value -> "https://example.com/${value.removePrefix("/")}" },
            isModalRoute = { it.endsWith("/modal") },
            route = { request ->
                routeError?.let { throw it }
                requests += request
            },
            pop = { pops++ },
            openExternal = { url ->
                externalUrl = url
                JSONObject().put("opened", true)
            },
            reduceMotion = { reducedMotion },
            changed = changes::add,
            observe = { observer ->
                navigationObserver = observer
                { observerRemoved = true }
            },
        )

    private fun params(url: String, transition: String) =
        JSONObject().put("url", url).put("transition", transition)
}
