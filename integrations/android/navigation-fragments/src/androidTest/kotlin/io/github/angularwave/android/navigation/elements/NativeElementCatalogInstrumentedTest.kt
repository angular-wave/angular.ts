package io.github.angularwave.android.navigation.elements

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.ContextThemeWrapper
import android.view.View
import android.view.ViewGroup
import android.view.accessibility.AccessibilityNodeInfo
import android.view.autofill.AutofillValue
import android.view.inputmethod.EditorInfo
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleRegistry
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.test.annotation.UiThreadTest
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import java.io.File
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeElementCatalogInstrumentedTest {
    @get:Rule val activityRule = ActivityScenarioRule(NativeElementTestActivity::class.java)

    @Test
    fun catalogLoadsOnDeviceWithoutDuplicateNames() {
        val definitions = AndroidNativeElements.registry.definitions

        assertTrue(definitions.isNotEmpty())
        assertEquals(definitions.size, definitions.map { it.name }.toSet().size)
        assertTrue(definitions.all { it.minSdk <= android.os.Build.VERSION.SDK_INT })
    }

    @Test
    fun coreDisplayAndActionElementsRenderAccessiblyAcrossConfigurations() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val base = ApplicationProvider.getApplicationContext<Context>()
        val variants =
            listOf(
                DisplayVariant("light", configuration(base, night = false)),
                DisplayVariant("dark", configuration(base, night = true)),
                DisplayVariant(
                    "large-font",
                    configuration(base, night = false).apply { fontScale = 1.5f },
                ),
                DisplayVariant(
                    "rtl",
                    configuration(base, night = false).apply {
                        setLocale(Locale.forLanguageTag("ar"))
                        setLayoutDirection(Locale.forLanguageTag("ar"))
                    },
                    rtl = true,
                ),
                DisplayVariant("disabled", configuration(base, night = false), enabled = false),
            )
        val names =
            setOf(
                "text",
                "button",
                "icon",
                "image",
                "divider",
                "badge",
                "chip",
                "card",
                "progress",
                "loading-indicator",
                "floating-action-button",
            )
        val screenshotDirectory =
            screenshotDirectory().apply {
                deleteRecursively()
                check(mkdirs()) { "Unable to create screenshot directory: $this" }
            }

        variants.forEach { variant ->
            lateinit var rendered: RenderedVariant
            activityRule.scenario.onActivity { activity ->
                val themed =
                    ContextThemeWrapper(
                        base.createConfigurationContext(variant.configuration),
                        com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar,
                    )
                val gallery =
                    LinearLayout(themed).apply {
                        orientation = LinearLayout.VERTICAL
                        layoutDirection = variant.configuration.layoutDirection
                        setBackgroundColor(
                            if (variant.name == "dark") Color.rgb(18, 18, 18) else Color.WHITE
                        )
                    }
                ViewCompat.setOnApplyWindowInsetsListener(gallery) { view, insets ->
                    val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
                    view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                    insets
                }
                activity.setContentView(gallery)
                ViewCompat.requestApplyInsets(gallery)
                val context =
                    NativeElementContext(
                        themed,
                        gallery,
                        activity,
                        activity,
                        events = { _, _ -> },
                    )
                val mounted =
                    AndroidNativeElements.registry.definitions
                        .filter { it.name in names }
                        .map { definition ->
                            val properties = displayProperties(definition, variant)
                            val view =
                                AndroidNativeElements.registry.create(
                                    definition.name,
                                    context,
                                    JSONObjectProperties(properties),
                                )
                            gallery.addView(view)
                            definition to view
                        }
                rendered = RenderedVariant(gallery, themed, mounted)
            }

            instrumentation.waitForIdleSync()
            val screenshot = requireNotNull(instrumentation.uiAutomation.takeScreenshot())
            assertScreenshotHasContent(variant.name, screenshot)
            val output =
                File(
                    screenshotDirectory,
                    "display-${variant.name}-api${android.os.Build.VERSION.SDK_INT}.png",
                )
            output.outputStream().use { stream ->
                assertTrue(
                    "Unable to encode $output",
                    screenshot.compress(Bitmap.CompressFormat.PNG, 100, stream),
                )
            }
            assertTrue("Missing screenshot $output", output.isFile && output.length() > 0)

            activityRule.scenario.onActivity {
                rendered.mounted.forEach { (definition, view) ->
                    assertAccessibility(definition, view, variant.enabled, rendered.context)
                    val properties = displayProperties(definition, variant)
                    AndroidNativeElements.registry.update(view, JSONObjectProperties(properties))
                    rendered.gallery.removeView(view)
                    AndroidNativeElements.registry.dispose(view)
                }
            }
        }

        assertEquals(
            variants.size,
            screenshotDirectory.listFiles { file -> file.extension == "png" }?.size,
        )
    }

    @Test
    @UiThreadTest
    fun everyBuiltInElementSupportsDeviceLifecycleRoundTrip() {
        val base = ApplicationProvider.getApplicationContext<Context>()
        val themed =
            ContextThemeWrapper(
                base,
                com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar,
            )
        val owner = TestOwner()
        val container = FrameLayout(themed)
        val context =
            NativeElementContext(
                themed,
                container,
                owner,
                owner,
                events = { _, _ -> },
            )

        AndroidNativeElements.registry.definitions.forEach { definition ->
            val values = requiredProperties(definition)
            definition.accessibility?.let {
                values.put(it.labelProperty, "Test ${definition.name}")
            }
            val properties = JSONObjectProperties(values)
            val view = AndroidNativeElements.registry.create(definition.name, context, properties)

            container.addView(view)
            AndroidNativeElements.registry.update(view, properties)
            AndroidNativeElements.registry.saveState(view)?.let { state ->
                AndroidNativeElements.registry.restoreState(view, state)
            }
            assertTrue("${definition.name} must attach", view.parent === container)

            container.removeView(view)
            AndroidNativeElements.registry.dispose(view)
        }
        assertEquals(0, container.childCount)
    }

    @Test
    @UiThreadTest
    fun everyInputPublishesValidationAccessibilityState() {
        val base = ApplicationProvider.getApplicationContext<Context>()
        val themed =
            ContextThemeWrapper(
                base,
                com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar,
            )
        val owner = TestOwner()
        val context =
            NativeElementContext(
                themed,
                FrameLayout(themed),
                owner,
                owner,
                events = { _, _ -> },
            )
        val inputs =
            AndroidNativeElements.registry.definitions.filter {
                it.category == NativeElementCategory.INPUT
            }

        assertEquals(10, inputs.size)
        inputs.forEach { definition ->
            val values =
                requiredProperties(definition).apply {
                    put(requireNotNull(definition.accessibility).labelProperty, "Account value")
                    put(NativeElementCatalog.Wire.REQUIRED, true)
                    put(NativeElementCatalog.Wire.ERROR, "Required value missing")
                    put(NativeElementCatalog.Wire.PENDING, true)
                }
            val view =
                AndroidNativeElements.registry.create(
                    definition.name,
                    context,
                    JSONObjectProperties(values),
                )
            val accessibilityView = (view as? TextInputLayout)?.editText ?: view
            val state = ViewCompat.getStateDescription(accessibilityView).toString()

            assertTrue("${definition.name} required state", state.contains("Required"))
            assertTrue("${definition.name} error state", state.contains("Required value missing"))
            assertTrue("${definition.name} pending state", state.contains("Validation pending"))

            values
                .put(NativeElementCatalog.Wire.REQUIRED, false)
                .put(NativeElementCatalog.Wire.ERROR, "")
                .put(NativeElementCatalog.Wire.PENDING, false)
            AndroidNativeElements.registry.update(view, JSONObjectProperties(values))
            val clearedState = ViewCompat.getStateDescription(accessibilityView).toString()
            assertFalse(clearedState.contains("Required"))
            assertFalse(clearedState.contains("Validation pending"))
            AndroidNativeElements.registry.dispose(view)
        }
    }

    @Test
    @UiThreadTest
    @android.annotation.SuppressLint("SetTextI18n")
    fun textFieldPublishesNativeChangesAndRestoresWithoutDuplicateEvents() {
        val base = ApplicationProvider.getApplicationContext<Context>()
        val themed =
            ContextThemeWrapper(
                base,
                com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar,
            )
        val owner = TestOwner()
        val changes = mutableListOf<String>()
        val context =
            NativeElementContext(
                themed,
                FrameLayout(themed),
                owner,
                owner,
                events = { event, data ->
                    if (event == NativeElementCatalog.Wire.CHANGE) {
                        changes += requireNotNull(data).getString(NativeElementCatalog.Wire.VALUE)
                    }
                },
            )
        val initial =
            JSONObjectProperties(
                JSONObject()
                    .put(NativeElementCatalog.Wire.LABEL, "Email")
                    .put(NativeElementCatalog.Wire.VALUE, "first@example.com")
            )
        val layout =
            AndroidNativeElements.registry.create(
                NativeElementCatalog.Wire.TEXT_FIELD,
                context,
                initial,
            ) as TextInputLayout
        val input = layout.editText as TextInputEditText
        changes.clear()

        input.setText("native@example.com")
        assertEquals(listOf("native@example.com"), changes)
        val state = requireNotNull(AndroidNativeElements.registry.saveState(layout))

        AndroidNativeElements.registry.update(
            layout,
            JSONObjectProperties(
                JSONObject().put(NativeElementCatalog.Wire.VALUE, "server@example.com")
            ),
        )
        AndroidNativeElements.registry.restoreState(layout, state)

        assertEquals("native@example.com", input.text.toString())
        assertEquals(listOf("native@example.com"), changes)
        AndroidNativeElements.registry.dispose(layout)
    }

    @Test
    fun textFieldDefersModelUpdatesUntilImeCompositionCommits() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val changes = mutableListOf<String>()
        lateinit var layout: TextInputLayout

        activityRule.scenario.onActivity { activity ->
            val context =
                NativeElementContext(
                    activity,
                    FrameLayout(activity),
                    activity,
                    activity,
                    events = { event, data ->
                        if (event == NativeElementCatalog.Wire.CHANGE) {
                            changes +=
                                requireNotNull(data).getString(NativeElementCatalog.Wire.VALUE)
                        }
                    },
                )
            layout =
                AndroidNativeElements.registry.create(
                    NativeElementCatalog.Wire.TEXT_FIELD,
                    context,
                    JSONObjectProperties(JSONObject().put(NativeElementCatalog.Wire.VALUE, "")),
                ) as TextInputLayout
            activity.setContentView(layout)
            val input = layout.editText as TextInputEditText
            val inputConnection = requireNotNull(input.onCreateInputConnection(EditorInfo()))

            assertTrue(inputConnection.setComposingText("draft", 1))
            assertTrue("Composing text must not update the model", changes.isEmpty())
            assertTrue(inputConnection.commitText("final", 1))
        }

        instrumentation.waitForIdleSync()
        assertEquals(listOf("final"), changes)
        activityRule.scenario.onActivity { AndroidNativeElements.registry.dispose(layout) }
    }

    @Test
    fun textFieldUsesAutofillAndMovesFocusForNextImeAction() {
        val changes = mutableListOf<String>()
        val submissions = mutableListOf<String>()

        activityRule.scenario.onActivity { activity ->
            val container = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
            val context =
                NativeElementContext(
                    activity,
                    container,
                    activity,
                    activity,
                    events = { event, data ->
                        val value = data?.optString(NativeElementCatalog.Wire.VALUE).orEmpty()
                        when (event) {
                            NativeElementCatalog.Wire.CHANGE -> changes += value
                            NativeElementCatalog.Wire.SUBMIT -> submissions += value
                        }
                    },
                )
            val first =
                AndroidNativeElements.registry.create(
                    NativeElementCatalog.Wire.TEXT_FIELD,
                    context,
                    JSONObjectProperties(
                        JSONObject()
                            .put(NativeElementCatalog.Wire.IME_ACTION, "next")
                            .put(
                                NativeElementCatalog.Wire.AUTOFILL_HINTS,
                                JSONArray().put("emailAddress"),
                            )
                    ),
                ) as TextInputLayout
            val second =
                AndroidNativeElements.registry.create(
                    NativeElementCatalog.Wire.TEXT_FIELD,
                    context,
                    JSONObjectProperties(JSONObject()),
                ) as TextInputLayout
            val firstInput = requireNotNull(first.editText) as TextInputEditText
            val secondInput = requireNotNull(second.editText) as TextInputEditText
            firstInput.id = View.generateViewId()
            secondInput.id = View.generateViewId()
            firstInput.nextFocusForwardId = secondInput.id
            container.addView(first)
            container.addView(second)
            activity.setContentView(container)

            firstInput.requestFocus()
            firstInput.autofill(AutofillValue.forText("filled@example.com"))
            assertEquals("filled@example.com", changes.last())
            firstInput.onEditorAction(EditorInfo.IME_ACTION_NEXT)
            assertEquals(listOf("filled@example.com"), submissions)
            assertTrue(secondInput.hasFocus())

            AndroidNativeElements.registry.dispose(first)
            AndroidNativeElements.registry.dispose(second)
        }
    }

    @Test
    fun textFieldStateSurvivesActivityRecreationWithoutDuplicateEvents() {
        var state: Bundle? = null
        val changes = mutableListOf<String>()

        activityRule.scenario.onActivity { activity ->
            val context =
                NativeElementContext(
                    activity,
                    FrameLayout(activity),
                    activity,
                    activity,
                    events = { event, data ->
                        if (event == NativeElementCatalog.Wire.CHANGE) {
                            changes +=
                                requireNotNull(data).getString(NativeElementCatalog.Wire.VALUE)
                        }
                    },
                )
            val layout =
                AndroidNativeElements.registry.create(
                    NativeElementCatalog.Wire.TEXT_FIELD,
                    context,
                    JSONObjectProperties(JSONObject()),
                ) as TextInputLayout
            val input = requireNotNull(layout.editText) as TextInputEditText
            val draft = activity.packageName
            input.setText(draft)
            state = requireNotNull(AndroidNativeElements.registry.saveState(layout))
            AndroidNativeElements.registry.dispose(layout)
        }

        changes.clear()
        activityRule.scenario.recreate()
        activityRule.scenario.onActivity { activity ->
            val context =
                NativeElementContext(
                    activity,
                    FrameLayout(activity),
                    activity,
                    activity,
                    events = { event, data ->
                        if (event == NativeElementCatalog.Wire.CHANGE) {
                            changes +=
                                requireNotNull(data).getString(NativeElementCatalog.Wire.VALUE)
                        }
                    },
                )
            val layout =
                AndroidNativeElements.registry.create(
                    NativeElementCatalog.Wire.TEXT_FIELD,
                    context,
                    JSONObjectProperties(
                        JSONObject().put(NativeElementCatalog.Wire.VALUE, "server value")
                    ),
                ) as TextInputLayout
            AndroidNativeElements.registry.restoreState(layout, requireNotNull(state))

            assertEquals(activity.packageName, requireNotNull(layout.editText).text.toString())
            assertTrue(changes.isEmpty())
            AndroidNativeElements.registry.dispose(layout)
        }
    }

    @Test
    fun filePickerHandlesMimeTypesCancellationMultipleValuesAndLostPermissions() {
        var resultCallback: ((Int, Intent?) -> Unit)? = null
        var launched: Intent? = null
        val events = mutableListOf<Pair<String, JSONObject?>>()
        val launcher =
            object : NativeElementActivityLauncher {
                override fun launch(
                    intent: Intent,
                    result: (Int, Intent?) -> Unit,
                ): Boolean {
                    launched = intent
                    resultCallback = result
                    return true
                }

                override fun cancel() = Unit
            }

        activityRule.scenario.onActivity { activity ->
            val context =
                NativeElementContext(
                    activity,
                    FrameLayout(activity),
                    activity,
                    activity,
                    events = { event, data -> events += event to data },
                    activityLauncher = launcher,
                )
            val properties =
                JSONObject()
                    .put(
                        NativeElementCatalog.Wire.ACCEPT,
                        JSONArray(listOf("image/png", "image/jpeg", "image/png")),
                    )
                    .put(NativeElementCatalog.Wire.MULTIPLE, true)
            val button =
                AndroidNativeElements.registry.create(
                    NativeElementCatalog.Wire.FILE_PICKER,
                    context,
                    JSONObjectProperties(properties),
                ) as MaterialButton

            button.performClick()
            assertEquals("*/*", requireNotNull(launched).type)
            assertEquals(
                listOf("image/png", "image/jpeg"),
                requireNotNull(launched).getStringArrayExtra(Intent.EXTRA_MIME_TYPES)?.toList(),
            )
            resultCallback?.invoke(Activity.RESULT_CANCELED, null)
            assertEquals(NativeElementCatalog.Wire.CANCEL, events.last().first)

            val first = "content://unavailable/first".toUri()
            val second = "content://unavailable/second".toUri()
            button.performClick()
            resultCallback?.invoke(
                Activity.RESULT_OK,
                Intent().apply {
                    data = first
                    clipData =
                        ClipData.newRawUri("files", first).apply {
                            addItem(ClipData.Item(second))
                        }
                },
            )
            val multiple = requireNotNull(events.last().second)
            assertEquals(2, multiple.getJSONArray(NativeElementCatalog.Wire.VALUE).length())
            assertFalse(multiple.getJSONArray("files").getJSONObject(0).getBoolean("persisted"))
            assertTrue(multiple.getJSONArray("files").getJSONObject(0).isNull("type"))

            properties.put(NativeElementCatalog.Wire.MULTIPLE, false)
            AndroidNativeElements.registry.update(button, JSONObjectProperties(properties))
            button.performClick()
            resultCallback?.invoke(Activity.RESULT_OK, Intent().setData(first))
            assertEquals(
                first.toString(),
                requireNotNull(events.last().second)
                    .getJSONObject(NativeElementCatalog.Wire.VALUE)
                    .getString("uri"),
            )
            AndroidNativeElements.registry.dispose(button)
        }
    }

    private fun requiredProperties(definition: NativeElementDefinition) =
        JSONObject().apply {
            definition.properties.filter(NativePropertyDefinition::required).forEach { property ->
                put(
                    property.name,
                    property.defaultValue
                        ?: when (property.type) {
                            NativePropertyType.BOOLEAN -> false
                            NativePropertyType.COLOR -> "#000000"
                            NativePropertyType.FLOAT -> 0.0
                            NativePropertyType.INTEGER -> 0
                            NativePropertyType.JSON ->
                                if (
                                    definition.name == "range-slider" &&
                                        property.name == NativeElementCatalog.Wire.VALUE
                                ) {
                                    JSONArray().put(0).put(100)
                                } else {
                                    JSONArray()
                                }
                            NativePropertyType.STRING_LIST -> JSONArray()
                            NativePropertyType.STRING -> ""
                        },
                )
            }
        }

    private fun displayProperties(definition: NativeElementDefinition, variant: DisplayVariant) =
        requiredProperties(definition).apply {
            val label =
                if (variant.rtl) {
                    "\u0639\u0646\u0635\u0631 ${definition.name}"
                } else {
                    "Accessible ${definition.name}"
                }
            definition.accessibility?.let { accessibility ->
                put(accessibility.labelProperty, label)
            }
            if (definition.properties.any { it.name == NativeElementCatalog.Wire.ENABLED }) {
                put(NativeElementCatalog.Wire.ENABLED, variant.enabled)
            }
            when (definition.name) {
                NativeElementCatalog.Wire.TEXT ->
                    put(NativeElementCatalog.Wire.TEXT, if (variant.rtl) label else "Readable text")
                NativeElementCatalog.Wire.BUTTON ->
                    put(NativeElementCatalog.Wire.TEXT, if (variant.rtl) label else "Continue")
                NativeElementCatalog.Wire.BADGE -> put(NativeElementCatalog.Wire.TEXT, "7")
                NativeElementCatalog.Wire.CHIP ->
                    put(
                        NativeElementCatalog.Wire.TEXT,
                        if (variant.rtl) "\u0645\u0631\u0634\u062d \u0645\u062d\u062f\u062f"
                        else "Selected filter",
                    )
                NativeElementCatalog.Wire.CARD -> {
                    put(NativeElementCatalog.Wire.TITLE, if (variant.rtl) label else "Account")
                    put(
                        NativeElementCatalog.Wire.TEXT,
                        if (variant.rtl)
                            "\u0627\u0641\u062a\u062d \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u0633\u0627\u0628"
                        else "Open account details",
                    )
                }
                NativeElementCatalog.Wire.PROGRESS -> put(NativeElementCatalog.Wire.VALUE, 42)
            }
        }

    private fun assertAccessibility(
        definition: NativeElementDefinition,
        view: View,
        enabled: Boolean,
        context: Context,
    ) {
        val accessibility = requireNotNull(definition.accessibility)
        val node = view.createAccessibilityNodeInfo()
        assertTrue("${definition.name} must expose its label", hasAccessibleText(view))

        if (definition.properties.any { it.name == NativeElementCatalog.Wire.ENABLED }) {
            assertEquals("${definition.name} enabled state", enabled, node.isEnabled)
        }
        when (accessibility.role) {
            "button" -> {
                assertTrue("${definition.name} must be clickable", view.isClickable)
                if (enabled) {
                    assertTrue(
                        "${definition.name} must expose an accessibility click action",
                        node.actionList.any { it.id == AccessibilityNodeInfo.ACTION_CLICK },
                    )
                } else {
                    assertFalse(
                        "${definition.name} must not expose a click action while disabled",
                        node.actionList.any { it.id == AccessibilityNodeInfo.ACTION_CLICK },
                    )
                }
                val minimum = (48 * context.resources.displayMetrics.density).toInt()
                assertTrue("${definition.name} touch target width", view.measuredWidth >= minimum)
                assertTrue("${definition.name} touch target height", view.measuredHeight >= minimum)
            }
            "image" ->
                assertTrue(
                    "${definition.name} image description",
                    !node.contentDescription.isNullOrBlank(),
                )
            "progressbar" ->
                assertTrue(
                    "${definition.name} progress semantics",
                    node.className.toString().contains("Progress", ignoreCase = true),
                )
            "separator" -> assertFalse("divider must not be clickable", node.isClickable)
            "text" -> assertFalse("${definition.name} text must not be clickable", node.isClickable)
        }
    }

    private fun hasAccessibleText(view: View): Boolean {
        val node = view.createAccessibilityNodeInfo()
        val ownText = !node.text.isNullOrBlank() || !node.contentDescription.isNullOrBlank()
        if (ownText) return true
        if (view !is ViewGroup) return false
        return (0 until view.childCount).any { hasAccessibleText(view.getChildAt(it)) }
    }

    private fun assertScreenshotHasContent(name: String, bitmap: Bitmap) {
        assertTrue("$name screenshot width", bitmap.width > 0)
        assertTrue("$name screenshot height", bitmap.height > 0)
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        assertTrue("$name screenshot must contain rendered pixels", pixels.toSet().size > 2)
    }

    private fun screenshotDirectory(): File {
        val context = InstrumentationRegistry.getInstrumentation().context
        return checkNotNull(context.getExternalFilesDir("screenshots"))
    }

    private fun configuration(context: Context, night: Boolean) =
        Configuration(context.resources.configuration).apply {
            uiMode =
                (uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or
                    if (night) {
                        Configuration.UI_MODE_NIGHT_YES
                    } else {
                        Configuration.UI_MODE_NIGHT_NO
                    }
        }

    private data class DisplayVariant(
        val name: String,
        val configuration: Configuration,
        val enabled: Boolean = true,
        val rtl: Boolean = false,
    )

    private data class RenderedVariant(
        val gallery: LinearLayout,
        val context: Context,
        val mounted: List<Pair<NativeElementDefinition, View>>,
    )

    private class TestOwner : SavedStateRegistryOwner {
        private val lifecycleRegistry = LifecycleRegistry(this)
        private val savedStateController = SavedStateRegistryController.create(this)

        init {
            savedStateController.performAttach()
            savedStateController.performRestore(null)
            lifecycleRegistry.currentState = Lifecycle.State.RESUMED
        }

        override val lifecycle: Lifecycle
            get() = lifecycleRegistry

        override val savedStateRegistry: SavedStateRegistry
            get() = savedStateController.savedStateRegistry
    }
}
