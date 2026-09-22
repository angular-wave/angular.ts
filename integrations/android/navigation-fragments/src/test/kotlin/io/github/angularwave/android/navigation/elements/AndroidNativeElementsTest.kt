package io.github.angularwave.android.navigation.elements

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.text.InputType
import android.view.Gravity
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.CheckBox
import android.widget.DatePicker
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.TimePicker
import androidx.core.graphics.createBitmap
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.chip.Chip
import com.google.android.material.divider.MaterialDivider
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.imageview.ShapeableImageView
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.progressindicator.LinearProgressIndicator
import com.google.android.material.slider.RangeSlider
import com.google.android.material.slider.Slider
import com.google.android.material.switchmaterial.SwitchMaterial
import com.google.android.material.tabs.TabLayout
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.google.android.material.textview.MaterialTextView
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [Build.VERSION_CODES.R])
class AndroidNativeElementsTest {
    @Test
    fun `computed CSS presentation styles native text`() {
        val (activity, context) = nativeContext()
        val density = activity.resources.displayMetrics.density
        val expectedTextSize =
            android.util.TypedValue.applyDimension(
                android.util.TypedValue.COMPLEX_UNIT_SP,
                24f,
                activity.resources.displayMetrics,
            )
        val style =
            JSONObject()
                .put("color", "#20201d")
                .put("backgroundColor", "#faf5eb")
                .put("borderColor", "#50463c")
                .put("borderWidth", 2)
                .put("borderRadius", 12)
                .put("paddingTop", 8)
                .put("paddingRight", 8)
                .put("paddingBottom", 8)
                .put("paddingLeft", 8)
                .put("fontFamily", "Georgia, serif")
                .put("fontStyle", "italic")
                .put("fontWeight", "700")
                .put("fontSize", 24)
                .put("lineHeight", 30)
                .put("letterSpacing", 1)
                .put("textAlign", "center")
                .put("opacity", 0.75)
                .put("elevation", 3)
        val text =
            AndroidNativeElements.registry.create(
                "text",
                context,
                JSONObjectProperties(
                    JSONObject().put("text", "Pulse").put(NATIVE_STYLE_PROPERTY, style)
                ),
            ) as MaterialTextView

        assertEquals(Color.rgb(32, 32, 29), text.currentTextColor)
        assertEquals(expectedTextSize, text.textSize)
        assertNotNull(text.typeface)
        assertEquals(Gravity.CENTER_HORIZONTAL, text.gravity and Gravity.HORIZONTAL_GRAVITY_MASK)
        assertEquals((8 * density).toInt(), text.paddingLeft)
        assertEquals(0.75f, text.alpha)
        assertEquals(3f * density, text.elevation)
        assertTrue(text.background is GradientDrawable)
        assertEquals(
            Typeface.SANS_SERIF,
            nativeStyleBaseTypeface("sans-serif", Typeface.SERIF),
        )
        assertEquals(
            Typeface.SERIF,
            nativeStyleBaseTypeface("serif", Typeface.SANS_SERIF),
        )
        assertEquals(
            Typeface.SERIF,
            nativeStyleBaseTypeface("Georgia, 'Times New Roman', serif", Typeface.SANS_SERIF),
        )
        assertEquals(
            Typeface.SANS_SERIF,
            nativeStyleBaseTypeface("\"Avenir Next\", Avenir, sans-serif", Typeface.SERIF),
        )

        AndroidNativeElements.registry.dispose(text)
        activity.finish()
    }

    @Test
    fun `computed CSS presentation styles image shape and navigation colors`() {
        val (activity, context) = nativeContext()
        val density = activity.resources.displayMetrics.density
        val image =
            AndroidNativeElements.registry.create(
                "image",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("src", "")
                        .put(
                            NATIVE_STYLE_PROPERTY,
                            JSONObject().put("borderRadius", 24).put("objectFit", "contain"),
                        )
                ),
            ) as ShapeableImageView
        val chip =
            AndroidNativeElements.registry.create(
                "chip",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("text", "Following")
                        .put(
                            NATIVE_STYLE_PROPERTY,
                            JSONObject()
                                .put("backgroundColor", "#f3ded7")
                                .put("borderRadius", 9999),
                        )
                ),
            ) as Chip
        val navigation = BottomNavigationView(activity)
        applyNativePresentation(
            navigation,
            NativeProperties(
                JSONObject()
                    .put(
                        NATIVE_STYLE_PROPERTY,
                        JSONObject().put("color", "#6f6b63").put("accentColor", "#b83a24"),
                    )
            ),
            "bottom-bar",
        )

        assertEquals(android.widget.ImageView.ScaleType.FIT_CENTER, image.scaleType)
        assertEquals(0f, chip.chipStrokeWidth)
        assertEquals(
            24f * density,
            image.shapeAppearanceModel.topLeftCornerSize.getCornerSize(
                android.graphics.RectF(0f, 0f, 100f, 100f)
            ),
        )
        assertEquals(
            Color.rgb(184, 58, 36),
            navigation.itemTextColor?.getColorForState(
                intArrayOf(android.R.attr.state_checked),
                Color.TRANSPARENT,
            ),
        )
        assertEquals(
            Color.rgb(111, 107, 99),
            navigation.itemTextColor?.defaultColor,
        )
        assertEquals(
            Color.argb(31, 184, 58, 36),
            navigation.itemActiveIndicatorColor?.defaultColor,
        )

        AndroidNativeElements.registry.dispose(image)
        AndroidNativeElements.registry.dispose(chip)
        activity.finish()
    }

    @Test
    fun `nested row children remain visible inside a CSS sized container`() {
        val (activity, context) = nativeContext()
        val density = activity.resources.displayMetrics.density
        assertEquals(
            false,
            AndroidNativeElements.registry
                .definition("row")
                ?.properties
                ?.single { it.name == NativeElementCatalog.Wire.SAFE_AREA }
                ?.defaultValue,
        )
        assertEquals(
            true,
            AndroidNativeElements.registry
                .definition("scaffold")
                ?.properties
                ?.single { it.name == NativeElementCatalog.Wire.SAFE_AREA }
                ?.defaultValue,
        )
        val textChildren =
            JSONArray()
                .put(
                    JSONObject()
                        .put("key", "name")
                        .put("name", "text")
                        .put(
                            "props",
                            JSONObject()
                                .put("text", "Maya Chen")
                                .put(
                                    NATIVE_STYLE_PROPERTY,
                                    JSONObject().put("color", "#b83a24"),
                                ),
                        )
                )
                .put(
                    JSONObject()
                        .put("key", "location")
                        .put("name", "text")
                        .put(
                            "props",
                            JSONObject()
                                .put("text", "Kyoto, Japan")
                                .put(
                                    NATIVE_STYLE_PROPERTY,
                                    JSONObject().put("color", "#6f6b63"),
                                ),
                        )
                )
        val children =
            JSONArray()
                .put(
                    JSONObject()
                        .put("key", "avatar")
                        .put("name", "image")
                        .put(
                            "props",
                            JSONObject()
                                .put("src", "")
                                .put(
                                    NATIVE_STYLE_PROPERTY,
                                    JSONObject()
                                        .put("width", 36)
                                        .put("height", 36)
                                        .put("borderRadius", 9999),
                                ),
                        )
                )
                .put(
                    JSONObject()
                        .put("key", "copy")
                        .put("name", "column")
                        .put("props", JSONObject().put("children", textChildren))
                )
        val row =
            AndroidNativeElements.registry.create(
                "row",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("children", children)
                        .put(
                            NATIVE_STYLE_PROPERTY,
                            JSONObject()
                                .put("color", "#20201d")
                                .put("height", 64)
                                .put("paddingTop", 12)
                                .put("paddingRight", 12)
                                .put("paddingBottom", 12)
                                .put("paddingLeft", 12)
                                .put("gap", 8),
                        )
                ),
            ) as LinearLayout

        val host =
            LinearLayout(activity).apply {
                orientation = LinearLayout.VERTICAL
                addView(row)
            }
        host.measure(
            android.view.View.MeasureSpec.makeMeasureSpec(
                (384 * density).toInt(),
                android.view.View.MeasureSpec.EXACTLY,
            ),
            android.view.View.MeasureSpec.makeMeasureSpec(
                (200 * density).toInt(),
                android.view.View.MeasureSpec.AT_MOST,
            ),
        )
        host.layout(0, 0, host.measuredWidth, host.measuredHeight)

        assertEquals(2, row.childCount)
        assertEquals("", row.contentDescription)
        assertEquals((64 * density).toInt(), row.measuredHeight)
        assertTrue(row.getChildAt(0).measuredWidth > 0)
        assertTrue(row.getChildAt(0).measuredHeight > 0)
        val avatar = row.getChildAt(0) as ShapeableImageView
        assertEquals(
            18 * density,
            avatar.shapeAppearanceModel.topLeftCornerSize.getCornerSize(
                android.graphics.RectF(0f, 0f, avatar.width.toFloat(), avatar.height.toFloat())
            ),
        )
        assertTrue(row.getChildAt(1).measuredWidth > 0)
        assertTrue(row.getChildAt(1).measuredHeight > 0)
        val copy = row.getChildAt(1) as LinearLayout
        assertEquals(Color.rgb(184, 58, 36), (copy.getChildAt(0) as TextView).currentTextColor)
        assertEquals(Color.rgb(111, 107, 99), (copy.getChildAt(1) as TextView).currentTextColor)

        AndroidNativeElements.registry.dispose(row)
        activity.finish()
    }

    @Test
    fun `native style transport rejects non-object values`() {
        val (_, context) = nativeContext()

        val error =
            assertThrows(NativeElementException::class.java) {
                AndroidNativeElements.registry.create(
                    "text",
                    context,
                    JSONObjectProperties(
                        JSONObject().put("text", "Pulse").put(NATIVE_STYLE_PROPERTY, "invalid")
                    ),
                )
            }

        assertEquals(NativeElementException.Code.INVALID_PROPERTY, error.code)
    }

    @Test
    fun `text fields expose keyboard autofill selection pending and restored state`() {
        val (activity, context) = nativeContext()
        val properties =
            JSONObject()
                .put("value", "person@example.com")
                .put("placeholder", "name@example.com")
                .put("keyboardType", "email")
                .put("imeAction", "next")
                .put("autofillHints", JSONArray(listOf("emailAddress")))
                .put("selectionStart", 1)
                .put("selectionEnd", 6)
                .put("pending", true)
                .put("readOnly", true)
        val layout =
            AndroidNativeElements.registry.create(
                "text-field",
                context,
                JSONObjectProperties(properties),
            ) as TextInputLayout
        val input = layout.editText as TextInputEditText

        assertEquals(
            InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS,
            input.inputType and InputType.TYPE_MASK_VARIATION,
        )
        assertEquals(EditorInfo.IME_ACTION_NEXT, input.imeOptions and EditorInfo.IME_MASK_ACTION)
        assertEquals("emailAddress", input.autofillHints?.single())
        assertEquals("name@example.com", layout.placeholderText)
        assertEquals(1, input.selectionStart)
        assertEquals(6, input.selectionEnd)
        assertEquals("Pending", layout.helperText)
        assertEquals(false, input.isFocusableInTouchMode)

        val state = requireNotNull(AndroidNativeElements.registry.saveState(layout))
        AndroidNativeElements.registry.update(
            layout,
            JSONObjectProperties(JSONObject().put("value", "changed")),
        )
        AndroidNativeElements.registry.restoreState(layout, state)
        assertEquals("person@example.com", input.text.toString())
        assertEquals(1, input.selectionStart)
        assertEquals(6, input.selectionEnd)

        AndroidNativeElements.registry.dispose(layout)
        activity.finish()
    }

    @Test
    fun `file picker launches filtered document selection and reports results`() {
        val events = mutableListOf<Pair<String, JSONObject?>>()
        var launchedIntent: Intent? = null
        var resultCallback: ((Int, Intent?) -> Unit)? = null
        var cancelled = false
        val launcher =
            object : NativeElementActivityLauncher {
                override fun launch(
                    intent: Intent,
                    result: (Int, Intent?) -> Unit,
                ): Boolean {
                    launchedIntent = intent
                    resultCallback = result
                    return true
                }

                override fun cancel() {
                    cancelled = true
                }
            }
        val (activity, context) =
            nativeContext(
                events = { event, data -> events += event to data },
                activityLauncher = launcher,
            )
        val button =
            AndroidNativeElements.registry.create(
                "file-picker",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("label", "Attach files")
                        .put("accept", JSONArray(listOf("image/png", "image/jpeg", "image/png")))
                        .put("multiple", true)
                        .put(NATIVE_STYLE_PROPERTY, JSONObject().put("color", "#b83a24"))
                ),
            ) as MaterialButton

        assertEquals(Color.rgb(184, 58, 36), button.currentTextColor)
        button.performClick()

        val intent = requireNotNull(launchedIntent)
        assertEquals(Intent.ACTION_OPEN_DOCUMENT, intent.action)
        assertEquals("*/*", intent.type)
        assertEquals(
            listOf("image/png", "image/jpeg"),
            intent.getStringArrayExtra(Intent.EXTRA_MIME_TYPES)?.toList(),
        )
        assertEquals(true, intent.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, false))
        assertTrue(intent.flags and Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION != 0)
        assertEquals("request", events.single().first)

        resultCallback?.invoke(Activity.RESULT_CANCELED, null)
        assertEquals(listOf("request", "cancel"), events.map(Pair<String, JSONObject?>::first))

        button.performClick()
        val first = "content://files/first".toUri()
        val second = "content://files/second".toUri()
        val selection =
            Intent().apply {
                data = first
                clipData =
                    ClipData.newRawUri("files", first).apply { addItem(ClipData.Item(second)) }
            }
        resultCallback?.invoke(Activity.RESULT_OK, selection)

        val change = requireNotNull(events.last().second)
        assertEquals("change", events.last().first)
        assertEquals(2, change.getJSONArray("files").length())
        assertEquals(2, change.getJSONArray("value").length())
        assertEquals(
            first.toString(),
            change.getJSONArray("files").getJSONObject(0).getString("uri"),
        )
        assertEquals(false, change.getJSONArray("files").getJSONObject(0).getBoolean("persisted"))

        button.performClick()
        AndroidNativeElements.registry.dispose(button)
        assertTrue(cancelled)
        activity.finish()
    }

    @Test
    fun `display elements use material widgets and update in place`() {
        val (activity, context) = nativeContext()

        val text =
            AndroidNativeElements.registry.create(
                "text",
                context,
                JSONObjectProperties(JSONObject().put("text", "First").put("textSize", 20)),
            ) as MaterialTextView
        AndroidNativeElements.registry.update(
            text,
            JSONObjectProperties(JSONObject().put("text", "Second").put("maxLines", 2)),
        )
        assertEquals("Second", text.text.toString())
        assertEquals(2, text.maxLines)

        val divider =
            AndroidNativeElements.registry.create(
                "divider",
                context,
                JSONObjectProperties(JSONObject().put("label", "Section").put("thickness", 3)),
            ) as MaterialDivider
        assertEquals("Section", divider.contentDescription)
        assertTrue(divider.dividerThickness >= 3)

        val icon =
            AndroidNativeElements.registry.create(
                "icon",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("resource", "@android:drawable/ic_menu_help")
                        .put("contentDescription", "Help")
                        .put("tint", "#123456")
                ),
            ) as ShapeableImageView
        assertEquals("Help", icon.contentDescription)
        assertNotNull(icon.drawable)
        assertNotNull(icon.colorFilter)

        val badge =
            AndroidNativeElements.registry.create(
                "badge",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("text", "7")
                        .put("backgroundColor", "#123456")
                        .put("textColor", "#fedcba")
                ),
            ) as MaterialTextView
        assertEquals("7", badge.text.toString())
        assertEquals(Color.rgb(254, 220, 186), badge.currentTextColor)
        assertEquals(
            Color.rgb(18, 52, 86),
            (badge.background as GradientDrawable).color?.defaultColor,
        )

        val progress =
            AndroidNativeElements.registry.create(
                "progress",
                context,
                JSONObjectProperties(JSONObject().put("value", 25).put("max", 50)),
            ) as LinearProgressIndicator
        assertEquals(25, progress.progress)
        assertEquals(50, progress.max)

        val loading =
            AndroidNativeElements.registry.create(
                "loading-indicator",
                context,
                JSONObjectProperties(JSONObject().put("visible", false)),
            ) as CircularProgressIndicator
        assertEquals(android.view.View.GONE, loading.visibility)

        val image =
            AndroidNativeElements.registry.create(
                "image",
                context,
                JSONObjectProperties(JSONObject().put("contentDescription", "Receipt")),
            ) as ShapeableImageView
        assertEquals("Receipt", image.contentDescription)

        listOf(text, icon, divider, badge, progress, loading, image)
            .forEach(AndroidNativeElements.registry::dispose)
        activity.finish()
    }

    @Test
    fun `action elements expose loading focus and semantic events`() {
        val events = mutableListOf<String>()
        val (activity, context) = nativeContext(events = { event, _ -> events += event })

        val button =
            AndroidNativeElements.registry.create(
                "button",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("text", "Save")
                        .put("loading", true)
                        .put("loadingText", "Saving")
                ),
            ) as MaterialButton
        activity.setContentView(button)
        assertEquals("Saving", button.text.toString())
        assertEquals(false, button.isEnabled)
        assertEquals(0.5f, button.alpha)
        AndroidNativeElements.registry.update(
            button,
            JSONObjectProperties(JSONObject().put("text", "Save").put("loading", false)),
        )
        button.performClick()
        button.performLongClick()
        button.requestFocus()
        button.clearFocus()
        assertTrue(events.containsAll(listOf("click", "longClick", "focus", "blur")))

        val card =
            AndroidNativeElements.registry.create(
                "card",
                context,
                JSONObjectProperties(JSONObject().put("title", "Task").put("enabled", false)),
            ) as MaterialCardView
        assertEquals(false, card.isEnabled)
        assertTrue(card.minimumHeight >= (48 * activity.resources.displayMetrics.density).toInt())

        val action =
            AndroidNativeElements.registry.create(
                "floating-action-button",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("resource", "@android:drawable/ic_input_add")
                        .put("contentDescription", "Add task")
                ),
            ) as FloatingActionButton
        assertEquals("Add task", action.contentDescription)

        val chip =
            AndroidNativeElements.registry.create(
                "chip",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("text", "Selected")
                        .put("checkable", true)
                        .put("checked", false)
                ),
            ) as Chip
        val changesBeforeNativeUpdate = events.count { it == "change" }
        chip.isChecked = true
        assertEquals(changesBeforeNativeUpdate + 1, events.count { it == "change" })
        val changesBeforeScopeUpdate = events.count { it == "change" }
        AndroidNativeElements.registry.update(
            chip,
            JSONObjectProperties(
                JSONObject().put("text", "Cleared").put("checkable", true).put("checked", false)
            ),
        )
        assertEquals("Cleared", chip.text.toString())
        assertEquals(false, chip.isChecked)
        assertEquals(changesBeforeScopeUpdate, events.count { it == "change" })

        listOf(button, card, action, chip).forEach(AndroidNativeElements.registry::dispose)
        activity.finish()
    }

    @Test
    fun `image loading cancels stale work and reports load error and disposal deterministically`() {
        val pending = mutableMapOf<String, CompletableDeferred<android.graphics.Bitmap?>>()
        val loads = mutableListOf<String>()
        val events = mutableListOf<Pair<String, String>>()
        val (activity, context) =
            nativeContext(
                events =
                    NativeElementEventSink { event, data ->
                        events += event to requireNotNull(data).getString("src")
                    }
            )
        val factory =
            AndroidNativeElements.imageFactory(
                load = { _, source ->
                    loads += source
                    pending.getOrPut(source) { CompletableDeferred() }.await()
                },
                workerDispatcher = Dispatchers.Unconfined,
                uiDispatcher = Dispatchers.Unconfined,
            )
        fun properties(
            source: String,
            scale: String = "crop",
        ) =
            NativeProperties(
                JSONObject()
                    .put("src", source)
                    .put("contentDescription", "Receipt")
                    .put("contentScale", scale)
                    .put("placeholderColor", "#123456")
                    .put("errorColor", "#654321")
            )

        val instance = factory.create(context, properties("first", "fit"))
        val image = instance.view as ShapeableImageView
        assertEquals("Receipt", image.contentDescription)
        assertEquals(android.widget.ImageView.ScaleType.FIT_CENTER, image.scaleType)
        assertEquals(Color.rgb(18, 52, 86), (image.background as ColorDrawable).color)

        instance.update(properties("second", "inside"))
        pending.getValue("first").complete(createBitmap(1, 1))
        assertTrue(events.isEmpty())

        val loaded = createBitmap(2, 2)
        pending.getValue("second").complete(loaded)
        assertEquals(listOf("load" to "second"), events)
        assertSame(loaded, (image.drawable as BitmapDrawable).bitmap)
        assertEquals(android.widget.ImageView.ScaleType.CENTER_INSIDE, image.scaleType)

        val cached = factory.create(context, properties("second"))
        assertSame(loaded, ((cached.view as ShapeableImageView).drawable as BitmapDrawable).bitmap)
        assertEquals(1, loads.count { it == "second" })
        assertEquals(listOf("load" to "second", "load" to "second"), events)
        cached.dispose()

        instance.update(properties("failed", "fill"))
        assertEquals(Color.rgb(18, 52, 86), (image.background as ColorDrawable).color)
        pending.getValue("failed").complete(null)
        assertEquals(
            listOf("load" to "second", "load" to "second", "error" to "failed"),
            events,
        )
        assertEquals(Color.rgb(101, 67, 33), (image.background as ColorDrawable).color)
        assertEquals(android.widget.ImageView.ScaleType.FIT_XY, image.scaleType)

        instance.update(properties("disposed"))
        instance.dispose()
        pending.getValue("disposed").complete(createBitmap(1, 1))
        assertEquals(
            listOf("load" to "second", "load" to "second", "error" to "failed"),
            events,
        )
        assertEquals(null, image.drawable)
        activity.finish()
    }

    @Test
    fun `native form controls preserve typed state without controlled update loops`() {
        val events = mutableListOf<Pair<String, JSONObject?>>()
        val (activity, context) = nativeContext(events = { event, data -> events += event to data })

        val checkbox =
            AndroidNativeElements.registry.create(
                "checkbox",
                context,
                JSONObjectProperties(JSONObject().put("label", "Remember").put("value", false)),
            ) as CheckBox
        checkbox.isChecked = true
        assertEquals(true, requireNotNull(events.last().second).getBoolean("value"))
        val checkboxEvents = events.size
        val checkboxState = requireNotNull(AndroidNativeElements.registry.saveState(checkbox))
        AndroidNativeElements.registry.update(
            checkbox,
            JSONObjectProperties(JSONObject().put("label", "Remember").put("value", false)),
        )
        AndroidNativeElements.registry.restoreState(checkbox, checkboxState)
        assertEquals(true, checkbox.isChecked)
        assertEquals(checkboxEvents, events.size)

        val switch =
            AndroidNativeElements.registry.create(
                "switch",
                context,
                JSONObjectProperties(JSONObject().put("label", "Alerts").put("value", false)),
            ) as SwitchMaterial
        switch.isChecked = true
        assertEquals(true, requireNotNull(events.last().second).getBoolean("value"))

        val slider =
            AndroidNativeElements.registry.create(
                "slider",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("label", "Volume")
                        .put("min", 0)
                        .put("max", 10)
                        .put("step", 2)
                        .put("value", 4)
                ),
            ) as Slider
        assertEquals(4f, slider.value)
        val sliderState = requireNotNull(AndroidNativeElements.registry.saveState(slider))
        AndroidNativeElements.registry.update(
            slider,
            JSONObjectProperties(
                JSONObject().put("label", "Volume").put("min", 0).put("max", 10).put("value", 8)
            ),
        )
        AndroidNativeElements.registry.restoreState(slider, sliderState)
        assertEquals(4f, slider.value)

        val range =
            AndroidNativeElements.registry.create(
                "range-slider",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("label", "Price")
                        .put("min", 0)
                        .put("max", 10)
                        .put("step", 2)
                        .put("value", JSONArray(listOf(2, 8)))
                ),
            ) as RangeSlider
        assertEquals(listOf(2f, 8f), range.values)

        val options =
            JSONArray(
                listOf(
                    JSONObject().put("label", "Email").put("value", "email"),
                    JSONObject().put("label", "SMS").put("value", "sms"),
                )
            )
        val radio =
            AndroidNativeElements.registry.create(
                "radio-group",
                context,
                JSONObjectProperties(
                    JSONObject()
                        .put("label", "Contact method")
                        .put("options", options)
                        .put("value", "email")
                ),
            ) as RadioGroup
        val firstRadio = radio.getChildAt(0) as RadioButton
        val radioEvents = events.size
        AndroidNativeElements.registry.update(
            radio,
            JSONObjectProperties(
                JSONObject()
                    .put("label", "Contact method")
                    .put("options", options)
                    .put("value", "sms")
            ),
        )
        assertSame(firstRadio, radio.getChildAt(0))
        assertEquals(true, (radio.getChildAt(1) as RadioButton).isChecked)
        assertEquals(radioEvents, events.size)
        radio.check(firstRadio.id)
        assertEquals("email", requireNotNull(events.last().second).getString("value"))

        val date =
            AndroidNativeElements.registry.create(
                "date-picker",
                context,
                JSONObjectProperties(JSONObject().put("label", "Date").put("value", "2026-09-07")),
            ) as DatePicker
        val dateState = requireNotNull(AndroidNativeElements.registry.saveState(date))
        AndroidNativeElements.registry.update(
            date,
            JSONObjectProperties(JSONObject().put("label", "Date").put("value", "2027-10-08")),
        )
        AndroidNativeElements.registry.restoreState(date, dateState)
        assertEquals(2026, date.year)
        assertEquals(8, date.month)
        assertEquals(7, date.dayOfMonth)

        val time =
            AndroidNativeElements.registry.create(
                "time-picker",
                context,
                JSONObjectProperties(JSONObject().put("label", "Time").put("value", "14:35")),
            ) as TimePicker
        val timeState = requireNotNull(AndroidNativeElements.registry.saveState(time))
        AndroidNativeElements.registry.update(
            time,
            JSONObjectProperties(JSONObject().put("label", "Time").put("value", "09:10")),
        )
        AndroidNativeElements.registry.restoreState(time, timeState)
        assertEquals(14, time.hour)
        assertEquals(35, time.minute)

        listOf(checkbox, switch, slider, range, radio, date, time)
            .forEach(AndroidNativeElements.registry::dispose)
        activity.finish()
    }

    @Test
    fun `native form controls expose and clear validation accessibility state`() {
        val (activity, context) = nativeContext()
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
        activity.finish()
    }

    @Test
    fun `native form controls reject invalid relational values`() {
        val (_, context) = nativeContext()
        val invalidProperties =
            listOf(
                "slider" to JSONObject().put("min", 1).put("max", 1),
                "slider" to JSONObject().put("step", -1),
                "slider" to JSONObject().put("max", 10).put("step", 3),
                "slider" to JSONObject().put("value", 101),
                "range-slider" to JSONObject().put("value", JSONArray().put(1)),
                "date-picker" to JSONObject().put("value", "2026-02-30"),
                "time-picker" to JSONObject().put("value", "25:00"),
                "radio-group" to
                    JSONObject()
                        .put(
                            "options",
                            JSONArray()
                                .put(JSONObject().put("label", "One").put("value", "same"))
                                .put(JSONObject().put("label", "Two").put("value", "same")),
                        ),
            )

        invalidProperties.forEach { (name, properties) ->
            assertThrows(NativeElementException::class.java) {
                AndroidNativeElements.registry.create(
                    name,
                    context,
                    JSONObjectProperties(properties),
                )
            }
        }
    }

    @Test
    fun `creates updates and disposes every built-in element`() {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java)
        val activity =
            controller.get().apply {
                setTheme(com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar)
            }
        controller.setup()
        val fragment = Fragment()
        activity.supportFragmentManager.beginTransaction().add(fragment, "owner").commitNow()
        val context =
            NativeElementContext(
                context = activity,
                container = null,
                lifecycleOwner = fragment,
                savedStateOwner = fragment,
                events = { _, _ -> },
            )

        AndroidNativeElements.registry.definitions.forEach { definition ->
            val initial = requiredProperties(definition)
            val view =
                AndroidNativeElements.registry.create(
                    definition.name,
                    context,
                    JSONObjectProperties(initial),
                )

            assertNotNull(definition.name, view)
            AndroidNativeElements.registry.update(view, JSONObjectProperties(initial))
            assertThrows(NativeElementException::class.java) {
                AndroidNativeElements.registry.update(
                    view,
                    JSONObjectProperties(JSONObject().put("unsupported", true)),
                )
            }
            assertThrows(NativeElementException::class.java) {
                AndroidNativeElements.registry.invoke(
                    view,
                    "unsupported",
                    JSONObjectProperties(JSONObject()),
                )
            }
            AndroidNativeElements.registry.dispose(view)
        }
    }

    @Test
    fun `keyed layout children are updated moved and disposed`() {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java)
        val activity =
            controller.get().apply {
                setTheme(com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar)
            }
        controller.setup()
        val fragment = Fragment()
        activity.supportFragmentManager.beginTransaction().add(fragment, "owner").commitNow()
        val context =
            NativeElementContext(
                context = activity,
                container = null,
                lifecycleOwner = fragment,
                savedStateOwner = fragment,
                events = { _, _ -> },
            )

        fun child(
            key: String,
            text: String,
        ) =
            JSONObject()
                .put("key", key)
                .put("name", "text")
                .put("props", JSONObject().put("text", text))

        fun properties(vararg children: JSONObject) =
            JSONObjectProperties(JSONObject().put("children", JSONArray(children.toList())))

        val row =
            AndroidNativeElements.registry.create(
                "row",
                context,
                properties(child("first", "A"), child("second", "B")),
            ) as ViewGroup
        val first = row.getChildAt(0)
        val second = row.getChildAt(1)

        AndroidNativeElements.registry.update(
            row,
            properties(child("second", "B2"), child("first", "A2")),
        )

        assertSame(second, row.getChildAt(0))
        assertSame(first, row.getChildAt(1))
        assertEquals("B2", (second as TextView).text.toString())

        AndroidNativeElements.registry.update(row, properties(child("first", "A3")))
        assertEquals(1, row.childCount)
        assertThrows(IllegalArgumentException::class.java) {
            AndroidNativeElements.registry.update(
                row,
                properties(child("same", "A"), child("same", "B")),
            )
        }
        assertSame(first, row.getChildAt(0))
        assertEquals("A3", (first as TextView).text.toString())
        assertThrows(NativeElementException::class.java) {
            AndroidNativeElements.registry.update(second, JSONObjectProperties(JSONObject()))
        }
        AndroidNativeElements.registry.dispose(row)
    }

    @Test
    fun `tabs and pager implement controlled selection and imperative scrolling`() {
        val events = mutableListOf<Pair<String, JSONObject?>>()
        val (activity, context) = nativeContext(events = { event, data -> events += event to data })

        fun child(
            key: String,
            text: String,
        ) =
            JSONObject()
                .put("key", key)
                .put("name", "text")
                .put("props", JSONObject().put("text", text))
        val children = JSONArray(listOf(child("first", "First"), child("second", "Second")))

        val tabs =
            AndroidNativeElements.registry.create(
                "tabs",
                context,
                JSONObjectProperties(JSONObject().put("children", children).put("value", "second")),
            ) as LinearLayout
        val tabLayout = tabs.getChildAt(0) as TabLayout
        val tabContent = tabs.getChildAt(1) as FrameLayout
        assertEquals(1, tabLayout.selectedTabPosition)
        assertEquals("Second", (tabContent.getChildAt(0) as TextView).text.toString())
        assertTrue(events.isEmpty())

        tabLayout.getTabAt(0)?.select()
        assertEquals("change", events.single().first)
        assertEquals("first", events.single().second?.getString("value"))
        assertEquals(0, events.single().second?.getInt("index"))

        AndroidNativeElements.registry.invoke(
            tabs,
            "scrollTo",
            JSONObjectProperties(JSONObject().put("value", "second")),
        )
        assertEquals(1, tabLayout.selectedTabPosition)
        val tabState = requireNotNull(AndroidNativeElements.registry.saveState(tabs))
        AndroidNativeElements.registry.restoreState(tabs, tabState)

        AndroidNativeElements.registry.dispose(tabs)
        events.clear()
        val pager =
            AndroidNativeElements.registry.create(
                "pager",
                context,
                JSONObjectProperties(JSONObject().put("children", children).put("value", 1)),
            ) as ViewPager2
        assertEquals(1, pager.currentItem)
        assertTrue(events.isEmpty())

        AndroidNativeElements.registry.invoke(
            pager,
            "scrollTo",
            JSONObjectProperties(JSONObject().put("value", 0)),
        )
        assertEquals(0, pager.currentItem)
        val pagerState = requireNotNull(AndroidNativeElements.registry.saveState(pager))
        AndroidNativeElements.registry.restoreState(pager, pagerState)

        AndroidNativeElements.registry.dispose(pager)
        activity.finish()
    }

    @Test
    fun `collections require stable unique keys and use recyclable layouts`() {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java)
        val activity =
            controller.get().apply {
                setTheme(com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar)
            }
        controller.setup()
        val fragment = Fragment()
        activity.supportFragmentManager.beginTransaction().add(fragment, "owner").commitNow()
        val context =
            NativeElementContext(
                context = activity,
                container = null,
                lifecycleOwner = fragment,
                savedStateOwner = fragment,
                events = { _, _ -> },
            )

        fun child(key: String?) =
            JSONObject()
                .apply { if (key != null) put("key", key) }
                .put("name", "text")
                .put("props", JSONObject().put("text", key))

        fun properties(vararg children: JSONObject) =
            JSONObjectProperties(JSONObject().put("children", JSONArray(children.toList())))

        val listProperties =
            JSONObjectProperties(
                JSONObject()
                    .put("children", JSONArray(listOf(child("first"), child("second"))))
                    .put("label", "Tasks")
                    .put("padding", 8)
                    .put("safeArea", false)
                    .put("enabled", false)
            )
        val list =
            AndroidNativeElements.registry.create(
                "list",
                context,
                listProperties,
            ) as RecyclerView
        assertEquals(2, list.adapter?.itemCount)
        assertEquals("Tasks", list.contentDescription)
        assertEquals((8 * list.resources.displayMetrics.density).toInt(), list.paddingLeft)
        assertEquals(false, list.isEnabled)

        AndroidNativeElements.registry.update(
            list,
            properties(child("second"), child("first"), child("third")),
        )
        assertEquals(3, list.adapter?.itemCount)
        assertThrows(NativeElementException::class.java) {
            AndroidNativeElements.registry.update(list, properties(child(null)))
        }
        assertThrows(NativeElementException::class.java) {
            AndroidNativeElements.registry.update(list, properties(child("same"), child("same")))
        }

        val grid =
            AndroidNativeElements.registry.create(
                "grid",
                context,
                JSONObjectProperties(
                    JSONObject().put("children", JSONArray(listOf(child("one")))).put("columns", 3)
                ),
            ) as RecyclerView
        assertEquals(3, (grid.layoutManager as GridLayoutManager).spanCount)
        AndroidNativeElements.registry.dispose(list)
        AndroidNativeElements.registry.dispose(grid)
    }

    @Test
    fun `ten thousand collection items create only visible views`() {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java)
        val activity =
            controller.get().apply {
                setTheme(com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar)
            }
        controller.setup()
        val fragment = Fragment()
        activity.supportFragmentManager.beginTransaction().add(fragment, "owner").commitNow()
        val context =
            NativeElementContext(
                context = activity,
                container = null,
                lifecycleOwner = fragment,
                savedStateOwner = fragment,
                events = { _, _ -> },
            )
        var created = 0
        val itemDefinition =
            NativeElementDefinition(
                name = "benchmark-item",
                properties = listOf(NativePropertyDefinition("text", NativePropertyType.STRING)),
                factory =
                    NativeElementFactory { itemContext, properties ->
                        created++
                        val text = TextView(itemContext.context)
                        object : NativeElementInstance {
                                override val view = text

                                override fun update(properties: NativeProperties) {
                                    text.text = properties.string("text")
                                }
                            }
                            .also { it.update(properties) }
                    },
            )
        val registry = NativeElementRegistry(listOf(itemDefinition))

        fun properties(offset: Int) =
            NativeProperties(
                JSONObject()
                    .put(
                        "children",
                        JSONArray(
                            (0 until 10_000).map { index ->
                                val value = (index + offset) % 10_000
                                JSONObject()
                                    .put("key", "item-$value")
                                    .put("name", "benchmark-item")
                                    .put("props", JSONObject().put("text", value.toString()))
                            }
                        ),
                    )
            )

        val instance =
            recyclingNativeCollectionFactory({ registry }, grid = false)
                .create(context, properties(0))
        val collection = instance.view as RecyclerView
        val width =
            android.view.View.MeasureSpec.makeMeasureSpec(
                1080,
                android.view.View.MeasureSpec.EXACTLY,
            )
        val height =
            android.view.View.MeasureSpec.makeMeasureSpec(
                1920,
                android.view.View.MeasureSpec.EXACTLY,
            )
        collection.measure(width, height)
        collection.layout(0, 0, 1080, 1920)

        assertEquals(10_000, collection.adapter?.itemCount)
        assertTrue("Only visible collection children should be created", created in 1..100)
        instance.update(properties(1))
        collection.measure(width, height)
        collection.layout(0, 0, 1080, 1920)
        assertTrue("Keyed updates must remain virtualized", created <= 100)
        instance.dispose()
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

    private fun nativeContext(
        events: NativeElementEventSink = NativeElementEventSink { _, _ -> },
        activityLauncher: NativeElementActivityLauncher? = null,
    ): Pair<FragmentActivity, NativeElementContext> {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java)
        val activity =
            controller.get().apply {
                setTheme(com.google.android.material.R.style.Theme_Material3_DayNight_NoActionBar)
            }
        controller.setup()
        val fragment = Fragment()
        activity.supportFragmentManager.beginTransaction().add(fragment, "native-owner").commitNow()
        return activity to
            NativeElementContext(
                context = activity,
                container = null,
                lifecycleOwner = fragment,
                savedStateOwner = fragment,
                events = events,
                activityLauncher = activityLauncher,
            )
    }
}
