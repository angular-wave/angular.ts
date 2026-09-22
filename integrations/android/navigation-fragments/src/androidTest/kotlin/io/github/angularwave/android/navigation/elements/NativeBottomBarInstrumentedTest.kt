package io.github.angularwave.android.navigation.elements

import android.widget.FrameLayout
import androidx.core.view.get
import androidx.core.view.size
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.android.material.bottomnavigation.BottomNavigationView
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeBottomBarInstrumentedTest {
    @Test
    fun bottomBarUsesMaterialSelectionAndControlledUpdates() {
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
                val items =
                    JSONArray()
                        .put(item("home", "Home", "android:drawable/ic_menu_view"))
                        .put(item("explore", "Explore", "android:drawable/ic_menu_search"))
                        .put(item("profile", "Profile", "android:drawable/ic_menu_myplaces"))
                val view =
                    AndroidNativeElements.registry.create(
                        NativeElementCatalog.Wire.BOTTOM_BAR,
                        context,
                        JSONObjectProperties(
                            JSONObject()
                                .put(NativeElementCatalog.Wire.LABEL, "Primary navigation")
                                .put(NativeElementCatalog.Wire.ITEMS, items)
                                .put(NativeElementCatalog.Wire.SELECTED_KEY, "home")
                        ),
                    )

                assertTrue(view is BottomNavigationView)
                val navigation = view as BottomNavigationView
                host.addView(navigation)
                assertEquals("Primary navigation", navigation.contentDescription)
                assertEquals(3, navigation.menu.size)
                assertEquals("Home", navigation.menu.findItem(navigation.selectedItemId).title)
                assertTrue(events.isEmpty())

                navigation.selectedItemId = navigation.menu[1].itemId
                assertEquals(NativeElementCatalog.Wire.SELECT, events.single().first)
                assertEquals(
                    "explore",
                    events.single().second?.getString("key"),
                )
                assertEquals(1, events.single().second?.getInt("index"))

                events.clear()
                AndroidNativeElements.registry.update(
                    navigation,
                    JSONObjectProperties(
                        JSONObject()
                            .put(NativeElementCatalog.Wire.LABEL, "Primary navigation")
                            .put(NativeElementCatalog.Wire.ITEMS, items)
                            .put(NativeElementCatalog.Wire.SELECTED_KEY, "profile")
                    ),
                )
                assertEquals("Profile", navigation.menu.findItem(navigation.selectedItemId).title)
                assertTrue("Controlled selection must not emit an event", events.isEmpty())

                navigation.selectedItemId = navigation.selectedItemId
                assertEquals(NativeElementCatalog.Wire.RESELECT, events.single().first)
                assertEquals(
                    "profile",
                    events.single().second?.getString("key"),
                )

                AndroidNativeElements.registry.dispose(navigation)
                assertThrows(NativeElementException::class.java) {
                    AndroidNativeElements.registry.update(
                        navigation,
                        JSONObjectProperties(JSONObject()),
                    )
                }
            }
        }
    }

    @Test
    fun bottomBarRejectsAmbiguousOrUnsupportedMenus() {
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val context =
                    NativeElementContext(
                        activity,
                        FrameLayout(activity),
                        activity,
                        activity,
                        events = { _, _ -> },
                    )
                listOf(
                        JSONArray().put(item("same", "One", "")).put(item("same", "Two", "")),
                        JSONArray().put(item("", "Missing key", "")),
                        JSONArray().put(item("missing-label", "", "")),
                        JSONArray().apply {
                            repeat(6) { index -> put(item("item-$index", "Item $index", "")) }
                        },
                    )
                    .forEach { items ->
                        assertThrows(NativeElementException::class.java) {
                            AndroidNativeElements.registry.create(
                                NativeElementCatalog.Wire.BOTTOM_BAR,
                                context,
                                JSONObjectProperties(
                                    JSONObject().put(NativeElementCatalog.Wire.ITEMS, items)
                                ),
                            )
                        }
                    }
            }
        }
    }

    private fun item(key: String, label: String, icon: String) =
        JSONObject()
            .put("key", key)
            .put(NativeElementCatalog.Wire.LABEL, label)
            .put(NativeElementCatalog.Wire.ICON, icon)
}
