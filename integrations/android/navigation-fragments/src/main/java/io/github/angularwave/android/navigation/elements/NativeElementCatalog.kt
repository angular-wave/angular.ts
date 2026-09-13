// Generated code. Do not edit directly.
// Source: integrations/android/scripts/generate-native-elements.mjs.
package io.github.angularwave.android.navigation.elements

internal class NativeElementCatalogEntry(
    @JvmField val name: String,
    @JvmField val artifact: String,
    @JvmField val aliases: Set<String>,
    @JvmField val properties: List<NativePropertyDefinition>,
    @JvmField val events: Set<String>,
    @JvmField val methods: Set<String>,
    @JvmField val category: NativeElementCategory,
    @JvmField val maturity: NativeElementMaturity,
    @JvmField val minSdk: Int,
    @JvmField val stateOwnership: NativeElementStateOwnership,
    @JvmField val accessibility: NativeElementAccessibility,
)

object NativeElementCatalog {
    object Wire {
        const val ACCEPT = "accept"
        const val ACTION = "action"
        const val ACTION_TEXT = "actionText"
        const val ANIMATE = "animate"
        const val APP_BAR = "app-bar"
        const val AUTOFILL_HINTS = "autofillHints"
        const val BACKGROUND_COLOR = "backgroundColor"
        const val BADGE = "badge"
        const val BLUR = "blur"
        const val BOTTOM_BAR = "bottom-bar"
        const val BOTTOM_SHEET = "bottom-sheet"
        const val BOX = "box"
        const val BUTTON = "button"
        const val CAMERA_CHANGE = "cameraChange"
        const val CANCEL = "cancel"
        const val CANCEL_TEXT = "cancelText"
        const val CARD = "card"
        const val CHANGE = "change"
        const val CHECKABLE = "checkable"
        const val CHECKBOX = "checkbox"
        const val CHECKED = "checked"
        const val CHILD_EVENT = "childEvent"
        const val CHILDREN = "children"
        const val CHIP = "chip"
        const val CLICK = "click"
        const val CLOSE = "close"
        const val COLOR = "color"
        const val COLUMN = "column"
        const val COLUMNS = "columns"
        const val COMPOSE_DRAWER = "compose-drawer"
        const val CONFIRM = "confirm"
        const val CONFIRM_TEXT = "confirmText"
        const val CONTENT_DESCRIPTION = "contentDescription"
        const val CONTENT_SCALE = "contentScale"
        const val DATE_PICKER = "date-picker"
        const val DIALOG = "dialog"
        const val DISMISS = "dismiss"
        const val DIVIDER = "divider"
        const val DRAWER = "drawer"
        const val ENABLED = "enabled"
        const val ERROR = "error"
        const val ERROR_COLOR = "errorColor"
        const val FAB = "fab"
        const val FILE_PICKER = "file-picker"
        const val FIT_MARKERS = "fitMarkers"
        const val FLOATING_ACTION_BUTTON = "floating-action-button"
        const val FOCUS = "focus"
        const val GRID = "grid"
        const val HEIGHT = "height"
        const val HIDE = "hide"
        const val HORIZONTAL_ALIGNMENT = "horizontalAlignment"
        const val ICON = "icon"
        const val IMAGE = "image"
        const val IME_ACTION = "imeAction"
        const val IMG = "img"
        const val INDEFINITE = "indefinite"
        const val INDETERMINATE = "indeterminate"
        const val ITEMS = "items"
        const val KEYBOARD_TYPE = "keyboardType"
        const val LABEL = "label"
        const val LATITUDE = "latitude"
        const val LIST = "list"
        const val LIST_ITEM = "list-item"
        const val LOAD = "load"
        const val LOAD_MORE = "loadMore"
        const val LOADING = "loading"
        const val LOADING_INDICATOR = "loading-indicator"
        const val LOADING_TEXT = "loadingText"
        const val LONG_CLICK = "longClick"
        const val LONGITUDE = "longitude"
        const val MAP = "map"
        const val MAP_CLICK = "mapClick"
        const val MAP_TYPE = "mapType"
        const val MARKER_CLICK = "markerClick"
        const val MARKERS = "markers"
        const val MAX = "max"
        const val MAX_LINES = "maxLines"
        const val MENU = "menu"
        const val MESSAGE = "message"
        const val MIN = "min"
        const val MIN_HEIGHT = "minHeight"
        const val MIN_WIDTH = "minWidth"
        const val MOVE = "move"
        const val MULTIPLE = "multiple"
        const val NATIVE_APP_BAR = "native-app-bar"
        const val NATIVE_BOTTOM_BAR = "native-bottom-bar"
        const val NATIVE_BOTTOM_SHEET = "native-bottom-sheet"
        const val NATIVE_BOX = "native-box"
        const val NATIVE_BUTTON = "native-button"
        const val NATIVE_CARD = "native-card"
        const val NATIVE_CHECKBOX = "native-checkbox"
        const val NATIVE_COLUMN = "native-column"
        const val NATIVE_DATE = "native-date"
        const val NATIVE_DIALOG = "native-dialog"
        const val NATIVE_DRAWER = "native-drawer"
        const val NATIVE_FILE = "native-file"
        const val NATIVE_GRID = "native-grid"
        const val NATIVE_ICON = "native-icon"
        const val NATIVE_IMAGE = "native-image"
        const val NATIVE_INPUT = "native-input"
        const val NATIVE_LIST = "native-list"
        const val NATIVE_LIST_ITEM = "native-list-item"
        const val NATIVE_MAP = "native-map"
        const val NATIVE_MENU = "native-menu"
        const val NATIVE_NAVIGATION_RAIL = "native-navigation-rail"
        const val NATIVE_PAGER = "native-pager"
        const val NATIVE_PULL_TO_REFRESH = "native-pull-to-refresh"
        const val NATIVE_RADIO_GROUP = "native-radio-group"
        const val NATIVE_RANGE = "native-range"
        const val NATIVE_ROW = "native-row"
        const val NATIVE_SCAFFOLD = "native-scaffold"
        const val NATIVE_SCROLL = "native-scroll"
        const val NATIVE_SEARCH = "native-search"
        const val NATIVE_SLIDER = "native-slider"
        const val NATIVE_SNACKBAR = "native-snackbar"
        const val NATIVE_SURFACE = "native-surface"
        const val NATIVE_SWIPE_ACTION = "native-swipe-action"
        const val NATIVE_SWITCH = "native-switch"
        const val NATIVE_TABS = "native-tabs"
        const val NATIVE_TIME = "native-time"
        const val NATIVE_TOOLTIP = "native-tooltip"
        const val NAVIGATION_RAIL = "navigation-rail"
        const val OPEN = "open"
        const val OPTIONS = "options"
        const val PADDING = "padding"
        const val PAGER = "pager"
        const val PENDING = "pending"
        const val PLACEHOLDER = "placeholder"
        const val PLACEHOLDER_COLOR = "placeholderColor"
        const val PROGRESS = "progress"
        const val PROGRESS_BAR = "progress-bar"
        const val PULL_TO_REFRESH = "pull-to-refresh"
        const val RADIO_GROUP = "radio-group"
        const val RANGE_SLIDER = "range-slider"
        const val READ_ONLY = "readOnly"
        const val READY = "ready"
        const val REFRESH = "refresh"
        const val REFRESHING = "refreshing"
        const val REORDER_ENABLED = "reorderEnabled"
        const val REQUEST = "request"
        const val REQUIRED = "required"
        const val RESELECT = "reselect"
        const val RESOURCE = "resource"
        const val ROW = "row"
        const val SAFE_AREA = "safeArea"
        const val SCAFFOLD = "scaffold"
        const val SCROLL = "scroll"
        const val SCROLL_TO = "scrollTo"
        const val SCROLL_TO_END = "scrollToEnd"
        const val SCROLL_TO_START = "scrollToStart"
        const val SEARCH_FIELD = "search-field"
        const val SELECT = "select"
        const val SELECTED = "selected"
        const val SELECTED_KEY = "selectedKey"
        const val SELECTION_END = "selectionEnd"
        const val SELECTION_START = "selectionStart"
        const val SHOW = "show"
        const val SLIDER = "slider"
        const val SNACKBAR = "snackbar"
        const val SPACING = "spacing"
        const val SPINNER = "spinner"
        const val SRC = "src"
        const val STEP = "step"
        const val SUBMIT = "submit"
        const val SUPPORTING_TEXT = "supportingText"
        const val SURFACE = "surface"
        const val SWIPE = "swipe"
        const val SWIPE_ACTION = "swipe-action"
        const val SWIPE_ENABLED = "swipeEnabled"
        const val SWITCH = "switch"
        const val TABS = "tabs"
        const val TEXT = "text"
        const val TEXT_FIELD = "text-field"
        const val TEXT_COLOR = "textColor"
        const val TEXT_SIZE = "textSize"
        const val THICKNESS = "thickness"
        const val TIME_PICKER = "time-picker"
        const val TINT = "tint"
        const val TITLE = "title"
        const val TOOLTIP = "tooltip"
        const val TRAFFIC = "traffic"
        const val USER_LOCATION = "userLocation"
        const val VALUE = "value"
        const val VERTICAL_ALIGNMENT = "verticalAlignment"
        const val VISIBLE = "visible"
        const val WIDTH = "width"
        const val ZOOM = "zoom"
    }

    private val sharedAutofillHints =
        NativePropertyDefinition(
            Wire.AUTOFILL_HINTS,
            NativePropertyType.STRING_LIST,
        )

    private val sharedChildren =
        NativePropertyDefinition(
            Wire.CHILDREN,
            NativePropertyType.JSON,
        )

    private val sharedEnabled =
        NativePropertyDefinition(
            Wire.ENABLED,
            NativePropertyType.BOOLEAN,
            defaultValue = true,
        )

    private val sharedError =
        NativePropertyDefinition(
            Wire.ERROR,
            NativePropertyType.STRING,
            defaultValue = "",
        )

    private val sharedHeight =
        NativePropertyDefinition(
            Wire.HEIGHT,
            NativePropertyType.FLOAT,
            nullable = true,
        )

    private val sharedHorizontalAlignment =
        NativePropertyDefinition(
            Wire.HORIZONTAL_ALIGNMENT,
            NativePropertyType.STRING,
            defaultValue = "stretch",
        )

    private val sharedItems =
        NativePropertyDefinition(
            Wire.ITEMS,
            NativePropertyType.JSON,
        )

    private val sharedLabel =
        NativePropertyDefinition(
            Wire.LABEL,
            NativePropertyType.STRING,
            defaultValue = "",
        )

    private val sharedMax =
        NativePropertyDefinition(
            Wire.MAX,
            NativePropertyType.FLOAT,
            defaultValue = 100,
        )

    private val sharedMessage =
        NativePropertyDefinition(
            Wire.MESSAGE,
            NativePropertyType.STRING,
            defaultValue = "",
        )

    private val sharedMin =
        NativePropertyDefinition(
            Wire.MIN,
            NativePropertyType.FLOAT,
            defaultValue = 0,
        )

    private val sharedMinHeight =
        NativePropertyDefinition(
            Wire.MIN_HEIGHT,
            NativePropertyType.FLOAT,
            defaultValue = 0,
        )

    private val sharedMinWidth =
        NativePropertyDefinition(
            Wire.MIN_WIDTH,
            NativePropertyType.FLOAT,
            defaultValue = 0,
        )

    private val sharedPadding =
        NativePropertyDefinition(
            Wire.PADDING,
            NativePropertyType.FLOAT,
            defaultValue = 0,
        )

    private val sharedPending =
        NativePropertyDefinition(
            Wire.PENDING,
            NativePropertyType.BOOLEAN,
            defaultValue = false,
        )

    private val sharedPlaceholder =
        NativePropertyDefinition(
            Wire.PLACEHOLDER,
            NativePropertyType.STRING,
            defaultValue = "",
        )

    private val sharedReadOnly =
        NativePropertyDefinition(
            Wire.READ_ONLY,
            NativePropertyType.BOOLEAN,
            defaultValue = false,
        )

    private val sharedReorderEnabled =
        NativePropertyDefinition(
            Wire.REORDER_ENABLED,
            NativePropertyType.BOOLEAN,
            defaultValue = false,
        )

    private val sharedRequired =
        NativePropertyDefinition(
            Wire.REQUIRED,
            NativePropertyType.BOOLEAN,
            defaultValue = false,
        )

    private val sharedSafeArea =
        NativePropertyDefinition(
            Wire.SAFE_AREA,
            NativePropertyType.BOOLEAN,
            defaultValue = false,
        )

    private val sharedSelectionEnd =
        NativePropertyDefinition(
            Wire.SELECTION_END,
            NativePropertyType.INTEGER,
        )

    private val sharedSelectionStart =
        NativePropertyDefinition(
            Wire.SELECTION_START,
            NativePropertyType.INTEGER,
        )

    private val sharedSpacing =
        NativePropertyDefinition(
            Wire.SPACING,
            NativePropertyType.FLOAT,
            defaultValue = 0,
        )

    private val sharedStep =
        NativePropertyDefinition(
            Wire.STEP,
            NativePropertyType.FLOAT,
            defaultValue = 0,
        )

    private val sharedSwipeEnabled =
        NativePropertyDefinition(
            Wire.SWIPE_ENABLED,
            NativePropertyType.BOOLEAN,
            defaultValue = false,
        )

    private val sharedText =
        NativePropertyDefinition(
            Wire.TEXT,
            NativePropertyType.STRING,
            defaultValue = "",
        )

    private val sharedTitle =
        NativePropertyDefinition(
            Wire.TITLE,
            NativePropertyType.STRING,
            defaultValue = "",
        )

    private val sharedValue =
        NativePropertyDefinition(
            Wire.VALUE,
            NativePropertyType.STRING,
            defaultValue = "",
        )

    private val sharedValue2 =
        NativePropertyDefinition(
            Wire.VALUE,
            NativePropertyType.BOOLEAN,
            defaultValue = false,
        )

    private val sharedValue3 =
        NativePropertyDefinition(
            Wire.VALUE,
            NativePropertyType.INTEGER,
            defaultValue = 0,
        )

    private val sharedVerticalAlignment =
        NativePropertyDefinition(
            Wire.VERTICAL_ALIGNMENT,
            NativePropertyType.STRING,
            defaultValue = "stretch",
        )

    private val sharedWidth =
        NativePropertyDefinition(
            Wire.WIDTH,
            NativePropertyType.FLOAT,
            nullable = true,
        )

    internal val all: List<NativeElementCatalogEntry> =
        listOf(
            NativeElementCatalogEntry(
                name = Wire.TEXT_FIELD,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_INPUT),
                properties =
                    listOf(
                        sharedLabel,
                        sharedValue,
                        sharedPlaceholder,
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        NativePropertyDefinition(
                            Wire.KEYBOARD_TYPE,
                            NativePropertyType.STRING,
                            defaultValue = "text",
                        ),
                        NativePropertyDefinition(
                            Wire.IME_ACTION,
                            NativePropertyType.STRING,
                            defaultValue = "done",
                        ),
                        sharedAutofillHints,
                        sharedSelectionStart,
                        sharedSelectionEnd,
                        sharedReadOnly,
                        sharedPending,
                    ),
                events = setOf(Wire.CHANGE, Wire.FOCUS, Wire.BLUR, Wire.SUBMIT),
                methods = setOf(Wire.FOCUS, Wire.BLUR),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "textbox",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.SEARCH_FIELD,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_SEARCH),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LABEL,
                            NativePropertyType.STRING,
                            defaultValue = "Search",
                        ),
                        sharedValue,
                        sharedPlaceholder,
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        NativePropertyDefinition(
                            Wire.KEYBOARD_TYPE,
                            NativePropertyType.STRING,
                            defaultValue = "search",
                        ),
                        NativePropertyDefinition(
                            Wire.IME_ACTION,
                            NativePropertyType.STRING,
                            defaultValue = "search",
                        ),
                        sharedAutofillHints,
                        sharedSelectionStart,
                        sharedSelectionEnd,
                        sharedReadOnly,
                        sharedPending,
                    ),
                events = setOf(Wire.CHANGE, Wire.FOCUS, Wire.BLUR, Wire.SUBMIT),
                methods = setOf(Wire.FOCUS, Wire.BLUR),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "searchbox",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.CHECKBOX,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_CHECKBOX),
                properties =
                    listOf(
                        sharedLabel,
                        sharedValue2,
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        sharedPending,
                    ),
                events = setOf(Wire.CHANGE, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "checkbox",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.SWITCH,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_SWITCH),
                properties =
                    listOf(
                        sharedLabel,
                        sharedValue2,
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        sharedPending,
                    ),
                events = setOf(Wire.CHANGE, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "switch",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.SLIDER,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_SLIDER),
                properties =
                    listOf(
                        sharedLabel,
                        NativePropertyDefinition(
                            Wire.VALUE,
                            NativePropertyType.FLOAT,
                            defaultValue = 0,
                        ),
                        sharedMin,
                        sharedMax,
                        sharedStep,
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        sharedPending,
                    ),
                events = setOf(Wire.CHANGE, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "slider",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.TEXT,
                artifact = "navigation",
                aliases = setOf(),
                properties =
                    listOf(
                        sharedText,
                        NativePropertyDefinition(
                            Wire.COLOR,
                            NativePropertyType.COLOR,
                        ),
                        NativePropertyDefinition(
                            Wire.TEXT_SIZE,
                            NativePropertyType.FLOAT,
                            defaultValue = 16,
                        ),
                        NativePropertyDefinition(
                            Wire.MAX_LINES,
                            NativePropertyType.INTEGER,
                            defaultValue = 2147483647,
                        ),
                    ),
                events = setOf(),
                methods = setOf(),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "text",
                        labelProperty = "text",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.BUTTON,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_BUTTON),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "Button",
                        ),
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.LOADING,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                        NativePropertyDefinition(
                            Wire.LOADING_TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "Loading",
                        ),
                    ),
                events = setOf(Wire.CLICK, Wire.LONG_CLICK, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.ACTION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "button",
                        labelProperty = "text",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.ICON,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_ICON),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.RESOURCE,
                            NativePropertyType.STRING,
                            defaultValue = "ic_menu_help",
                        ),
                        NativePropertyDefinition(
                            Wire.CONTENT_DESCRIPTION,
                            NativePropertyType.STRING,
                            defaultValue = "",
                        ),
                        NativePropertyDefinition(
                            Wire.TINT,
                            NativePropertyType.COLOR,
                        ),
                    ),
                events = setOf(),
                methods = setOf(),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "image",
                        labelProperty = "contentDescription",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.DIVIDER,
                artifact = "navigation",
                aliases = setOf(),
                properties =
                    listOf(
                        sharedLabel,
                        NativePropertyDefinition(
                            Wire.COLOR,
                            NativePropertyType.COLOR,
                            defaultValue = "#1f000000",
                        ),
                        NativePropertyDefinition(
                            Wire.THICKNESS,
                            NativePropertyType.FLOAT,
                            defaultValue = 1,
                        ),
                    ),
                events = setOf(),
                methods = setOf(),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "separator",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.BADGE,
                artifact = "navigation",
                aliases = setOf(),
                properties =
                    listOf(
                        sharedText,
                        NativePropertyDefinition(
                            Wire.BACKGROUND_COLOR,
                            NativePropertyType.COLOR,
                            defaultValue = "#b3261e",
                        ),
                        NativePropertyDefinition(
                            Wire.TEXT_COLOR,
                            NativePropertyType.COLOR,
                            defaultValue = "#ffffff",
                        ),
                    ),
                events = setOf(),
                methods = setOf(),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "text",
                        labelProperty = "text",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.CHIP,
                artifact = "navigation",
                aliases = setOf(),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "Chip",
                        ),
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.CHECKABLE,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                        NativePropertyDefinition(
                            Wire.CHECKED,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                    ),
                events = setOf(Wire.CLICK, Wire.CHANGE, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.ACTION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "button",
                        labelProperty = "text",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.PROGRESS,
                artifact = "navigation",
                aliases = setOf(Wire.PROGRESS_BAR),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LABEL,
                            NativePropertyType.STRING,
                            defaultValue = "Progress",
                        ),
                        sharedValue3,
                        NativePropertyDefinition(
                            Wire.MAX,
                            NativePropertyType.INTEGER,
                            defaultValue = 100,
                        ),
                        NativePropertyDefinition(
                            Wire.INDETERMINATE,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                    ),
                events = setOf(),
                methods = setOf(),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "progressbar",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.LOADING_INDICATOR,
                artifact = "navigation",
                aliases = setOf(Wire.SPINNER),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LABEL,
                            NativePropertyType.STRING,
                            defaultValue = "Loading",
                        ),
                        NativePropertyDefinition(
                            Wire.VISIBLE,
                            NativePropertyType.BOOLEAN,
                            defaultValue = true,
                        ),
                    ),
                events = setOf(),
                methods = setOf(),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "progressbar",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.FLOATING_ACTION_BUTTON,
                artifact = "navigation",
                aliases = setOf(Wire.FAB),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.RESOURCE,
                            NativePropertyType.STRING,
                            defaultValue = "ic_input_add",
                        ),
                        NativePropertyDefinition(
                            Wire.CONTENT_DESCRIPTION,
                            NativePropertyType.STRING,
                            defaultValue = "Action",
                        ),
                        sharedEnabled,
                    ),
                events = setOf(Wire.CLICK, Wire.LONG_CLICK, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.ACTION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "button",
                        labelProperty = "contentDescription",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.CARD,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_CARD),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.TITLE,
                            NativePropertyType.STRING,
                            defaultValue = "Native card",
                        ),
                        sharedText,
                        sharedEnabled,
                    ),
                events = setOf(Wire.CLICK, Wire.LONG_CLICK, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.EXPERIMENTAL,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "button",
                        labelProperty = "title",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.IMAGE,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_IMAGE, Wire.IMG),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.SRC,
                            NativePropertyType.STRING,
                            defaultValue = "",
                        ),
                        NativePropertyDefinition(
                            Wire.CONTENT_DESCRIPTION,
                            NativePropertyType.STRING,
                            defaultValue = "Native image",
                        ),
                        NativePropertyDefinition(
                            Wire.CONTENT_SCALE,
                            NativePropertyType.STRING,
                            defaultValue = "crop",
                        ),
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.PLACEHOLDER_COLOR,
                            NativePropertyType.COLOR,
                            defaultValue = "#607d8b",
                        ),
                        NativePropertyDefinition(
                            Wire.ERROR_COLOR,
                            NativePropertyType.COLOR,
                            defaultValue = "#b3261e",
                        ),
                    ),
                events =
                    setOf(
                        Wire.LOAD,
                        Wire.ERROR,
                        Wire.CLICK,
                        Wire.LONG_CLICK,
                        Wire.FOCUS,
                        Wire.BLUR,
                    ),
                methods = setOf(),
                category = NativeElementCategory.DISPLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "image",
                        labelProperty = "contentDescription",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.DRAWER,
                artifact = "navigation",
                aliases = setOf(Wire.COMPOSE_DRAWER, Wire.NATIVE_DRAWER),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "Open drawer",
                        ),
                        sharedItems,
                    ),
                events = setOf(Wire.OPEN, Wire.CLOSE, Wire.SELECT),
                methods = setOf(Wire.SHOW, Wire.HIDE, Wire.DISMISS),
                category = NativeElementCategory.OVERLAY,
                maturity = NativeElementMaturity.EXPERIMENTAL,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.DESTINATION,
                accessibility =
                    NativeElementAccessibility(
                        role = "button",
                        labelProperty = "text",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.RADIO_GROUP,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_RADIO_GROUP),
                properties =
                    listOf(
                        sharedLabel,
                        sharedValue,
                        NativePropertyDefinition(
                            Wire.OPTIONS,
                            NativePropertyType.JSON,
                            required = true,
                        ),
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        sharedPending,
                    ),
                events = setOf(Wire.CHANGE, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "radiogroup",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.RANGE_SLIDER,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_RANGE),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LABEL,
                            NativePropertyType.STRING,
                            defaultValue = "Range",
                        ),
                        NativePropertyDefinition(
                            Wire.VALUE,
                            NativePropertyType.JSON,
                            required = true,
                        ),
                        sharedMin,
                        sharedMax,
                        sharedStep,
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        sharedPending,
                    ),
                events = setOf(Wire.CHANGE, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "slider",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.DATE_PICKER,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_DATE),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LABEL,
                            NativePropertyType.STRING,
                            defaultValue = "Date",
                        ),
                        sharedValue,
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        sharedPending,
                    ),
                events = setOf(Wire.CHANGE, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "date",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.TIME_PICKER,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_TIME),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LABEL,
                            NativePropertyType.STRING,
                            defaultValue = "Time",
                        ),
                        sharedValue,
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        sharedPending,
                    ),
                events = setOf(Wire.CHANGE, Wire.FOCUS, Wire.BLUR),
                methods = setOf(),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "time",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.FILE_PICKER,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_FILE),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LABEL,
                            NativePropertyType.STRING,
                            defaultValue = "Choose file",
                        ),
                        NativePropertyDefinition(
                            Wire.TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "Choose file",
                        ),
                        NativePropertyDefinition(
                            Wire.VALUE,
                            NativePropertyType.JSON,
                            nullable = true,
                        ),
                        NativePropertyDefinition(
                            Wire.ACCEPT,
                            NativePropertyType.STRING_LIST,
                        ),
                        NativePropertyDefinition(
                            Wire.MULTIPLE,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                        sharedEnabled,
                        sharedRequired,
                        sharedError,
                        sharedPending,
                    ),
                events = setOf(Wire.REQUEST, Wire.CHANGE, Wire.CANCEL, Wire.FOCUS, Wire.BLUR),
                methods = setOf(Wire.OPEN),
                category = NativeElementCategory.INPUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "button",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.ROW,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_ROW),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedSpacing,
                        sharedHorizontalAlignment,
                        sharedVerticalAlignment,
                        sharedEnabled,
                        sharedSwipeEnabled,
                        sharedReorderEnabled,
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT),
                methods = setOf(),
                category = NativeElementCategory.LAYOUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.COLUMN,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_COLUMN),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedSpacing,
                        sharedHorizontalAlignment,
                        sharedVerticalAlignment,
                        sharedEnabled,
                        sharedSwipeEnabled,
                        sharedReorderEnabled,
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT),
                methods = setOf(),
                category = NativeElementCategory.LAYOUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.BOX,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_BOX),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedHorizontalAlignment,
                        sharedVerticalAlignment,
                        sharedEnabled,
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT),
                methods = setOf(),
                category = NativeElementCategory.LAYOUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.SURFACE,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_SURFACE),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedHorizontalAlignment,
                        sharedVerticalAlignment,
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.BACKGROUND_COLOR,
                            NativePropertyType.COLOR,
                            defaultValue = "#00000000",
                        ),
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT),
                methods = setOf(),
                category = NativeElementCategory.LAYOUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.SCROLL,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_SCROLL),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedSpacing,
                        sharedHorizontalAlignment,
                        sharedVerticalAlignment,
                        sharedEnabled,
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT, Wire.SCROLL),
                methods = setOf(Wire.SCROLL_TO, Wire.SCROLL_TO_START, Wire.SCROLL_TO_END),
                category = NativeElementCategory.LAYOUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.SCAFFOLD,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_SCAFFOLD),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedSpacing,
                        sharedHorizontalAlignment,
                        sharedVerticalAlignment,
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.SAFE_AREA,
                            NativePropertyType.BOOLEAN,
                            defaultValue = true,
                        ),
                    ),
                events = setOf(Wire.CHILD_EVENT),
                methods = setOf(),
                category = NativeElementCategory.LAYOUT,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.APP_BAR,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_APP_BAR),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedSpacing,
                        sharedHorizontalAlignment,
                        sharedVerticalAlignment,
                        sharedEnabled,
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT),
                methods = setOf(),
                category = NativeElementCategory.NAVIGATION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.BOTTOM_BAR,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_BOTTOM_BAR),
                properties =
                    listOf(
                        sharedLabel,
                        sharedItems,
                        NativePropertyDefinition(
                            Wire.SELECTED_KEY,
                            NativePropertyType.STRING,
                            defaultValue = "",
                        ),
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedEnabled,
                        sharedSafeArea,
                    ),
                events = setOf(Wire.SELECT, Wire.RESELECT),
                methods = setOf(),
                category = NativeElementCategory.NAVIGATION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.NAVIGATION_RAIL,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_NAVIGATION_RAIL),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedSpacing,
                        sharedHorizontalAlignment,
                        sharedVerticalAlignment,
                        sharedEnabled,
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT),
                methods = setOf(),
                category = NativeElementCategory.NAVIGATION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.TABS,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_TABS),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedEnabled,
                        sharedValue,
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT, Wire.CHANGE),
                methods = setOf(Wire.SCROLL_TO),
                category = NativeElementCategory.NAVIGATION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.PAGER,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_PAGER),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedWidth,
                        sharedHeight,
                        sharedMinWidth,
                        sharedMinHeight,
                        sharedEnabled,
                        sharedValue3,
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT, Wire.CHANGE),
                methods = setOf(Wire.SCROLL_TO),
                category = NativeElementCategory.NAVIGATION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "group",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.LIST,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_LIST),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedEnabled,
                        sharedSafeArea,
                    ),
                events =
                    setOf(
                        Wire.CHILD_EVENT,
                        Wire.SCROLL,
                        Wire.LOAD_MORE,
                        Wire.SWIPE,
                        Wire.MOVE,
                    ),
                methods = setOf(Wire.SCROLL_TO, Wire.SCROLL_TO_START, Wire.SCROLL_TO_END),
                category = NativeElementCategory.COLLECTION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "list",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.GRID,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_GRID),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.COLUMNS,
                            NativePropertyType.INTEGER,
                            defaultValue = 2,
                        ),
                        sharedSwipeEnabled,
                        sharedReorderEnabled,
                        sharedSafeArea,
                    ),
                events =
                    setOf(
                        Wire.CHILD_EVENT,
                        Wire.SCROLL,
                        Wire.LOAD_MORE,
                        Wire.SWIPE,
                        Wire.MOVE,
                    ),
                methods = setOf(Wire.SCROLL_TO, Wire.SCROLL_TO_START, Wire.SCROLL_TO_END),
                category = NativeElementCategory.COLLECTION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "list",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.LIST_ITEM,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_LIST_ITEM),
                properties =
                    listOf(
                        sharedLabel,
                        sharedText,
                        NativePropertyDefinition(
                            Wire.SUPPORTING_TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "",
                        ),
                        NativePropertyDefinition(
                            Wire.SELECTED,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                        sharedEnabled,
                    ),
                events = setOf(Wire.CLICK, Wire.LONG_CLICK),
                methods = setOf(),
                category = NativeElementCategory.COLLECTION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "listitem",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.SWIPE_ACTION,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_SWIPE_ACTION),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LABEL,
                            NativePropertyType.STRING,
                            defaultValue = "Action",
                        ),
                        NativePropertyDefinition(
                            Wire.TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "Action",
                        ),
                        sharedEnabled,
                    ),
                events = setOf(Wire.ACTION),
                methods = setOf(),
                category = NativeElementCategory.COLLECTION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "button",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.PULL_TO_REFRESH,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_PULL_TO_REFRESH),
                properties =
                    listOf(
                        sharedLabel,
                        sharedChildren,
                        sharedPadding,
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.REFRESHING,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                        sharedSafeArea,
                    ),
                events = setOf(Wire.CHILD_EVENT, Wire.REFRESH),
                methods = setOf(),
                category = NativeElementCategory.COLLECTION,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "list",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.DIALOG,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_DIALOG),
                properties =
                    listOf(
                        sharedText,
                        sharedTitle,
                        sharedMessage,
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.CONFIRM_TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "OK",
                        ),
                        NativePropertyDefinition(
                            Wire.CANCEL_TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "Cancel",
                        ),
                    ),
                events = setOf(Wire.SHOW, Wire.CONFIRM, Wire.CANCEL, Wire.DISMISS),
                methods = setOf(Wire.SHOW, Wire.HIDE, Wire.DISMISS),
                category = NativeElementCategory.OVERLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.DESTINATION,
                accessibility =
                    NativeElementAccessibility(
                        role = "dialog",
                        labelProperty = "title",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.BOTTOM_SHEET,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_BOTTOM_SHEET),
                properties =
                    listOf(
                        sharedText,
                        sharedTitle,
                        sharedMessage,
                        sharedEnabled,
                    ),
                events = setOf(Wire.SHOW, Wire.CANCEL, Wire.DISMISS),
                methods = setOf(Wire.SHOW, Wire.HIDE, Wire.DISMISS),
                category = NativeElementCategory.OVERLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.DESTINATION,
                accessibility =
                    NativeElementAccessibility(
                        role = "bottom-sheet",
                        labelProperty = "title",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.MENU,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_MENU),
                properties =
                    listOf(
                        sharedText,
                        sharedTitle,
                        sharedMessage,
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.ITEMS,
                            NativePropertyType.JSON,
                            required = true,
                        ),
                    ),
                events = setOf(Wire.SHOW, Wire.SELECT, Wire.DISMISS),
                methods = setOf(Wire.SHOW, Wire.HIDE, Wire.DISMISS),
                category = NativeElementCategory.OVERLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "menu",
                        labelProperty = "title",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.SNACKBAR,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_SNACKBAR),
                properties =
                    listOf(
                        sharedText,
                        sharedTitle,
                        sharedMessage,
                        sharedEnabled,
                        NativePropertyDefinition(
                            Wire.ACTION_TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "",
                        ),
                        NativePropertyDefinition(
                            Wire.INDEFINITE,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                    ),
                events = setOf(Wire.SHOW, Wire.ACTION, Wire.DISMISS),
                methods = setOf(Wire.SHOW, Wire.HIDE, Wire.DISMISS),
                category = NativeElementCategory.OVERLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "snackbar",
                        labelProperty = "title",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.TOOLTIP,
                artifact = "navigation",
                aliases = setOf(Wire.NATIVE_TOOLTIP),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LABEL,
                            NativePropertyType.STRING,
                            defaultValue = "Help",
                        ),
                        NativePropertyDefinition(
                            Wire.TEXT,
                            NativePropertyType.STRING,
                            defaultValue = "Help",
                        ),
                        sharedMessage,
                    ),
                events = setOf(Wire.SHOW, Wire.DISMISS),
                methods = setOf(Wire.SHOW, Wire.HIDE, Wire.DISMISS),
                category = NativeElementCategory.OVERLAY,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.NONE,
                accessibility =
                    NativeElementAccessibility(
                        role = "tooltip",
                        labelProperty = "label",
                        required = true,
                    ),
            ),
            NativeElementCatalogEntry(
                name = Wire.MAP,
                artifact = "maps",
                aliases = setOf(Wire.NATIVE_MAP),
                properties =
                    listOf(
                        NativePropertyDefinition(
                            Wire.LATITUDE,
                            NativePropertyType.FLOAT,
                            defaultValue = 0,
                        ),
                        NativePropertyDefinition(
                            Wire.LONGITUDE,
                            NativePropertyType.FLOAT,
                            defaultValue = 0,
                        ),
                        NativePropertyDefinition(
                            Wire.ZOOM,
                            NativePropertyType.FLOAT,
                            defaultValue = 12,
                        ),
                        NativePropertyDefinition(
                            Wire.MAP_TYPE,
                            NativePropertyType.STRING,
                            defaultValue = "normal",
                        ),
                        NativePropertyDefinition(
                            Wire.TRAFFIC,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                        NativePropertyDefinition(
                            Wire.USER_LOCATION,
                            NativePropertyType.BOOLEAN,
                            defaultValue = false,
                        ),
                        NativePropertyDefinition(
                            Wire.MARKERS,
                            NativePropertyType.JSON,
                            nullable = true,
                        ),
                        NativePropertyDefinition(
                            Wire.CONTENT_DESCRIPTION,
                            NativePropertyType.STRING,
                            defaultValue = "Map",
                        ),
                    ),
                events = setOf(Wire.READY, Wire.CAMERA_CHANGE, Wire.MARKER_CLICK, Wire.MAP_CLICK),
                methods = setOf(Wire.MOVE, Wire.ANIMATE, Wire.FIT_MARKERS),
                category = NativeElementCategory.MEDIA,
                maturity = NativeElementMaturity.PREVIEW,
                minSdk = 28,
                stateOwnership = NativeElementStateOwnership.ELEMENT,
                accessibility =
                    NativeElementAccessibility(
                        role = "map",
                        labelProperty = "contentDescription",
                        required = true,
                    ),
            ),
        )

    internal val builtIns: List<NativeElementCatalogEntry> = all.filter {
        it.artifact == "navigation"
    }

    fun definition(name: String, factory: NativeElementFactory): NativeElementDefinition {
        val entry =
            requireNotNull(all.find { it.name == name }) {
                "Unknown generated native element: $name"
            }
        return NativeElementDefinition(
            name = entry.name,
            aliases = entry.aliases,
            properties = entry.properties,
            events = entry.events,
            methods = entry.methods,
            category = entry.category,
            maturity = entry.maturity,
            minSdk = entry.minSdk,
            stateOwnership = entry.stateOwnership,
            accessibility = entry.accessibility,
            factory = factory,
        )
    }

    fun textField(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.TEXT_FIELD, factory)

    fun searchField(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.SEARCH_FIELD, factory)

    fun checkbox(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.CHECKBOX, factory)

    fun switch(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.SWITCH, factory)

    fun slider(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.SLIDER, factory)

    fun text(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.TEXT, factory)

    fun button(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.BUTTON, factory)

    fun icon(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.ICON, factory)

    fun divider(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.DIVIDER, factory)

    fun badge(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.BADGE, factory)

    fun chip(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.CHIP, factory)

    fun progress(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.PROGRESS, factory)

    fun loadingIndicator(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.LOADING_INDICATOR, factory)

    fun floatingActionButton(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.FLOATING_ACTION_BUTTON, factory)

    fun card(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.CARD, factory)

    fun image(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.IMAGE, factory)

    fun drawer(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.DRAWER, factory)

    fun radioGroup(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.RADIO_GROUP, factory)

    fun rangeSlider(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.RANGE_SLIDER, factory)

    fun datePicker(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.DATE_PICKER, factory)

    fun timePicker(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.TIME_PICKER, factory)

    fun filePicker(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.FILE_PICKER, factory)

    fun row(factory: NativeElementFactory): NativeElementDefinition = definition(Wire.ROW, factory)

    fun column(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.COLUMN, factory)

    fun box(factory: NativeElementFactory): NativeElementDefinition = definition(Wire.BOX, factory)

    fun surface(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.SURFACE, factory)

    fun scroll(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.SCROLL, factory)

    fun scaffold(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.SCAFFOLD, factory)

    fun appBar(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.APP_BAR, factory)

    fun bottomBar(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.BOTTOM_BAR, factory)

    fun navigationRail(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.NAVIGATION_RAIL, factory)

    fun tabs(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.TABS, factory)

    fun pager(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.PAGER, factory)

    fun list(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.LIST, factory)

    fun grid(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.GRID, factory)

    fun listItem(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.LIST_ITEM, factory)

    fun swipeAction(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.SWIPE_ACTION, factory)

    fun pullToRefresh(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.PULL_TO_REFRESH, factory)

    fun dialog(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.DIALOG, factory)

    fun bottomSheet(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.BOTTOM_SHEET, factory)

    fun menu(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.MENU, factory)

    fun snackbar(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.SNACKBAR, factory)

    fun tooltip(factory: NativeElementFactory): NativeElementDefinition =
        definition(Wire.TOOLTIP, factory)

    fun map(factory: NativeElementFactory): NativeElementDefinition = definition(Wire.MAP, factory)
}
