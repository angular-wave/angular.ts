package io.github.angularwave.android.navigation.elements

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.util.LruCache
import android.view.FocusFinder
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputConnectionWrapper
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.CheckBox
import android.widget.DatePicker
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.PopupWindow
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.TimePicker
import androidx.core.graphics.drawable.toDrawable
import androidx.core.graphics.toColorInt
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.widget.NestedScrollView
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.chip.Chip
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.divider.MaterialDivider
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.imageview.ShapeableImageView
import com.google.android.material.navigation.NavigationBarView
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.progressindicator.LinearProgressIndicator
import com.google.android.material.slider.RangeSlider
import com.google.android.material.slider.Slider
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.switchmaterial.SwitchMaterial
import com.google.android.material.tabs.TabLayout
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.google.android.material.textview.MaterialTextView
import io.github.angularwave.android.navigation.R
import io.github.angularwave.android.navigation.files.NativeFileSelection
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel as cancelScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

private const val OVERLAY_OPEN_STATE = "angularNativeOverlayOpen"
private const val TOOLTIP_ELEVATION_DP = 4
private const val IMAGE_CACHE_MAX_BYTES = 32 * 1024 * 1024
private val imageCache =
    object : LruCache<String, android.graphics.Bitmap>(IMAGE_CACHE_MAX_BYTES) {
        override fun sizeOf(key: String, value: android.graphics.Bitmap): Int =
            value.allocationByteCount.coerceAtLeast(1)
    }

internal class NativeBottomSheetDismissCallback(private val cancel: () -> Unit) :
    BottomSheetBehavior.BottomSheetCallback() {
    override fun onStateChanged(
        bottomSheet: View,
        newState: Int,
    ) {
        if (newState == BottomSheetBehavior.STATE_HIDDEN) cancel()
    }

    override fun onSlide(
        bottomSheet: View,
        slideOffset: Float,
    ) = Unit
}

@JvmSynthetic
internal fun overlayInstance(
    context: NativeElementContext,
    trigger: View,
    properties: NativeProperties,
    restoreOpen: Boolean,
    showEvent: String = NativeElementCatalog.Wire.SHOW,
    dismissEvent: String = NativeElementCatalog.Wire.DISMISS,
    openOnLongClick: Boolean = false,
    update: (NativeProperties) -> Unit,
    createOverlay: (NativeProperties, dismissed: (JSONObject?) -> Unit) -> (() -> Unit),
): NativeElementInstance {
    var current = properties
    val lifecycle =
        NativeOverlayLifecycle(context.savedStateOwner, trigger) { data ->
            context.events.emit(dismissEvent, data)
        }
    fun show() {
        lifecycle.show { dismissed -> createOverlay(current, dismissed) }
        if (lifecycle.isShowing) context.events.emit(showEvent, null)
    }
    trigger.setOnClickListener { show() }
    if (openOnLongClick)
        trigger.setOnLongClickListener {
            show()
            true
        }
    return object : NativeElementInstance {
            override val view: View = trigger

            override fun update(properties: NativeProperties) {
                current = properties
                update(properties)
            }

            override fun invoke(method: String, parameters: NativeProperties): Any? {
                when (method) {
                    NativeElementCatalog.Wire.SHOW -> show()
                    NativeElementCatalog.Wire.HIDE,
                    NativeElementCatalog.Wire.DISMISS -> lifecycle.dismiss()
                    else -> return super.invoke(method, parameters)
                }
                return null
            }

            override fun saveState(): Bundle =
                Bundle().apply {
                    putBoolean(OVERLAY_OPEN_STATE, restoreOpen && lifecycle.isShowing)
                }

            override fun restoreState(state: Bundle) {
                if (restoreOpen && state.getBoolean(OVERLAY_OPEN_STATE)) show()
            }

            override fun dispose() {
                trigger.setOnClickListener(null)
                trigger.setOnLongClickListener(null)
                lifecycle.dispose()
            }
        }
        .also { it.update(properties) }
}

internal fun applyInputState(
    view: View,
    values: NativeProperties,
    fallbackLabel: String = "",
) {
    view.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
    view.contentDescription = values.string(NativeElementCatalog.Wire.LABEL, fallbackLabel)
    val states = buildList {
        if (values.boolean(NativeElementCatalog.Wire.REQUIRED)) {
            add(view.context.getString(R.string.angular_native_required))
        }
        values.string(NativeElementCatalog.Wire.ERROR).takeIf(String::isNotEmpty)?.let {
            add(view.context.getString(R.string.angular_native_error, it))
        }
        if (values.boolean(NativeElementCatalog.Wire.PENDING)) {
            add(view.context.getString(R.string.angular_native_validation_pending))
        }
    }
    ViewCompat.setStateDescription(
        view,
        states.joinToString(separator = ", ").takeIf(String::isNotEmpty),
    )
}

object AndroidNativeElements {
    private const val LAST_HOUR = 23
    private const val LAST_MINUTE = 59
    private const val RANGE_VALUE_COUNT = 2
    private const val STEP_TOLERANCE = 0.0001f
    private val TIME_PATTERN = Regex("\\d{2}:\\d{2}")
    private const val DEFAULT_TEXT_SIZE_SP = 16f
    private const val OUTLINE_RADIUS_DP = 10
    private const val DEFAULT_PROGRESS_MAX = 100
    private const val DISABLED_ALPHA = 0.5f
    private const val IMAGE_CONNECT_TIMEOUT_MS = 10_000
    private const val IMAGE_READ_TIMEOUT_MS = 15_000
    private val HTTP_SUCCESS_CODES = 200..299

    val registry: NativeElementRegistry =
        NativeElementRegistry.discover(
            listOf(
                badgeDefinition(),
                buttonDefinition(),
                cardDefinition(),
                checkboxDefinition(),
                chipDefinition(),
                dividerDefinition(),
                dialogDefinition(),
                bottomSheetDefinition(),
                drawerDefinition(),
                floatingActionButtonDefinition(),
                iconDefinition(),
                imageDefinition(),
                loadingIndicatorDefinition(),
                listDefinition(),
                gridDefinition(),
                listItemDefinition(),
                swipeActionDefinition(),
                pullToRefreshDefinition(),
                menuDefinition(),
                snackbarDefinition(),
                tooltipDefinition(),
                rowDefinition(),
                columnDefinition(),
                boxDefinition(),
                surfaceDefinition(),
                scrollDefinition(),
                scaffoldDefinition(),
                appBarDefinition(),
                bottomBarDefinition(),
                navigationRailDefinition(),
                tabsDefinition(),
                pagerDefinition(),
                progressDefinition(),
                radioGroupDefinition(),
                rangeSliderDefinition(),
                searchFieldDefinition(),
                sliderDefinition(),
                switchDefinition(),
                textFieldDefinition(),
                textDefinition(),
                datePickerDefinition(),
                timePickerDefinition(),
                filePickerDefinition(),
            )
        )

    private fun textFieldDefinition() = NativeElementCatalog.textField(textInputFactory(false))

    private fun searchFieldDefinition() = NativeElementCatalog.searchField(textInputFactory(true))

    private fun textInputFactory(search: Boolean) = NativeElementFactory { context, properties ->
        var applying = false
        val input =
            NativeTextInputEditText(context.context).apply {
                isSingleLine = true
            }
        val layout = TextInputLayout(context.context).apply { addView(input) }
        fun emitValue(value: Editable) {
            context.events.emit(
                NativeElementCatalog.Wire.CHANGE,
                JSONObject()
                    .put(NativeElementCatalog.Wire.VALUE, value.toString())
                    .put(NativeElementCatalog.Wire.SELECTION_START, input.selectionStart)
                    .put(NativeElementCatalog.Wire.SELECTION_END, input.selectionEnd),
            )
        }
        input.onCompositionCommitted = {
            if (!applying) input.text?.let(::emitValue)
        }
        val textWatcher =
            object : TextWatcher {
                override fun beforeTextChanged(
                    value: CharSequence?,
                    start: Int,
                    count: Int,
                    after: Int,
                ) {}

                override fun onTextChanged(
                    value: CharSequence?,
                    start: Int,
                    before: Int,
                    count: Int,
                ) {}

                override fun afterTextChanged(value: Editable?) {
                    if (!applying && !input.composing && value != null) emitValue(value)
                }
            }
        input.addTextChangedListener(textWatcher)
        input.setOnFocusChangeListener { _, focused ->
            context.events.emit(
                if (focused) NativeElementCatalog.Wire.FOCUS else NativeElementCatalog.Wire.BLUR,
                null,
            )
        }
        input.setOnEditorActionListener { _, action, _ ->
            if (action == EditorInfo.IME_ACTION_NONE) {
                false
            } else {
                context.events.emit(
                    NativeElementCatalog.Wire.SUBMIT,
                    JSONObject().put(NativeElementCatalog.Wire.VALUE, input.text.toString()),
                )
                if (action == EditorInfo.IME_ACTION_NEXT) {
                    (input.rootView as? ViewGroup)?.let { root ->
                        FocusFinder.getInstance()
                            .findNextFocus(root, input, View.FOCUS_FORWARD)
                            ?.requestFocus()
                    }
                }
                true
            }
        }
        object : NativeElementInstance {
                override val view: View = layout

                override fun update(properties: NativeProperties) {
                    applying = true
                    val value = properties.string(NativeElementCatalog.Wire.VALUE)
                    if (input.text.toString() != value) input.setText(value)
                    input.hint = null
                    layout.placeholderText =
                        properties.string(NativeElementCatalog.Wire.PLACEHOLDER).ifEmpty { null }
                    val readOnly = properties.boolean(NativeElementCatalog.Wire.READ_ONLY)
                    input.isFocusableInTouchMode = !readOnly
                    input.isCursorVisible = !readOnly
                    input.isLongClickable = !readOnly
                    input.inputType =
                        inputType(properties.string(NativeElementCatalog.Wire.KEYBOARD_TYPE))
                    input.imeOptions =
                        imeAction(
                            properties.string(
                                NativeElementCatalog.Wire.IME_ACTION,
                                if (search) "search" else "done",
                            )
                        )
                    input.setAutofillHints(
                        *properties
                            .stringList(NativeElementCatalog.Wire.AUTOFILL_HINTS)
                            .toTypedArray()
                    )
                    layout.hint =
                        properties.string(
                            NativeElementCatalog.Wire.LABEL,
                            if (search) "Search" else "",
                        )
                    applyInputState(input, properties, layout.hint?.toString().orEmpty())
                    layout.error =
                        properties.string(NativeElementCatalog.Wire.ERROR).ifEmpty { null }
                    layout.isEnabled = input.isEnabled
                    val pending = properties.boolean(NativeElementCatalog.Wire.PENDING)
                    layout.isHelperTextEnabled = pending
                    layout.helperText = if (pending) "Pending" else null
                    val selectionStart =
                        properties.integer(NativeElementCatalog.Wire.SELECTION_START, -1)
                    val selectionEnd =
                        properties.integer(NativeElementCatalog.Wire.SELECTION_END, selectionStart)
                    if (
                        selectionStart >= 0 &&
                            selectionEnd >= selectionStart &&
                            selectionEnd <= input.length()
                    ) {
                        input.setSelection(selectionStart, selectionEnd)
                    }
                    applying = false
                }

                override fun saveState() =
                    android.os.Bundle().apply {
                        putString(NativeElementCatalog.Wire.VALUE, input.text?.toString().orEmpty())
                        putInt(NativeElementCatalog.Wire.SELECTION_START, input.selectionStart)
                        putInt(NativeElementCatalog.Wire.SELECTION_END, input.selectionEnd)
                    }

                override fun restoreState(state: android.os.Bundle) {
                    applying = true
                    input.setText(state.getString(NativeElementCatalog.Wire.VALUE).orEmpty())
                    val start =
                        state
                            .getInt(NativeElementCatalog.Wire.SELECTION_START, input.length())
                            .coerceIn(0, input.length())
                    val end =
                        state
                            .getInt(NativeElementCatalog.Wire.SELECTION_END, start)
                            .coerceIn(start, input.length())
                    input.setSelection(start, end)
                    applying = false
                }

                override fun dispose() {
                    input.onCompositionCommitted = null
                    input.removeTextChangedListener(textWatcher)
                    input.onFocusChangeListener = null
                    input.setOnEditorActionListener(null)
                }

                override fun invoke(method: String, parameters: NativeProperties): Any? {
                    when (method) {
                        NativeElementCatalog.Wire.FOCUS -> {
                            input.requestFocus()
                            (context.context.getSystemService(
                                    android.content.Context.INPUT_METHOD_SERVICE
                                ) as? InputMethodManager)
                                ?.showSoftInput(input, 0)
                        }
                        NativeElementCatalog.Wire.BLUR -> input.clearFocus()
                        else -> return super.invoke(method, parameters)
                    }
                    return null
                }
            }
            .also { it.update(properties) }
    }

    private fun checkboxDefinition() =
        NativeElementCatalog.checkbox(toggleFactory({ context -> CheckBox(context) }))

    private fun switchDefinition() =
        NativeElementCatalog.switch(toggleFactory({ context -> SwitchMaterial(context) }))

    private data class SliderBounds(val minimum: Float, val maximum: Float, val step: Float)

    private fun sliderBounds(
        element: String,
        values: NativeProperties,
    ): SliderBounds {
        val minimum = values.float(NativeElementCatalog.Wire.MIN)
        val maximum = values.float(NativeElementCatalog.Wire.MAX, 100f)
        val step = values.float(NativeElementCatalog.Wire.STEP)
        if (!minimum.isFinite()) invalidProperty(element, "min must be finite")
        if (!maximum.isFinite() || maximum <= minimum) {
            invalidProperty(element, "max must be finite and greater than min")
        }
        if (!step.isFinite() || step < 0f) {
            invalidProperty(element, "step must be finite and non-negative")
        }
        if (step > 0f && !isStepAligned(maximum - minimum, step)) {
            invalidProperty(element, "step must divide the range evenly")
        }
        return SliderBounds(minimum, maximum, step)
    }

    private fun sliderValue(
        element: String,
        value: Float,
        bounds: SliderBounds,
    ): Float {
        if (!value.isFinite() || value !in bounds.minimum..bounds.maximum) {
            invalidProperty(element, "value must be finite and within min and max")
        }
        if (bounds.step > 0f && !isStepAligned(value - bounds.minimum, bounds.step)) {
            invalidProperty(element, "value must align with step")
        }
        return value
    }

    private fun isStepAligned(value: Float, step: Float): Boolean {
        val count = value / step
        return kotlin.math.abs(count - kotlin.math.round(count)) <= STEP_TOLERANCE
    }

    internal fun invalidProperty(element: String, detail: String): Nothing =
        throw NativeElementException(
            NativeElementException.Code.INVALID_PROPERTY,
            "$element $detail",
        )

    private fun <T> toggleFactory(create: (android.content.Context) -> T): NativeElementFactory
        where T : android.widget.CompoundButton = NativeElementFactory { context, properties ->
        var applying = false
        val control =
            create(context.context).apply {
                setOnCheckedChangeListener { _, checked ->
                    if (!applying)
                        context.events.emit(
                            NativeElementCatalog.Wire.CHANGE,
                            JSONObject().put(NativeElementCatalog.Wire.VALUE, checked),
                        )
                }
            }
        emitFocusEvents(control, context)
        instance(
            control,
            properties,
            saveState = {
                android.os.Bundle().apply {
                    putBoolean(NativeElementCatalog.Wire.VALUE, control.isChecked)
                }
            },
            restoreState = { state ->
                applying = true
                control.isChecked = state.getBoolean(NativeElementCatalog.Wire.VALUE)
                applying = false
            },
        ) { values ->
            applying = true
            control.text = values.string(NativeElementCatalog.Wire.LABEL)
            control.isChecked = values.boolean(NativeElementCatalog.Wire.VALUE)
            applyInputState(control, values)
            applying = false
        }
    }

    private fun sliderDefinition() =
        NativeElementCatalog.slider(
            NativeElementFactory { context, properties ->
                var applying = false
                val slider =
                    Slider(context.context).apply {
                        addOnChangeListener { _, value, fromUser ->
                            if (fromUser && !applying)
                                context.events.emit(
                                    NativeElementCatalog.Wire.CHANGE,
                                    JSONObject().put(NativeElementCatalog.Wire.VALUE, value),
                                )
                        }
                    }
                emitFocusEvents(slider, context)
                instance(
                    slider,
                    properties,
                    saveState = {
                        android.os.Bundle().apply {
                            putFloat(NativeElementCatalog.Wire.VALUE, slider.value)
                        }
                    },
                    restoreState = { state ->
                        applying = true
                        slider.value =
                            state
                                .getFloat(NativeElementCatalog.Wire.VALUE)
                                .coerceIn(slider.valueFrom, slider.valueTo)
                        applying = false
                    },
                ) { values ->
                    applying = true
                    val bounds = sliderBounds(NativeElementCatalog.Wire.SLIDER, values)
                    val value =
                        sliderValue(
                            NativeElementCatalog.Wire.SLIDER,
                            values.float(NativeElementCatalog.Wire.VALUE),
                            bounds,
                        )
                    slider.valueFrom = bounds.minimum
                    slider.valueTo = bounds.maximum
                    slider.stepSize = bounds.step
                    slider.value = value
                    applyInputState(slider, values)
                    applying = false
                }
            }
        )

    private fun radioGroupDefinition() =
        NativeElementCatalog.radioGroup(
            NativeElementFactory { context, properties ->
                var applying = false
                var currentValue = ""
                var optionsSignature: String? = null
                val group =
                    RadioGroup(context.context).apply {
                        orientation = RadioGroup.VERTICAL
                        setOnCheckedChangeListener { parent, checkedId ->
                            if (applying) return@setOnCheckedChangeListener
                            val selected =
                                parent.findViewById<RadioButton>(checkedId)?.tag as? String
                                    ?: return@setOnCheckedChangeListener
                            currentValue = selected
                            context.events.emit(
                                NativeElementCatalog.Wire.CHANGE,
                                JSONObject().put(NativeElementCatalog.Wire.VALUE, selected),
                            )
                        }
                    }
                emitFocusEvents(group, context)
                object : NativeElementInstance {
                        override val view: View = group

                        override fun update(properties: NativeProperties) {
                            applying = true
                            currentValue = properties.string(NativeElementCatalog.Wire.VALUE)
                            applyInputState(group, properties)
                            val options = properties.objects(NativeElementCatalog.Wire.OPTIONS)
                            val optionValues = options.map { option ->
                                option.optString(
                                    NativeElementCatalog.Wire.VALUE,
                                    option.optString(NativeElementCatalog.Wire.LABEL),
                                )
                            }
                            if (optionValues.any(String::isBlank)) {
                                invalidProperty(
                                    NativeElementCatalog.Wire.RADIO_GROUP,
                                    "option values cannot be blank",
                                )
                            }
                            if (optionValues.size != optionValues.toSet().size) {
                                invalidProperty(
                                    NativeElementCatalog.Wire.RADIO_GROUP,
                                    "option values must be unique",
                                )
                            }
                            val nextOptionsSignature = options.joinToString(separator = "\u0000")
                            if (nextOptionsSignature != optionsSignature) {
                                group.removeAllViews()
                                options.zip(optionValues).forEach { (option, value) ->
                                    group.addView(
                                        RadioButton(context.context).apply {
                                            id = View.generateViewId()
                                            tag = value
                                            text =
                                                option.optString(
                                                    NativeElementCatalog.Wire.LABEL,
                                                    value,
                                                )
                                            emitFocusEvents(this, context)
                                        }
                                    )
                                }
                                optionsSignature = nextOptionsSignature
                            }
                            group.children().filterIsInstance<RadioButton>().forEach { button ->
                                button.isEnabled = group.isEnabled
                                button.isChecked = button.tag == currentValue
                            }
                            applying = false
                        }

                        override fun saveState() =
                            android.os.Bundle().apply {
                                putString(NativeElementCatalog.Wire.VALUE, currentValue)
                            }

                        override fun restoreState(state: android.os.Bundle) {
                            val value = state.getString(NativeElementCatalog.Wire.VALUE) ?: return
                            currentValue = value
                            applying = true
                            group
                                .children()
                                .filterIsInstance<RadioButton>()
                                .firstOrNull { it.tag == value }
                                ?.isChecked = true
                            applying = false
                        }
                    }
                    .also { it.update(properties) }
            }
        )

    private fun rangeSliderDefinition() =
        NativeElementCatalog.rangeSlider(
            NativeElementFactory { context, properties ->
                var applying = false
                val slider =
                    RangeSlider(context.context).apply {
                        addOnChangeListener { control, _, fromUser ->
                            if (fromUser && !applying) {
                                val values = org.json.JSONArray()
                                control.values.forEach(values::put)
                                context.events.emit(
                                    NativeElementCatalog.Wire.CHANGE,
                                    JSONObject().put(NativeElementCatalog.Wire.VALUE, values),
                                )
                            }
                        }
                    }
                emitFocusEvents(slider, context)
                instance(
                    slider,
                    properties,
                    saveState = {
                        android.os.Bundle().apply {
                            putFloatArray(
                                NativeElementCatalog.Wire.VALUE,
                                slider.values.toFloatArray(),
                            )
                        }
                    },
                    restoreState = { state ->
                        applying = true
                        val restored =
                            state
                                .getFloatArray(NativeElementCatalog.Wire.VALUE)
                                ?.map { it.coerceIn(slider.valueFrom, slider.valueTo) }
                                ?.sorted()
                        if (!restored.isNullOrEmpty()) slider.values = restored
                        applying = false
                    },
                ) { values ->
                    applying = true
                    val bounds = sliderBounds(NativeElementCatalog.Wire.RANGE_SLIDER, values)
                    val selected = values.floats(NativeElementCatalog.Wire.VALUE)
                    if (selected.size != RANGE_VALUE_COUNT) {
                        invalidProperty(
                            NativeElementCatalog.Wire.RANGE_SLIDER,
                            "value must contain exactly two numbers",
                        )
                    }
                    slider.valueFrom = bounds.minimum
                    slider.valueTo = bounds.maximum
                    slider.stepSize = bounds.step
                    slider.values =
                        selected
                            .map {
                                sliderValue(NativeElementCatalog.Wire.RANGE_SLIDER, it, bounds)
                            }
                            .sorted()
                    applyInputState(slider, values)
                    applying = false
                }
            }
        )

    private fun datePickerDefinition() =
        NativeElementCatalog.datePicker(
            NativeElementFactory { context, properties ->
                var applying = false
                val picker =
                    DatePicker(context.context).apply {
                        init(year, month, dayOfMonth) { _, year, month, day ->
                            if (!applying)
                                context.events.emit(
                                    NativeElementCatalog.Wire.CHANGE,
                                    JSONObject()
                                        .put(
                                            NativeElementCatalog.Wire.VALUE,
                                            String.format(
                                                Locale.US,
                                                "%04d-%02d-%02d",
                                                year,
                                                month + 1,
                                                day,
                                            ),
                                        ),
                                )
                        }
                    }
                emitFocusEvents(picker, context)
                instance(
                    picker,
                    properties,
                    saveState = {
                        android.os.Bundle().apply {
                            putInt("year", picker.year)
                            putInt("month", picker.month)
                            putInt("day", picker.dayOfMonth)
                        }
                    },
                    restoreState = { state ->
                        applying = true
                        picker.updateDate(
                            state.getInt("year", picker.year),
                            state.getInt("month", picker.month),
                            state.getInt("day", picker.dayOfMonth),
                        )
                        applying = false
                    },
                ) { values ->
                    applying = true
                    val value = values.string(NativeElementCatalog.Wire.VALUE)
                    if (value.isNotEmpty()) {
                        val date =
                            runCatching { java.time.LocalDate.parse(value) }
                                .getOrElse {
                                    invalidProperty(
                                        NativeElementCatalog.Wire.DATE_PICKER,
                                        "value must use YYYY-MM-DD",
                                    )
                                }
                        picker.updateDate(date.year, date.monthValue - 1, date.dayOfMonth)
                    }
                    applyInputState(picker, values)
                    applying = false
                }
            }
        )

    private fun timePickerDefinition() =
        NativeElementCatalog.timePicker(
            NativeElementFactory { context, properties ->
                var applying = false
                val picker =
                    TimePicker(context.context).apply {
                        setIs24HourView(true)
                        setOnTimeChangedListener { _, hour, minute ->
                            if (!applying)
                                context.events.emit(
                                    NativeElementCatalog.Wire.CHANGE,
                                    JSONObject()
                                        .put(
                                            NativeElementCatalog.Wire.VALUE,
                                            String.format(Locale.US, "%02d:%02d", hour, minute),
                                        ),
                                )
                        }
                    }
                emitFocusEvents(picker, context)
                instance(
                    picker,
                    properties,
                    saveState = {
                        android.os.Bundle().apply {
                            putInt("hour", picker.hour)
                            putInt("minute", picker.minute)
                        }
                    },
                    restoreState = { state ->
                        applying = true
                        picker.hour = state.getInt("hour", picker.hour).coerceIn(0, LAST_HOUR)
                        picker.minute =
                            state.getInt("minute", picker.minute).coerceIn(0, LAST_MINUTE)
                        applying = false
                    },
                ) { values ->
                    applying = true
                    val value = values.string(NativeElementCatalog.Wire.VALUE)
                    if (value.isNotEmpty()) {
                        if (!value.matches(TIME_PATTERN)) {
                            invalidProperty(
                                NativeElementCatalog.Wire.TIME_PICKER,
                                "value must use HH:MM",
                            )
                        }
                        val time =
                            runCatching { java.time.LocalTime.parse(value) }
                                .getOrElse {
                                    invalidProperty(
                                        NativeElementCatalog.Wire.TIME_PICKER,
                                        "value must use HH:MM",
                                    )
                                }
                        picker.hour = time.hour
                        picker.minute = time.minute
                    }
                    applyInputState(picker, values)
                    applying = false
                }
            }
        )

    private fun filePickerDefinition() =
        NativeElementCatalog.filePicker(
            NativeElementFactory { context, properties ->
                var currentProperties = properties
                var disposed = false
                var pending = false
                val button = MaterialButton(context.context)
                emitFocusEvents(button, context)
                fun request() {
                    if (disposed || pending) return
                    val acceptedTypes =
                        currentProperties.stringList(NativeElementCatalog.Wire.ACCEPT)
                    context.events.emit(
                        NativeElementCatalog.Wire.REQUEST,
                        JSONObject()
                            .put(NativeElementCatalog.Wire.ACCEPT, acceptedTypes)
                            .put(
                                NativeElementCatalog.Wire.MULTIPLE,
                                currentProperties.boolean(NativeElementCatalog.Wire.MULTIPLE),
                            ),
                    )
                    val launcher = context.activityLauncher ?: return
                    val launched =
                        launcher.launch(
                            NativeFileSelection.intent(
                                acceptedTypes,
                                currentProperties.boolean(NativeElementCatalog.Wire.MULTIPLE),
                            )
                        ) result@{ resultCode, data ->
                            pending = false
                            if (disposed) return@result
                            if (resultCode != Activity.RESULT_OK || data == null) {
                                context.events.emit(NativeElementCatalog.Wire.CANCEL, null)
                                return@result
                            }
                            val result = NativeFileSelection.result(context.context, data)
                            val files = result.getJSONArray("files")
                            if (files.length() == 0) {
                                context.events.emit(NativeElementCatalog.Wire.CANCEL, null)
                            } else {
                                result.put(
                                    NativeElementCatalog.Wire.VALUE,
                                    if (
                                        currentProperties.boolean(
                                            NativeElementCatalog.Wire.MULTIPLE
                                        )
                                    ) {
                                        files
                                    } else {
                                        files.getJSONObject(0)
                                    },
                                )
                                context.events.emit(NativeElementCatalog.Wire.CHANGE, result)
                            }
                        }
                    pending = launched
                }
                button.setOnClickListener { request() }
                object : NativeElementInstance {
                        override val view: View = button

                        override fun update(properties: NativeProperties) {
                            currentProperties = properties
                            button.text =
                                properties.string(NativeElementCatalog.Wire.TEXT, "Choose file")
                            applyInputState(button, properties, button.text.toString())
                        }

                        override fun invoke(method: String, parameters: NativeProperties): Any? =
                            when (method) {
                                NativeElementCatalog.Wire.OPEN -> request()
                                else -> super.invoke(method, parameters)
                            }

                        override fun dispose() {
                            disposed = true
                            if (pending) context.activityLauncher?.cancel()
                            pending = false
                        }
                    }
                    .also { it.update(properties) }
            }
        )

    private fun rowDefinition() =
        NativeElementCatalog.row(
            childContainerFactory { context ->
                LinearLayout(context)
                    .apply { orientation = LinearLayout.HORIZONTAL }
                    .let { it to it }
            }
        )

    private fun columnDefinition() =
        NativeElementCatalog.column(
            childContainerFactory { context ->
                LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }.let { it to it }
            }
        )

    private fun boxDefinition() =
        NativeElementCatalog.box(
            childContainerFactory { context -> FrameLayout(context).let { it to it } }
        )

    private fun surfaceDefinition() =
        NativeElementCatalog.surface(
            childContainerFactory { context -> FrameLayout(context).let { it to it } }
        )

    private fun scrollDefinition() =
        NativeElementCatalog.scroll(
            childContainerFactory(
                fillHeight = true,
                create = { context ->
                    val content =
                        LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
                    NestedScrollView(context).apply {
                        isFillViewport = true
                        isNestedScrollingEnabled = true
                        addView(content)
                    } to content
                },
                configure = { context, root, _, _ ->
                    (root as NestedScrollView).setOnScrollChangeListener { _, x, y, oldX, oldY ->
                        context.events.emit(
                            NativeElementCatalog.Wire.SCROLL,
                            JSONObject()
                                .put("x", x)
                                .put("y", y)
                                .put("oldX", oldX)
                                .put("oldY", oldY),
                        )
                    }
                },
            )
        )

    private fun scaffoldDefinition() =
        NativeElementCatalog.scaffold(
            childContainerFactory(
                fillHeight = true,
                configureChildren = { children ->
                    children.forEach { child ->
                        val fixed =
                            child.name == NativeElementCatalog.Wire.APP_BAR ||
                                child.name == NativeElementCatalog.Wire.BOTTOM_BAR
                        val layout =
                            child.view.layoutParams as? LinearLayout.LayoutParams
                                ?: LinearLayout.LayoutParams(child.view.layoutParams)
                        layout.width = ViewGroup.LayoutParams.MATCH_PARENT
                        layout.height = if (fixed) ViewGroup.LayoutParams.WRAP_CONTENT else 0
                        layout.weight = if (fixed) 0f else 1f
                        child.view.layoutParams = layout
                    }
                },
            ) { context ->
                LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }.let { it to it }
            }
        )

    private fun appBarDefinition() =
        NativeElementCatalog.appBar(
            childContainerFactory { context ->
                LinearLayout(context)
                    .apply { orientation = LinearLayout.HORIZONTAL }
                    .let { it to it }
            }
        )

    private fun bottomBarDefinition() =
        NativeElementCatalog.bottomBar(
            NativeElementFactory { context, properties ->
                val navigation =
                    BottomNavigationView(context.context).apply {
                        labelVisibilityMode = NavigationBarView.LABEL_VISIBILITY_LABELED
                        isItemHorizontalTranslationEnabled = false
                    }
                var applying = false
                var itemSignature = ""
                var keysById = emptyMap<Int, String>()

                navigation.setOnItemSelectedListener { item ->
                    val key = keysById[item.itemId] ?: return@setOnItemSelectedListener false
                    if (!applying) {
                        context.events.emit(
                            NativeElementCatalog.Wire.SELECT,
                            JSONObject().put("key", key).put("index", item.order),
                        )
                    }
                    true
                }
                navigation.setOnItemReselectedListener { item ->
                    if (!applying) {
                        keysById[item.itemId]?.let { key ->
                            context.events.emit(
                                NativeElementCatalog.Wire.RESELECT,
                                JSONObject().put("key", key).put("index", item.order),
                            )
                        }
                    }
                }

                instance(navigation, properties) { values ->
                    configureContainer(navigation, values)
                    navigation.contentDescription =
                        values.string(NativeElementCatalog.Wire.LABEL, "Bottom navigation")
                    navigation.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    val items = values.objects(NativeElementCatalog.Wire.ITEMS)
                    if (items.size > MAX_BOTTOM_BAR_ITEMS) {
                        throw NativeElementException(
                            NativeElementException.Code.INVALID_PROPERTY,
                            "bottom-bar supports at most $MAX_BOTTOM_BAR_ITEMS items",
                        )
                    }
                    val keys = items.map { it.optString("key") }
                    if (keys.any(String::isBlank) || keys.toSet().size != keys.size) {
                        throw NativeElementException(
                            NativeElementException.Code.INVALID_PROPERTY,
                            "bottom-bar items require unique non-empty keys",
                        )
                    }
                    if (items.any { it.optString(NativeElementCatalog.Wire.LABEL).isBlank() }) {
                        throw NativeElementException(
                            NativeElementException.Code.INVALID_PROPERTY,
                            "bottom-bar items require non-empty labels",
                        )
                    }

                    val nextSignature =
                        items.joinToString(separator = "\u0000", transform = JSONObject::toString)
                    applying = true
                    try {
                        if (nextSignature != itemSignature) {
                            navigation.menu.clear()
                            keysById = buildMap {
                                items.forEachIndexed { index, item ->
                                    val id = View.generateViewId()
                                    val key = item.getString("key")
                                    put(id, key)
                                    navigation.menu
                                        .add(
                                            0,
                                            id,
                                            index,
                                            item.getString(NativeElementCatalog.Wire.LABEL),
                                        )
                                        .apply {
                                            isEnabled =
                                                item.optBoolean(
                                                    NativeElementCatalog.Wire.ENABLED,
                                                    true,
                                                )
                                            setIcon(
                                                drawable(
                                                    context.context,
                                                    item.optString(NativeElementCatalog.Wire.ICON),
                                                )
                                            )
                                        }
                                }
                            }
                            itemSignature = nextSignature
                        }
                        val selectedKey =
                            values.string(
                                NativeElementCatalog.Wire.SELECTED_KEY,
                                keys.firstOrNull().orEmpty(),
                            )
                        keysById.entries
                            .find { it.value == selectedKey }
                            ?.key
                            ?.let { selectedId ->
                                if (navigation.selectedItemId != selectedId) {
                                    navigation.selectedItemId = selectedId
                                }
                            }
                    } finally {
                        applying = false
                    }
                }
            }
        )

    private fun navigationRailDefinition() =
        NativeElementCatalog.navigationRail(
            childContainerFactory { context ->
                LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }.let { it to it }
            }
        )

    private fun tabsDefinition() =
        NativeElementCatalog.tabs(
            NativeElementFactory { context, properties ->
                val root =
                    LinearLayout(context.context).apply { orientation = LinearLayout.VERTICAL }
                val tabs = TabLayout(context.context)
                val content = FrameLayout(context.context)
                root.addView(tabs)
                root.addView(
                    content,
                    LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        0,
                        1f,
                    ),
                )
                val children = NativeChildStore(registry, context, content)
                var ordered = emptyList<NativeChildStore.Child>()
                var selectedKey = ""
                var updating = false

                fun show(index: Int) {
                    content.removeAllViews()
                    ordered.getOrNull(index)?.view?.let { view ->
                        (view.parent as? ViewGroup)?.removeView(view)
                        content.addView(
                            view,
                            FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT,
                            ),
                        )
                        selectedKey = ordered[index].key
                    }
                }

                val listener =
                    object : TabLayout.OnTabSelectedListener {
                        override fun onTabSelected(tab: TabLayout.Tab) {
                            show(tab.position)
                            if (!updating) {
                                context.events.emit(
                                    NativeElementCatalog.Wire.CHANGE,
                                    JSONObject()
                                        .put(NativeElementCatalog.Wire.VALUE, selectedKey)
                                        .put("index", tab.position),
                                )
                            }
                        }

                        override fun onTabUnselected(tab: TabLayout.Tab) = Unit

                        override fun onTabReselected(tab: TabLayout.Tab) = Unit
                    }
                tabs.addOnTabSelectedListener(listener)

                fun update(values: NativeProperties) {
                    ordered = children.reconcile(values)
                    val descriptors =
                        values
                            .objects(NativeElementCatalog.Wire.CHILDREN)
                            .mapIndexed { index, descriptor ->
                                descriptor.optString("key").ifEmpty { index.toString() } to
                                    descriptor
                            }
                            .toMap()
                    val requested = values.string(NativeElementCatalog.Wire.VALUE)
                    val selectedIndex =
                        ordered.indexOfFirst { it.key == requested }.takeIf { it >= 0 }
                            ?: ordered.indexOfFirst { it.key == selectedKey }.takeIf { it >= 0 }
                            ?: 0
                    updating = true
                    tabs.removeAllTabs()
                    ordered.forEach { child ->
                        val descriptor = checkNotNull(descriptors[child.key])
                        val childProperties = descriptor.optJSONObject("props") ?: JSONObject()
                        val label =
                            childProperties
                                .optString(NativeElementCatalog.Wire.LABEL)
                                .ifEmpty {
                                    childProperties.optString(NativeElementCatalog.Wire.TEXT)
                                }
                                .ifEmpty { child.key }
                        tabs.addTab(tabs.newTab().setText(label).setTag(child.key), false)
                    }
                    val enabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    for (index in 0 until tabs.tabCount) {
                        tabs.getTabAt(index)?.view?.isEnabled = enabled
                    }
                    tabs.getTabAt(selectedIndex)?.select()
                    show(selectedIndex)
                    updating = false
                    tabs.isEnabled = enabled
                    configureContainer(root, values, fillHeight = true)
                }

                object : NativeElementInstance {
                        override val view: View = root

                        override fun update(properties: NativeProperties) = update(properties)

                        override fun saveState() =
                            android.os.Bundle().apply {
                                putString(NativeElementCatalog.Wire.SELECTED_KEY, selectedKey)
                                children.saveState(this)
                            }

                        override fun restoreState(state: android.os.Bundle) {
                            children.restoreState(state)
                            val index = ordered.indexOfFirst {
                                it.key == state.getString(NativeElementCatalog.Wire.SELECTED_KEY)
                            }
                            if (index >= 0) {
                                updating = true
                                tabs.getTabAt(index)?.select()
                                show(index)
                                updating = false
                            }
                        }

                        override fun invoke(method: String, parameters: NativeProperties): Any? {
                            if (method != NativeElementCatalog.Wire.SCROLL_TO) {
                                return super.invoke(method, parameters)
                            }
                            val index = ordered.indexOfFirst {
                                it.key == parameters.string(NativeElementCatalog.Wire.VALUE)
                            }
                            if (index >= 0) tabs.getTabAt(index)?.select()
                            return null
                        }

                        override fun dispose() {
                            tabs.removeOnTabSelectedListener(listener)
                            children.dispose()
                            root.removeAllViews()
                        }
                    }
                    .also { it.update(properties) }
            }
        )

    private fun pagerDefinition() =
        NativeElementCatalog.pager(
            NativeElementFactory { context, properties ->
                val pager = ViewPager2(context.context)
                val children = NativeChildStore(registry, context, pager)
                var ordered = emptyList<NativeChildStore.Child>()
                val stableIds = mutableMapOf<String, Long>()
                var nextId = 0L
                var programmaticSelection: Int? = null

                class Holder(val container: FrameLayout) : RecyclerView.ViewHolder(container)

                val adapter =
                    object : RecyclerView.Adapter<Holder>() {
                        init {
                            setHasStableIds(true)
                        }

                        override fun getItemCount() = ordered.size

                        override fun getItemId(position: Int) =
                            stableIds.getValue(ordered[position].key)

                        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
                            Holder(
                                FrameLayout(parent.context).apply {
                                    layoutParams =
                                        ViewGroup.LayoutParams(
                                            ViewGroup.LayoutParams.MATCH_PARENT,
                                            ViewGroup.LayoutParams.MATCH_PARENT,
                                        )
                                }
                            )

                        override fun onBindViewHolder(holder: Holder, position: Int) {
                            val child = ordered[position].view
                            (child.parent as? ViewGroup)?.removeView(child)
                            holder.container.removeAllViews()
                            holder.container.addView(
                                child,
                                FrameLayout.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                ),
                            )
                        }

                        override fun onViewRecycled(holder: Holder) {
                            holder.container.removeAllViews()
                        }
                    }
                pager.adapter = adapter
                val callback =
                    object : ViewPager2.OnPageChangeCallback() {
                        override fun onPageSelected(position: Int) {
                            if (programmaticSelection == position) {
                                programmaticSelection = null
                                return
                            }
                            context.events.emit(
                                NativeElementCatalog.Wire.CHANGE,
                                JSONObject()
                                    .put(NativeElementCatalog.Wire.VALUE, position)
                                    .put("key", ordered.getOrNull(position)?.key),
                            )
                        }
                    }
                pager.registerOnPageChangeCallback(callback)

                fun select(index: Int, smooth: Boolean) {
                    if (ordered.isEmpty()) return
                    val bounded = index.coerceIn(0, ordered.lastIndex)
                    if (pager.currentItem != bounded) {
                        programmaticSelection = bounded
                        pager.setCurrentItem(bounded, smooth)
                    }
                }

                fun update(values: NativeProperties) {
                    ordered = children.reconcile(values)
                    ordered.forEach { stableIds.getOrPut(it.key) { nextId++ } }
                    stableIds.keys.retainAll(ordered.mapTo(mutableSetOf()) { it.key })
                    adapter.notifyDataSetChanged()
                    pager.isUserInputEnabled =
                        values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    configureContainer(pager, values, fillHeight = true)
                    select(values.integer(NativeElementCatalog.Wire.VALUE), false)
                }

                object : NativeElementInstance {
                        override val view: View = pager

                        override fun update(properties: NativeProperties) = update(properties)

                        override fun saveState() =
                            android.os.Bundle().apply {
                                putInt("selectedIndex", pager.currentItem)
                                children.saveState(this)
                            }

                        override fun restoreState(state: android.os.Bundle) {
                            children.restoreState(state)
                            select(state.getInt("selectedIndex"), false)
                        }

                        override fun invoke(method: String, parameters: NativeProperties): Any? {
                            if (method != NativeElementCatalog.Wire.SCROLL_TO) {
                                return super.invoke(method, parameters)
                            }
                            select(parameters.integer(NativeElementCatalog.Wire.VALUE), true)
                            return null
                        }

                        override fun dispose() {
                            pager.unregisterOnPageChangeCallback(callback)
                            pager.adapter = null
                            children.dispose()
                        }
                    }
                    .also { it.update(properties) }
            }
        )

    private fun listDefinition() =
        NativeElementCatalog.list(
            recyclingNativeCollectionFactory(
                registry = { registry },
                grid = false,
                configure = { view, values ->
                    configureContainer(view, values, fillHeight = true)
                },
            )
        )

    private fun gridDefinition() =
        NativeElementCatalog.grid(
            recyclingNativeCollectionFactory(
                registry = { registry },
                grid = true,
                configure = { view, values ->
                    configureContainer(view, values, fillHeight = true)
                },
            )
        )

    private fun listItemDefinition() =
        NativeElementCatalog.listItem(
            NativeElementFactory { context, properties ->
                val content =
                    LinearLayout(context.context).apply {
                        orientation = LinearLayout.VERTICAL
                        isClickable = true
                        isFocusable = true
                        val padding = (16 * resources.displayMetrics.density).toInt()
                        setPadding(padding, padding, padding, padding)
                        setOnClickListener {
                            context.events.emit(NativeElementCatalog.Wire.CLICK, null)
                        }
                        setOnLongClickListener {
                            context.events.emit(NativeElementCatalog.Wire.LONG_CLICK, null)
                            true
                        }
                    }
                val headline = TextView(context.context).apply { textSize = 16f }
                val supporting = TextView(context.context).apply { textSize = 14f }
                content.addView(headline)
                content.addView(supporting)
                instance(content, properties) { values ->
                    headline.text = values.string(NativeElementCatalog.Wire.TEXT)
                    supporting.text = values.string(NativeElementCatalog.Wire.SUPPORTING_TEXT)
                    supporting.visibility =
                        if (supporting.text.isEmpty()) View.GONE else View.VISIBLE
                    content.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    content.isSelected = values.boolean(NativeElementCatalog.Wire.SELECTED)
                    content.contentDescription =
                        values.string(NativeElementCatalog.Wire.LABEL, headline.text.toString())
                }
            }
        )

    private fun swipeActionDefinition() =
        NativeElementCatalog.swipeAction(
            NativeElementFactory { context, properties ->
                val button =
                    MaterialButton(context.context).apply {
                        setOnClickListener {
                            context.events.emit(NativeElementCatalog.Wire.ACTION, null)
                        }
                    }
                instance(button, properties) { values ->
                    button.text = values.string(NativeElementCatalog.Wire.TEXT, "Action")
                    button.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    button.contentDescription =
                        values.string(NativeElementCatalog.Wire.LABEL, button.text.toString())
                }
            }
        )

    private fun pullToRefreshDefinition() =
        NativeElementCatalog.pullToRefresh(
            childContainerFactory(
                create = { context ->
                    val content =
                        LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
                    SwipeRefreshLayout(context).apply { addView(content) } to content
                },
                configure = { context, root, _, values ->
                    (root as SwipeRefreshLayout).apply {
                        isRefreshing = values.boolean(NativeElementCatalog.Wire.REFRESHING)
                        isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                        setOnRefreshListener {
                            context.events.emit(NativeElementCatalog.Wire.REFRESH, null)
                        }
                    }
                },
            )
        )

    private fun childContainerFactory(
        configure: (NativeElementContext, View, ViewGroup, NativeProperties) -> Unit =
            { _, _, _, _ ->
            },
        configureChildren: (List<NativeChildStore.Child>) -> Unit = {},
        fillHeight: Boolean = false,
        create: (android.content.Context) -> Pair<View, ViewGroup>,
    ) = NativeElementFactory { context, properties ->
        val (root, host) = create(context.context)
        val children = NativeChildStore(registry, context, host)

        fun reconcile(values: NativeProperties) {
            val ordered = children.reconcile(values)
            ordered.map(NativeChildStore.Child::view).forEachIndexed { index, view ->
                if (view.parent !== host || host.indexOfChild(view) != index) {
                    (view.parent as? ViewGroup)?.removeView(view)
                    host.addView(view, index.coerceAtMost(host.childCount))
                }
            }
            configureContainer(root, values, fillHeight)
            configureChildLayout(host, values)
            configureChildren(ordered)
            configure(context, root, host, values)
        }

        object : NativeElementInstance {
                override val view: View = root

                override fun update(properties: NativeProperties) = reconcile(properties)

                override fun saveState() =
                    android.os.Bundle().apply {
                        putInt("scrollX", root.scrollX)
                        putInt("scrollY", root.scrollY)
                        children.saveState(this)
                    }

                override fun restoreState(state: android.os.Bundle) {
                    children.restoreState(state)
                    root.post {
                        root.scrollTo(state.getInt("scrollX"), state.getInt("scrollY"))
                    }
                }

                override fun invoke(method: String, parameters: NativeProperties): Any? {
                    when (method) {
                        NativeElementCatalog.Wire.SCROLL_TO ->
                            when (root) {
                                is NestedScrollView ->
                                    root.smoothScrollTo(
                                        parameters.integer("x"),
                                        parameters.integer("y"),
                                    )
                                is HorizontalScrollView ->
                                    root.smoothScrollTo(
                                        parameters.integer("x"),
                                        parameters.integer("y"),
                                    )
                                else -> return super.invoke(method, parameters)
                            }
                        NativeElementCatalog.Wire.SCROLL_TO_START ->
                            when (root) {
                                is NestedScrollView -> root.smoothScrollTo(0, 0)
                                is HorizontalScrollView -> root.smoothScrollTo(0, 0)
                                else -> return super.invoke(method, parameters)
                            }
                        NativeElementCatalog.Wire.SCROLL_TO_END ->
                            when (root) {
                                is NestedScrollView -> root.smoothScrollTo(0, host.height)
                                is HorizontalScrollView -> root.smoothScrollTo(host.width, 0)
                                else -> return super.invoke(method, parameters)
                            }
                        else -> return super.invoke(method, parameters)
                    }
                    return null
                }

                override fun dispose() {
                    children.dispose()
                    host.removeAllViews()
                }
            }
            .also { it.update(properties) }
    }

    internal fun configureContainer(
        root: View,
        values: NativeProperties,
        fillHeight: Boolean = false,
    ) {
        val density = root.resources.displayMetrics.density
        val width = layoutDimension(values, NativeElementCatalog.Wire.WIDTH, density)
        val height = layoutDimension(values, NativeElementCatalog.Wire.HEIGHT, density)
        val minimumWidth =
            layoutDimension(values, NativeElementCatalog.Wire.MIN_WIDTH, density) ?: 0
        val minimumHeight =
            layoutDimension(values, NativeElementCatalog.Wire.MIN_HEIGHT, density) ?: 0
        if (width != null && minimumWidth > width) {
            invalidLayoutProperty(NativeElementCatalog.Wire.MIN_WIDTH, minimumWidth)
        }
        if (height != null && minimumHeight > height) {
            invalidLayoutProperty(NativeElementCatalog.Wire.MIN_HEIGHT, minimumHeight)
        }
        val layoutParams =
            root.layoutParams
                ?: ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    if (fillHeight) {
                        ViewGroup.LayoutParams.MATCH_PARENT
                    } else {
                        ViewGroup.LayoutParams.WRAP_CONTENT
                    },
                )
        layoutParams.width = width ?: ViewGroup.LayoutParams.MATCH_PARENT
        layoutParams.height =
            height
                ?: if (fillHeight) {
                    ViewGroup.LayoutParams.MATCH_PARENT
                } else {
                    ViewGroup.LayoutParams.WRAP_CONTENT
                }
        root.layoutParams = layoutParams
        root.minimumWidth = minimumWidth
        root.minimumHeight = minimumHeight
        root.layoutDirection = root.resources.configuration.layoutDirection
        root.textDirection = View.TEXT_DIRECTION_LOCALE
        val padding =
            (values.float(NativeElementCatalog.Wire.PADDING) * density).toInt().coerceAtLeast(0)
        if (values.boolean(NativeElementCatalog.Wire.SAFE_AREA, false)) {
            ViewCompat.setOnApplyWindowInsetsListener(root) { view, windowInsets ->
                val insets =
                    windowInsets.getInsets(
                        WindowInsetsCompat.Type.systemBars() or
                            WindowInsetsCompat.Type.displayCutout()
                    )
                view.setPadding(
                    padding + insets.left,
                    padding + insets.top,
                    padding + insets.right,
                    padding + insets.bottom,
                )
                windowInsets
            }
            ViewCompat.requestApplyInsets(root)
        } else {
            ViewCompat.setOnApplyWindowInsetsListener(root, null)
            root.setPadding(padding, padding, padding, padding)
        }
        root.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
        root.contentDescription = values.string(NativeElementCatalog.Wire.LABEL)
        if (values.has(NativeElementCatalog.Wire.BACKGROUND_COLOR)) {
            root.setBackgroundColor(
                color(
                    values.string(NativeElementCatalog.Wire.BACKGROUND_COLOR),
                    Color.TRANSPARENT,
                )
            )
        }
    }

    private fun textDefinition() =
        NativeElementCatalog.text(
            NativeElementFactory { context, properties ->
                val text = MaterialTextView(context.context)
                instance(text, properties) { values ->
                    text.text = values.string(NativeElementCatalog.Wire.TEXT)
                    text.textSize =
                        values.float(NativeElementCatalog.Wire.TEXT_SIZE, DEFAULT_TEXT_SIZE_SP)
                    text.maxLines =
                        values
                            .integer(NativeElementCatalog.Wire.MAX_LINES, Int.MAX_VALUE)
                            .coerceAtLeast(1)
                    if (values.has(NativeElementCatalog.Wire.COLOR))
                        text.setTextColor(
                            color(values.string(NativeElementCatalog.Wire.COLOR), Color.BLACK)
                        )
                }
            }
        )

    private fun buttonDefinition() =
        NativeElementCatalog.button(
            NativeElementFactory { context, properties ->
                val button =
                    MaterialButton(context.context).apply {
                        setOnClickListener {
                            context.events.emit(NativeElementCatalog.Wire.CLICK, null)
                        }
                        setOnLongClickListener {
                            context.events.emit(NativeElementCatalog.Wire.LONG_CLICK, null)
                            true
                        }
                    }
                emitFocusEvents(button, context)
                instance(button, properties) { values ->
                    val loading = values.boolean(NativeElementCatalog.Wire.LOADING)
                    button.text =
                        if (loading)
                            values.string(NativeElementCatalog.Wire.LOADING_TEXT, "Loading")
                        else values.string(NativeElementCatalog.Wire.TEXT, "Button")
                    button.isEnabled =
                        values.boolean(NativeElementCatalog.Wire.ENABLED, true) && !loading
                    button.alpha = if (button.isEnabled) 1f else DISABLED_ALPHA
                }
            }
        )

    private fun iconDefinition() =
        NativeElementCatalog.icon(
            NativeElementFactory { context, properties ->
                val icon = ShapeableImageView(context.context)
                instance(icon, properties) { values ->
                    icon.setImageResource(
                        drawable(
                            context.context,
                            values.string(NativeElementCatalog.Wire.RESOURCE, "ic_menu_help"),
                        )
                    )
                    icon.contentDescription =
                        values.string(NativeElementCatalog.Wire.CONTENT_DESCRIPTION)
                    if (values.has(NativeElementCatalog.Wire.TINT))
                        icon.setColorFilter(
                            color(values.string(NativeElementCatalog.Wire.TINT), Color.BLACK)
                        )
                    else icon.clearColorFilter()
                }
            }
        )

    private fun dividerDefinition() =
        NativeElementCatalog.divider(
            NativeElementFactory { context, properties ->
                val divider = MaterialDivider(context.context)
                instance(divider, properties) { values ->
                    divider.contentDescription = values.string(NativeElementCatalog.Wire.LABEL)
                    val thickness =
                        (values.float(NativeElementCatalog.Wire.THICKNESS, 1f) *
                                context.context.resources.displayMetrics.density)
                            .toInt()
                            .coerceAtLeast(1)
                    divider.dividerColor =
                        color(
                            values.string(NativeElementCatalog.Wire.COLOR, "#1f000000"),
                            Color.LTGRAY,
                        )
                    divider.dividerThickness = thickness
                }
            }
        )

    private fun badgeDefinition() =
        NativeElementCatalog.badge(
            NativeElementFactory { context, properties ->
                val density = context.context.resources.displayMetrics.density
                val badge =
                    MaterialTextView(context.context).apply {
                        gravity = Gravity.CENTER
                        setPadding(
                            (6 * density).toInt(),
                            (2 * density).toInt(),
                            (6 * density).toInt(),
                            (2 * density).toInt(),
                        )
                    }
                instance(badge, properties) { values ->
                    badge.text = values.string(NativeElementCatalog.Wire.TEXT)
                    badge.setTextColor(
                        color(
                            values.string(NativeElementCatalog.Wire.TEXT_COLOR, "#ffffff"),
                            Color.WHITE,
                        )
                    )
                    badge.background =
                        GradientDrawable().apply {
                            setColor(
                                color(
                                    values.string(
                                        NativeElementCatalog.Wire.BACKGROUND_COLOR,
                                        "#b3261e",
                                    ),
                                    Color.RED,
                                )
                            )
                            cornerRadius = OUTLINE_RADIUS_DP * density
                        }
                }
            }
        )

    private fun chipDefinition() =
        NativeElementCatalog.chip(
            NativeElementFactory { context, properties ->
                var applying = false
                var directionInitialized = false
                val chip =
                    Chip(context.context).apply {
                        layoutParams =
                            ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.WRAP_CONTENT,
                                ViewGroup.LayoutParams.WRAP_CONTENT,
                            )
                        setOnClickListener {
                            context.events.emit(NativeElementCatalog.Wire.CLICK, null)
                        }
                        setOnCheckedChangeListener { _, checked ->
                            if (!applying)
                                context.events.emit(
                                    NativeElementCatalog.Wire.CHANGE,
                                    JSONObject().put(NativeElementCatalog.Wire.CHECKED, checked),
                                )
                        }
                    }
                emitFocusEvents(chip, context)
                instance(chip, properties) { values ->
                    applying = true
                    chip.text = values.string(NativeElementCatalog.Wire.TEXT, "Chip")
                    if (!directionInitialized) {
                        val direction = context.context.resources.configuration.layoutDirection
                        if (direction == View.LAYOUT_DIRECTION_RTL) {
                            chip.layoutDirection = View.LAYOUT_DIRECTION_LTR
                        }
                        chip.layoutDirection = direction
                        directionInitialized = true
                    }
                    chip.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    chip.isCheckable = values.boolean(NativeElementCatalog.Wire.CHECKABLE)
                    chip.isChecked = values.boolean(NativeElementCatalog.Wire.CHECKED)
                    applying = false
                }
            }
        )

    private fun progressDefinition() =
        NativeElementCatalog.progress(
            NativeElementFactory { context, properties ->
                val progress = LinearProgressIndicator(context.context)
                instance(progress, properties) { values ->
                    progress.contentDescription =
                        values.string(NativeElementCatalog.Wire.LABEL, "Progress")
                    progress.max =
                        values
                            .integer(NativeElementCatalog.Wire.MAX, DEFAULT_PROGRESS_MAX)
                            .coerceAtLeast(1)
                    progress.progress =
                        values.integer(NativeElementCatalog.Wire.VALUE).coerceIn(0, progress.max)
                    progress.isIndeterminate =
                        values.boolean(NativeElementCatalog.Wire.INDETERMINATE)
                }
            }
        )

    private fun loadingIndicatorDefinition() =
        NativeElementCatalog.loadingIndicator(
            NativeElementFactory { context, properties ->
                val progress = CircularProgressIndicator(context.context)
                instance(progress, properties) { values ->
                    progress.contentDescription =
                        values.string(NativeElementCatalog.Wire.LABEL, "Loading")
                    progress.visibility =
                        if (values.boolean(NativeElementCatalog.Wire.VISIBLE, true)) View.VISIBLE
                        else View.GONE
                }
            }
        )

    private fun floatingActionButtonDefinition() =
        NativeElementCatalog.floatingActionButton(
            NativeElementFactory { context, properties ->
                val button =
                    FloatingActionButton(context.context).apply {
                        setOnClickListener {
                            context.events.emit(NativeElementCatalog.Wire.CLICK, null)
                        }
                        setOnLongClickListener {
                            context.events.emit(NativeElementCatalog.Wire.LONG_CLICK, null)
                            true
                        }
                    }
                emitFocusEvents(button, context)
                instance(button, properties) { values ->
                    button.setImageResource(
                        drawable(
                            context.context,
                            values.string(NativeElementCatalog.Wire.RESOURCE, "ic_input_add"),
                        )
                    )
                    button.contentDescription =
                        values.string(NativeElementCatalog.Wire.CONTENT_DESCRIPTION, "Action")
                    button.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    button.alpha = if (button.isEnabled) 1f else DISABLED_ALPHA
                }
            }
        )

    private fun cardDefinition() =
        NativeElementCatalog.card(
            NativeElementFactory { context, properties ->
                val density = context.context.resources.displayMetrics.density
                val content =
                    LinearLayout(context.context).apply {
                        orientation = LinearLayout.VERTICAL
                        gravity = Gravity.CENTER_VERTICAL
                        setPadding(
                            (16 * density).toInt(),
                            (12 * density).toInt(),
                            (16 * density).toInt(),
                            (12 * density).toInt(),
                        )
                    }
                val card =
                    MaterialCardView(context.context).apply {
                        isClickable = true
                        isFocusable = true
                        minimumHeight = (48 * density).toInt()
                        addView(content)
                        setOnClickListener {
                            context.events.emit(NativeElementCatalog.Wire.CLICK, null)
                        }
                        setOnLongClickListener {
                            context.events.emit(NativeElementCatalog.Wire.LONG_CLICK, null)
                            true
                        }
                    }
                emitFocusEvents(card, context)
                val title = TextView(context.context).apply { textSize = 18f }
                val body = TextView(context.context).apply { textSize = 14f }
                content.addView(title)
                content.addView(body)

                object : NativeElementInstance {
                        override val view: View = card

                        override fun update(properties: NativeProperties) {
                            title.text =
                                properties.string(NativeElementCatalog.Wire.TITLE, "Native card")
                            body.text = properties.string(NativeElementCatalog.Wire.TEXT)
                            body.visibility = if (body.text.isEmpty()) View.GONE else View.VISIBLE
                            card.contentDescription =
                                listOfNotNull(
                                        title.text.toString().takeIf(String::isNotBlank),
                                        body.text.toString().takeIf(String::isNotBlank),
                                    )
                                    .joinToString(". ")
                            card.isEnabled =
                                properties.boolean(NativeElementCatalog.Wire.ENABLED, true)
                            card.alpha = if (card.isEnabled) 1f else DISABLED_ALPHA
                        }
                    }
                    .also { it.update(properties) }
            }
        )

    private fun imageDefinition() = NativeElementCatalog.image(imageFactory())

    internal fun imageFactory(
        load: suspend (android.content.Context, String) -> android.graphics.Bitmap? = ::loadBitmap,
        workerDispatcher: CoroutineDispatcher = Dispatchers.IO,
        uiDispatcher: CoroutineDispatcher = Dispatchers.Main,
    ) = NativeElementFactory { context, properties ->
        val density = context.context.resources.displayMetrics.density
        var source: String? = null
        val image =
            ShapeableImageView(context.context).apply {
                scaleType = ImageView.ScaleType.CENTER_CROP
                minimumHeight = (120 * density).toInt()
                minimumWidth = (120 * density).toInt()
                isClickable = true
                isFocusable = true
                setOnClickListener {
                    context.events.emit(
                        NativeElementCatalog.Wire.CLICK,
                        JSONObject().put(NativeElementCatalog.Wire.SRC, source.orEmpty()),
                    )
                }
                setOnLongClickListener {
                    context.events.emit(
                        NativeElementCatalog.Wire.LONG_CLICK,
                        JSONObject().put(NativeElementCatalog.Wire.SRC, source.orEmpty()),
                    )
                    true
                }
                onFocusChangeListener = View.OnFocusChangeListener { _, focused ->
                    context.events.emit(
                        if (focused) {
                            NativeElementCatalog.Wire.FOCUS
                        } else {
                            NativeElementCatalog.Wire.BLUR
                        },
                        JSONObject().put(NativeElementCatalog.Wire.SRC, source.orEmpty()),
                    )
                }
            }
        val scope = CoroutineScope(SupervisorJob() + workerDispatcher)
        var request: kotlinx.coroutines.Job? = null
        var disposed = false
        object : NativeElementInstance {
                override val view: View = image

                override fun update(properties: NativeProperties) {
                    configureContainer(image, properties)
                    image.alpha = if (image.isEnabled) 1f else DISABLED_ALPHA
                    image.contentDescription =
                        properties.string(
                            NativeElementCatalog.Wire.CONTENT_DESCRIPTION,
                            "Native image",
                        )
                    image.scaleType =
                        when (
                            properties.string(
                                NativeElementCatalog.Wire.CONTENT_SCALE,
                                "crop",
                            )
                        ) {
                            "fit" -> ImageView.ScaleType.FIT_CENTER
                            "inside" -> ImageView.ScaleType.CENTER_INSIDE
                            "fill" -> ImageView.ScaleType.FIT_XY
                            else -> ImageView.ScaleType.CENTER_CROP
                        }
                    val nextSource = properties.string(NativeElementCatalog.Wire.SRC)
                    if (nextSource == source) return
                    source = nextSource
                    request?.cancel()
                    image.setImageDrawable(null)
                    image.setBackgroundColor(
                        color(
                            properties.string(
                                NativeElementCatalog.Wire.PLACEHOLDER_COLOR,
                                "#607d8b",
                            ),
                            Color.GRAY,
                        )
                    )
                    if (nextSource.isBlank()) return
                    imageCache.get(nextSource)?.let { bitmap ->
                        image.setBackgroundColor(Color.TRANSPARENT)
                        image.setImageBitmap(bitmap)
                        context.events.emit(
                            NativeElementCatalog.Wire.LOAD,
                            JSONObject().put(NativeElementCatalog.Wire.SRC, nextSource),
                        )
                        return
                    }
                    val errorColor =
                        properties.string(NativeElementCatalog.Wire.ERROR_COLOR, "#b3261e")
                    request = scope.launch {
                        val bitmap = load(context.context, nextSource)
                        withContext(uiDispatcher) {
                            if (disposed || nextSource != source) return@withContext
                            if (bitmap != null) {
                                imageCache.put(nextSource, bitmap)
                                image.setBackgroundColor(Color.TRANSPARENT)
                                image.setImageBitmap(bitmap)
                                context.events.emit(
                                    NativeElementCatalog.Wire.LOAD,
                                    JSONObject().put(NativeElementCatalog.Wire.SRC, nextSource),
                                )
                            } else {
                                image.setBackgroundColor(color(errorColor, Color.RED))
                                context.events.emit(
                                    NativeElementCatalog.Wire.ERROR,
                                    JSONObject().put(NativeElementCatalog.Wire.SRC, nextSource),
                                )
                            }
                        }
                    }
                }

                override fun dispose() {
                    disposed = true
                    request?.cancel()
                    scope.cancelScope()
                    image.setOnClickListener(null)
                    image.setOnLongClickListener(null)
                    image.onFocusChangeListener = null
                    image.setImageDrawable(null)
                }
            }
            .also { it.update(properties) }
    }

    private fun drawerDefinition() =
        NativeElementCatalog.drawer(
            NativeElementFactory { context, properties ->
                val trigger = Button(context.context)
                overlayInstance(
                    context = context,
                    trigger = trigger,
                    properties = properties,
                    restoreOpen = true,
                    showEvent = NativeElementCatalog.Wire.OPEN,
                    dismissEvent = NativeElementCatalog.Wire.CLOSE,
                    update = { values ->
                        trigger.text = values.string(NativeElementCatalog.Wire.TEXT, "Open drawer")
                    },
                ) { values, dismissed ->
                    BottomSheetDialog(context.context).also { sheet ->
                        val list =
                            LinearLayout(context.context).apply {
                                orientation = LinearLayout.VERTICAL
                                val padding = (16 * resources.displayMetrics.density).toInt()
                                setPadding(padding, padding, padding, padding)
                            }
                        values.objects(NativeElementCatalog.Wire.ITEMS).forEach { item ->
                            list.addView(
                                Button(context.context).apply {
                                    text = item.optString(NativeElementCatalog.Wire.LABEL)
                                    setOnClickListener {
                                        context.events.emit(
                                            NativeElementCatalog.Wire.SELECT,
                                            JSONObject().put("item", item),
                                        )
                                        sheet.dismiss()
                                    }
                                }
                            )
                        }
                        sheet.setContentView(list)
                        sheet.setOnDismissListener { dismissed(null) }
                        sheet.show()
                    }::dismiss
                }
            }
        )

    private fun dialogDefinition() =
        NativeElementCatalog.dialog(
            NativeElementFactory { context, properties ->
                val trigger = MaterialButton(context.context)
                overlayInstance(
                    context = context,
                    trigger = trigger,
                    properties = properties,
                    restoreOpen = true,
                    update = { values ->
                        trigger.text =
                            values.string(
                                NativeElementCatalog.Wire.TEXT,
                                values.string(NativeElementCatalog.Wire.TITLE, "Open dialog"),
                            )
                        trigger.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    },
                ) { values, dismissed ->
                    MaterialAlertDialogBuilder(context.context)
                        .setTitle(values.string(NativeElementCatalog.Wire.TITLE))
                        .setMessage(values.string(NativeElementCatalog.Wire.MESSAGE))
                        .setPositiveButton(
                            values.string(NativeElementCatalog.Wire.CONFIRM_TEXT, "OK")
                        ) { _, _ ->
                            context.events.emit(NativeElementCatalog.Wire.CONFIRM, null)
                        }
                        .setNegativeButton(
                            values.string(NativeElementCatalog.Wire.CANCEL_TEXT, "Cancel")
                        ) { _, _ ->
                            context.events.emit(NativeElementCatalog.Wire.CANCEL, null)
                        }
                        .create()
                        .apply {
                            setCanceledOnTouchOutside(true)
                            setOnCancelListener {
                                context.events.emit(NativeElementCatalog.Wire.CANCEL, null)
                            }
                            setOnDismissListener { dismissed(null) }
                            show()
                        }::dismiss
                }
            }
        )

    private fun bottomSheetDefinition() =
        NativeElementCatalog.bottomSheet(
            NativeElementFactory { context, properties ->
                val trigger = MaterialButton(context.context)
                overlayInstance(
                    context = context,
                    trigger = trigger,
                    properties = properties,
                    restoreOpen = true,
                    update = { values ->
                        trigger.text =
                            values.string(
                                NativeElementCatalog.Wire.TEXT,
                                values.string(NativeElementCatalog.Wire.TITLE, "Open sheet"),
                            )
                        trigger.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    },
                ) { values, dismissed ->
                    val content =
                        LinearLayout(context.context).apply {
                            orientation = LinearLayout.VERTICAL
                            val padding = (24 * resources.displayMetrics.density).toInt()
                            setPadding(padding, padding, padding, padding)
                            addView(
                                TextView(context.context).apply {
                                    text = values.string(NativeElementCatalog.Wire.TITLE)
                                    textSize = 20f
                                }
                            )
                            addView(
                                TextView(context.context).apply {
                                    text = values.string(NativeElementCatalog.Wire.MESSAGE)
                                }
                            )
                        }
                    val sheet = BottomSheetDialog(context.context)
                    val hidden = NativeBottomSheetDismissCallback(sheet::cancel)
                    sheet.apply {
                        setContentView(content)
                        behavior.addBottomSheetCallback(hidden)
                        setOnCancelListener {
                            context.events.emit(NativeElementCatalog.Wire.CANCEL, null)
                        }
                        setOnDismissListener {
                            behavior.removeBottomSheetCallback(hidden)
                            dismissed(null)
                        }
                        show()
                    }::dismiss
                }
            }
        )

    private fun menuDefinition() =
        NativeElementCatalog.menu(
            NativeElementFactory { context, properties ->
                val trigger = MaterialButton(context.context)
                overlayInstance(
                    context = context,
                    trigger = trigger,
                    properties = properties,
                    restoreOpen = false,
                    update = { values ->
                        trigger.text = values.string(NativeElementCatalog.Wire.TEXT, "Menu")
                        trigger.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    },
                ) { values, dismissed ->
                    android.widget.PopupMenu(context.context, trigger).apply {
                        values.objects(NativeElementCatalog.Wire.ITEMS).forEachIndexed { index, item
                            ->
                            this.menu.add(
                                0,
                                index,
                                index,
                                item.optString(NativeElementCatalog.Wire.LABEL),
                            )
                        }
                        setOnMenuItemClickListener { selected ->
                            context.events.emit(
                                NativeElementCatalog.Wire.SELECT,
                                JSONObject()
                                    .put("index", selected.itemId)
                                    .put(
                                        "item",
                                        values
                                            .objects(NativeElementCatalog.Wire.ITEMS)
                                            .getOrNull(selected.itemId),
                                    ),
                            )
                            true
                        }
                        setOnDismissListener { dismissed(null) }
                        show()
                    }::dismiss
                }
            }
        )

    private fun snackbarDefinition() =
        NativeElementCatalog.snackbar(
            NativeElementFactory { context, properties ->
                val trigger = MaterialButton(context.context)
                overlayInstance(
                    context = context,
                    trigger = trigger,
                    properties = properties,
                    restoreOpen = false,
                    update = { values ->
                        trigger.text = values.string(NativeElementCatalog.Wire.TEXT, "Show message")
                        trigger.isEnabled = values.boolean(NativeElementCatalog.Wire.ENABLED, true)
                    },
                ) { values, dismissed ->
                    val created =
                        Snackbar.make(
                                context.container ?: trigger,
                                values.string(NativeElementCatalog.Wire.MESSAGE),
                                if (values.boolean(NativeElementCatalog.Wire.INDEFINITE))
                                    Snackbar.LENGTH_INDEFINITE
                                else Snackbar.LENGTH_LONG,
                            )
                            .apply {
                                val action = values.string(NativeElementCatalog.Wire.ACTION_TEXT)
                                if (action.isNotEmpty())
                                    setAction(action) {
                                        context.events.emit(NativeElementCatalog.Wire.ACTION, null)
                                    }
                                addCallback(
                                    object : Snackbar.Callback() {
                                        override fun onDismissed(
                                            transientBottomBar: Snackbar?,
                                            event: Int,
                                        ) {
                                            dismissed(JSONObject().put("reason", event))
                                        }
                                    }
                                )
                            }
                    created.show()
                    created::dismiss
                }
            }
        )

    private fun tooltipDefinition() =
        NativeElementCatalog.tooltip(
            NativeElementFactory { context, properties ->
                val trigger = MaterialButton(context.context)
                overlayInstance(
                    context = context,
                    trigger = trigger,
                    properties = properties,
                    restoreOpen = false,
                    openOnLongClick = true,
                    update = { values ->
                        trigger.text = values.string(NativeElementCatalog.Wire.TEXT, "Help")
                        trigger.contentDescription =
                            values.string(NativeElementCatalog.Wire.LABEL, trigger.text.toString())
                    },
                ) { values, dismissed ->
                    val density = trigger.resources.displayMetrics.density
                    val content =
                        TextView(context.context).apply {
                            text = values.string(NativeElementCatalog.Wire.MESSAGE)
                            contentDescription =
                                values.string(NativeElementCatalog.Wire.LABEL, text.toString())
                            isFocusable = true
                            val horizontal = (16 * density).toInt()
                            val vertical = (8 * density).toInt()
                            setPadding(horizontal, vertical, horizontal, vertical)
                        }
                    PopupWindow(
                            content,
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                            ViewGroup.LayoutParams.WRAP_CONTENT,
                            true,
                        )
                        .apply {
                            isOutsideTouchable = true
                            elevation = TOOLTIP_ELEVATION_DP * density
                            setBackgroundDrawable(Color.WHITE.toDrawable())
                            setOnDismissListener { dismissed(null) }
                            showAsDropDown(trigger)
                            content.requestFocus()
                        }::dismiss
                }
            }
        )

    private fun instance(
        view: View,
        properties: NativeProperties,
        saveState: () -> android.os.Bundle? = { null },
        restoreState: (android.os.Bundle) -> Unit = {},
        update: (NativeProperties) -> Unit,
    ): NativeElementInstance =
        object : NativeElementInstance {
                override val view: View = view

                override fun update(properties: NativeProperties) = update(properties)

                override fun saveState(): android.os.Bundle? = saveState()

                override fun restoreState(state: android.os.Bundle) = restoreState(state)
            }
            .also { it.update(properties) }

    private class NativeTextInputEditText(context: android.content.Context) :
        TextInputEditText(context) {
        var onCompositionCommitted: (() -> Unit)? = null
        var composing = false
            private set

        override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
            val connection = super.onCreateInputConnection(outAttrs) ?: return null
            return object : InputConnectionWrapper(connection, false) {
                override fun setComposingText(
                    text: CharSequence?,
                    newCursorPosition: Int,
                ): Boolean {
                    composing = true
                    return super.setComposingText(text, newCursorPosition)
                }

                override fun setComposingRegion(
                    start: Int,
                    end: Int,
                ): Boolean {
                    composing = true
                    return super.setComposingRegion(start, end)
                }

                override fun commitText(
                    text: CharSequence?,
                    newCursorPosition: Int,
                ): Boolean {
                    val committed = super.commitText(text, newCursorPosition)
                    finishComposition()
                    return committed
                }

                override fun finishComposingText(): Boolean {
                    val finished = super.finishComposingText()
                    finishComposition()
                    return finished
                }
            }
        }

        fun finishComposition() {
            if (!composing) return
            composing = false
            onCompositionCommitted?.invoke()
        }
    }

    internal fun emitFocusEvents(view: View, context: NativeElementContext) {
        view.setOnFocusChangeListener { _, focused ->
            context.events.emit(
                if (focused) NativeElementCatalog.Wire.FOCUS else NativeElementCatalog.Wire.BLUR,
                null,
            )
        }
    }

    internal fun inputType(value: String): Int =
        when (value) {
            "email" -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            "url" -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            "phone" -> InputType.TYPE_CLASS_PHONE
            "number" -> InputType.TYPE_CLASS_NUMBER
            "decimal" -> InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            "password" -> InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            else -> InputType.TYPE_CLASS_TEXT
        }

    internal fun imeAction(value: String): Int =
        when (value) {
            "go" -> EditorInfo.IME_ACTION_GO
            "next" -> EditorInfo.IME_ACTION_NEXT
            "previous" -> EditorInfo.IME_ACTION_PREVIOUS
            "search" -> EditorInfo.IME_ACTION_SEARCH
            "send" -> EditorInfo.IME_ACTION_SEND
            "none" -> EditorInfo.IME_ACTION_NONE
            else -> EditorInfo.IME_ACTION_DONE
        }

    internal fun color(value: String, fallback: Int): Int =
        runCatching { value.toColorInt() }.getOrDefault(fallback)

    internal suspend fun loadBitmap(context: android.content.Context, source: String) =
        withContext(Dispatchers.IO) {
            runCatching {
                    val uri = source.toUri()
                    when (uri.scheme) {
                        "http",
                        "https" -> {
                            val connection = URL(source).openConnection() as HttpURLConnection
                            try {
                                connection.connectTimeout = IMAGE_CONNECT_TIMEOUT_MS
                                connection.readTimeout = IMAGE_READ_TIMEOUT_MS
                                connection.instanceFollowRedirects = true
                                connection.connect()
                                if (connection.responseCode !in HTTP_SUCCESS_CODES)
                                    return@runCatching null
                                if (connection.contentLengthLong > MAX_IMAGE_BYTES)
                                    return@runCatching null
                                connection.inputStream.use(::decodeBoundedBitmap)
                            } finally {
                                connection.disconnect()
                            }
                        }
                        "content",
                        "file",
                        "android.resource" ->
                            context.contentResolver.openInputStream(uri)?.use(::decodeBoundedBitmap)
                        else -> null
                    }
                }
                .getOrNull()
        }

    private fun decodeBoundedBitmap(stream: InputStream): android.graphics.Bitmap? {
        val output = ByteArrayOutputStream()
        val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
        var total = 0
        while (true) {
            val count = stream.read(buffer)
            if (count < 0) break
            total += count
            if (total > MAX_IMAGE_BYTES) return null
            output.write(buffer, 0, count)
        }
        return BitmapFactory.decodeByteArray(output.toByteArray(), 0, total)
    }

    @SuppressLint("DiscouragedApi")
    private fun drawable(context: android.content.Context, name: String): Int {
        if (name.isBlank()) return android.R.drawable.ic_menu_help
        val normalized = name.removePrefix("@").removePrefix("drawable/")
        val androidResource = normalized.removePrefix("android:drawable/")
        if (normalized != androidResource) {
            return context.resources.getIdentifier(androidResource, "drawable", "android").takeIf {
                it != 0
            } ?: android.R.drawable.ic_menu_help
        }
        val applicationResource =
            context.resources.getIdentifier(normalized, "drawable", context.packageName)
        if (applicationResource != 0) return applicationResource

        return context.resources.getIdentifier(normalized, "drawable", "android").takeIf { it != 0 }
            ?: android.R.drawable.ic_menu_help
    }

    private const val MAX_IMAGE_BYTES = 8L * 1024L * 1024L
    private const val MAX_BOTTOM_BAR_ITEMS = 5
}
