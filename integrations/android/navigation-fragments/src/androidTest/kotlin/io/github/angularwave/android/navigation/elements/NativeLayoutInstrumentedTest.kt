package io.github.angularwave.android.navigation.elements

import android.content.res.Configuration
import android.view.ContextThemeWrapper
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.size
import androidx.core.widget.NestedScrollView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.viewpager2.widget.ViewPager2
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.button.MaterialButton
import com.google.android.material.tabs.TabLayout
import io.github.angularwave.android.navigation.bridge.AndroidWindowSnapshot
import java.util.Locale
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeLayoutInstrumentedTest {
    @Test
    fun windowSnapshotUsesTheCurrentDeviceBounds() {
        val activityRef = AtomicReference<NativeElementTestActivity>()
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                activityRef.set(activity)
            }
            val activity = activityRef.get()
            val layoutInfo = runBlocking {
                withTimeout(5_000) {
                    WindowInfoTracker.getOrCreate(activity).windowLayoutInfo(activity).first()
                }
            }
            val status = AndroidWindowSnapshot.create(activity, layoutInfo)
            assertTrue(status.getDouble("width") > 0)
            assertTrue(status.getDouble("height") > 0)
            assertEquals(
                AndroidWindowSnapshot.widthClass(status.getDouble("width").toFloat()),
                status.getString("widthClass"),
            )
            assertEquals(
                AndroidWindowSnapshot.heightClass(status.getDouble("height").toFloat()),
                status.getString("heightClass"),
            )
            when (InstrumentationRegistry.getArguments().getString("formFactor")) {
                "phone" -> {
                    assertEquals("compact", status.getString("widthClass"))
                }

                "tablet" -> {
                    assertTrue(status.getString("widthClass") != "compact")
                }

                "foldable" -> {
                    assertTrue(layoutInfo.displayFeatures.any { it is FoldingFeature })
                }
            }
        }
    }

    @Test
    fun tabsAndPagerKeepControlledSelectionOnADevice() {
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                val events = mutableListOf<Pair<String, JSONObject?>>()
                val context =
                    NativeElementContext(
                        activity,
                        host,
                        activity,
                        activity,
                        events = { event, data -> events += event to data },
                    )
                val children =
                    JSONArray(
                        listOf(
                            child("first", "First page"),
                            child("second", "Second page"),
                        )
                    )

                val tabs =
                    AndroidNativeElements.registry.create(
                        "tabs",
                        context,
                        JSONObjectProperties(
                            JSONObject().put("children", children).put("value", "second")
                        ),
                    ) as LinearLayout
                host.addView(tabs)
                val tabLayout = tabs.getChildAt(0) as TabLayout
                val tabContent = tabs.getChildAt(1) as FrameLayout
                assertEquals(1, tabLayout.selectedTabPosition)
                assertEquals("Second page", (tabContent.getChildAt(0) as TextView).text.toString())

                tabLayout.getTabAt(0)?.select()
                assertEquals("first", events.single().second?.getString("value"))
                AndroidNativeElements.registry.dispose(tabs)
                host.removeAllViews()
                events.clear()

                val pager =
                    AndroidNativeElements.registry.create(
                        "pager",
                        context,
                        JSONObjectProperties(
                            JSONObject().put("children", children).put("value", 1)
                        ),
                    ) as ViewPager2
                host.addView(pager)
                assertEquals(1, pager.currentItem)

                pager.setCurrentItem(0, false)
                assertEquals(0, pager.currentItem)
                assertTrue(events.any { it.first == "change" && it.second?.getInt("value") == 0 })
                AndroidNativeElements.registry.dispose(pager)
            }
        }
    }

    @Test
    fun scrollUsesNestedScrollingInsetsRtlAndRestoredPosition() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            lateinit var scroll: NestedScrollView
            lateinit var state: android.os.Bundle
            var expectedPadding = 0

            scenario.onActivity { activity ->
                val configuration =
                    Configuration(activity.resources.configuration).apply {
                        val locale = Locale.forLanguageTag("ar")
                        setLocale(locale)
                        setLayoutDirection(locale)
                    }
                val themed =
                    ContextThemeWrapper(
                        activity.createConfigurationContext(configuration),
                        com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar,
                    )
                val host = FrameLayout(themed)
                activity.setContentView(host)
                val context =
                    NativeElementContext(
                        themed,
                        host,
                        activity,
                        activity,
                        events = { _, _ -> },
                    )
                val content = (1..100).joinToString(separator = "\n") { it.toString() }
                scroll =
                    AndroidNativeElements.registry.create(
                        NativeElementCatalog.Wire.SCROLL,
                        context,
                        JSONObjectProperties(
                            JSONObject()
                                .put(
                                    NativeElementCatalog.Wire.CHILDREN,
                                    JSONArray().put(child("content", content)),
                                )
                                .put(NativeElementCatalog.Wire.PADDING, 12)
                                .put(NativeElementCatalog.Wire.SAFE_AREA, true)
                        ),
                    ) as NestedScrollView
                host.addView(
                    scroll,
                    FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        240,
                    ),
                )
                expectedPadding = (12 * themed.resources.displayMetrics.density).toInt()
            }
            instrumentation.waitForIdleSync()

            scenario.onActivity {
                assertTrue(scroll.isNestedScrollingEnabled)
                assertTrue(scroll.isFillViewport)
                assertEquals(View.LAYOUT_DIRECTION_RTL, scroll.layoutDirection)
                ViewCompat.dispatchApplyWindowInsets(
                    scroll,
                    WindowInsetsCompat.Builder()
                        .setInsets(
                            WindowInsetsCompat.Type.systemBars(),
                            Insets.of(1, 2, 3, 4),
                        )
                        .build(),
                )
                assertEquals(expectedPadding + 1, scroll.paddingLeft)
                assertEquals(expectedPadding + 2, scroll.paddingTop)
                assertEquals(expectedPadding + 3, scroll.paddingRight)
                assertEquals(expectedPadding + 4, scroll.paddingBottom)
                scroll.scrollTo(0, 120)
                state = requireNotNull(AndroidNativeElements.registry.saveState(scroll))
                scroll.scrollTo(0, 0)
                AndroidNativeElements.registry.restoreState(scroll, state)
            }
            instrumentation.waitForIdleSync()

            scenario.onActivity {
                assertEquals(120, scroll.scrollY)
                AndroidNativeElements.registry.dispose(scroll)
            }
        }
    }

    @Test
    fun keyedLayoutReordersFocusAndAccessibilityTraversalWithoutRecreation() {
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                val context =
                    NativeElementContext(
                        activity,
                        host,
                        activity,
                        activity,
                        events = { _, _ -> },
                    )
                val initial =
                    JSONArray(
                        listOf(
                            child("first", "First", NativeElementCatalog.Wire.BUTTON),
                            child("second", "Second", NativeElementCatalog.Wire.BUTTON),
                            child("third", "Third", NativeElementCatalog.Wire.BUTTON),
                        )
                    )
                val column =
                    AndroidNativeElements.registry.create(
                        NativeElementCatalog.Wire.COLUMN,
                        context,
                        JSONObjectProperties(
                            JSONObject().put(NativeElementCatalog.Wire.CHILDREN, initial)
                        ),
                    ) as LinearLayout
                host.addView(column)
                val first = column.getChildAt(0) as MaterialButton
                val second = column.getChildAt(1) as MaterialButton
                val third = column.getChildAt(2) as MaterialButton

                assertEquals(second.id, first.nextFocusForwardId)
                assertEquals(first.id, second.accessibilityTraversalAfter)

                val reordered =
                    JSONArray(
                        listOf(
                            child("third", "Third", NativeElementCatalog.Wire.BUTTON),
                            child("first", "First", NativeElementCatalog.Wire.BUTTON),
                        )
                    )
                AndroidNativeElements.registry.update(
                    column,
                    JSONObjectProperties(
                        JSONObject().put(NativeElementCatalog.Wire.CHILDREN, reordered)
                    ),
                )

                assertSame(third, column.getChildAt(0))
                assertSame(first, column.getChildAt(1))
                assertEquals(first.id, third.nextFocusForwardId)
                assertEquals(third.id, first.accessibilityTraversalAfter)
                assertThrows(NativeElementException::class.java) {
                    AndroidNativeElements.registry.update(
                        second,
                        JSONObjectProperties(JSONObject()),
                    )
                }
                AndroidNativeElements.registry.dispose(column)
            }
        }
    }

    @Test
    fun layoutUsesDpConstraintsSpacingAndAlignment() {
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                val context =
                    NativeElementContext(
                        activity,
                        host,
                        activity,
                        activity,
                        events = { _, _ -> },
                    )
                val values =
                    JSONObject()
                        .put(
                            NativeElementCatalog.Wire.CHILDREN,
                            JSONArray(
                                listOf(
                                    child("first", "First", NativeElementCatalog.Wire.BUTTON),
                                    child("second", "Second", NativeElementCatalog.Wire.BUTTON),
                                )
                            ),
                        )
                        .put(NativeElementCatalog.Wire.WIDTH, 240)
                        .put(NativeElementCatalog.Wire.HEIGHT, 80)
                        .put(NativeElementCatalog.Wire.MIN_WIDTH, 120)
                        .put(NativeElementCatalog.Wire.MIN_HEIGHT, 40)
                        .put(NativeElementCatalog.Wire.SPACING, 8)
                        .put(NativeElementCatalog.Wire.HORIZONTAL_ALIGNMENT, "center")
                        .put(NativeElementCatalog.Wire.VERTICAL_ALIGNMENT, "bottom")
                val row =
                    AndroidNativeElements.registry.create(
                        NativeElementCatalog.Wire.ROW,
                        context,
                        JSONObjectProperties(values),
                    ) as LinearLayout
                host.addView(row)
                val density = activity.resources.displayMetrics.density
                assertEquals(kotlin.math.round(240 * density).toInt(), row.layoutParams.width)
                assertEquals(kotlin.math.round(80 * density).toInt(), row.layoutParams.height)
                assertEquals(kotlin.math.round(120 * density).toInt(), row.minimumWidth)
                assertEquals(kotlin.math.round(40 * density).toInt(), row.minimumHeight)
                val second = row.getChildAt(1)
                val params = second.layoutParams as LinearLayout.LayoutParams
                assertEquals(kotlin.math.round(8 * density).toInt(), params.marginStart)
                assertEquals(
                    android.view.Gravity.CENTER_HORIZONTAL or android.view.Gravity.BOTTOM,
                    params.gravity,
                )

                AndroidNativeElements.registry.update(
                    row,
                    JSONObjectProperties(
                        JSONObject()
                            .put(
                                NativeElementCatalog.Wire.CHILDREN,
                                values.getJSONArray(NativeElementCatalog.Wire.CHILDREN),
                            )
                    ),
                )
                assertEquals(ViewGroup.LayoutParams.MATCH_PARENT, row.layoutParams.width)
                assertEquals(ViewGroup.LayoutParams.WRAP_CONTENT, row.layoutParams.height)
                assertEquals(0, row.minimumWidth)
                assertEquals(0, row.minimumHeight)

                assertThrows(NativeElementException::class.java) {
                    AndroidNativeElements.registry.update(
                        row,
                        JSONObjectProperties(
                            JSONObject()
                                .put(
                                    NativeElementCatalog.Wire.CHILDREN,
                                    values.getJSONArray(NativeElementCatalog.Wire.CHILDREN),
                                )
                                .put(NativeElementCatalog.Wire.HORIZONTAL_ALIGNMENT, "middle")
                        ),
                    )
                }
                AndroidNativeElements.registry.dispose(row)
            }
        }
    }

    @Test
    fun completeNativeScreenOwnsNestedChildrenAcrossRepeatedReplacement() {
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                val events = mutableListOf<Pair<String, JSONObject?>>()
                val context =
                    NativeElementContext(
                        activity,
                        host,
                        activity,
                        activity,
                        events = { event, data -> events += event to data },
                    )

                repeat(25) { replacement ->
                    val action =
                        child(
                            "action",
                            "Action $replacement",
                            NativeElementCatalog.Wire.BUTTON,
                        )
                    val bar =
                        JSONObject()
                            .put("key", "bar")
                            .put("name", NativeElementCatalog.Wire.APP_BAR)
                            .put(
                                "props",
                                JSONObject()
                                    .put(
                                        NativeElementCatalog.Wire.CHILDREN,
                                        JSONArray().put(action),
                                    ),
                            )
                    val body =
                        JSONObject()
                            .put("key", "body")
                            .put("name", NativeElementCatalog.Wire.SCROLL)
                            .put(
                                "props",
                                JSONObject()
                                    .put(
                                        NativeElementCatalog.Wire.CHILDREN,
                                        JSONArray().put(child("copy", "Body $replacement")),
                                    ),
                            )
                    val bottom =
                        JSONObject()
                            .put("key", "bottom")
                            .put("name", NativeElementCatalog.Wire.BOTTOM_BAR)
                            .put(
                                "props",
                                JSONObject()
                                    .put(
                                        NativeElementCatalog.Wire.ITEMS,
                                        JSONArray()
                                            .put(
                                                JSONObject()
                                                    .put("key", "home")
                                                    .put(NativeElementCatalog.Wire.LABEL, "Home")
                                            ),
                                    ),
                            )
                    val screen =
                        AndroidNativeElements.registry.create(
                            NativeElementCatalog.Wire.SCAFFOLD,
                            context,
                            JSONObjectProperties(
                                JSONObject()
                                    .put(
                                        NativeElementCatalog.Wire.CHILDREN,
                                        JSONArray(listOf(bar, body, bottom)),
                                    )
                            ),
                        ) as LinearLayout
                    host.addView(screen)
                    val appBar = screen.getChildAt(0) as LinearLayout
                    val button = appBar.getChildAt(0) as MaterialButton
                    val scroll = screen.getChildAt(1) as NestedScrollView
                    val bottomBar = screen.getChildAt(2) as BottomNavigationView
                    val copy = (scroll.getChildAt(0) as LinearLayout).getChildAt(0)
                    val bodyLayout = scroll.layoutParams as LinearLayout.LayoutParams
                    assertEquals(0, bodyLayout.height)
                    assertEquals(1f, bodyLayout.weight)
                    assertEquals(
                        android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                        appBar.layoutParams.height,
                    )
                    assertEquals(
                        android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                        bottomBar.layoutParams.height,
                    )
                    assertEquals(1, bottomBar.menu.size)
                    button.performClick()
                    assertEquals(NativeElementCatalog.Wire.CHILD_EVENT, events.last().first)

                    AndroidNativeElements.registry.dispose(screen)
                    host.removeView(screen)
                    listOf(appBar, button, scroll, copy, bottomBar).forEach { disposed ->
                        assertThrows(NativeElementException::class.java) {
                            AndroidNativeElements.registry.update(
                                disposed,
                                JSONObjectProperties(JSONObject()),
                            )
                        }
                    }
                }
                assertEquals(0, host.childCount)
                assertEquals(25, events.size)
            }
        }
    }

    private fun child(
        key: String,
        text: String,
        name: String = NativeElementCatalog.Wire.TEXT,
    ) = JSONObject().put("key", key).put("name", name).put("props", JSONObject().put("text", text))
}
