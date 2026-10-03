import { nativeElements } from "../generated/NativeElementCatalog.ts";

export type NativeElementName = keyof typeof nativeElements;

export interface NativeRendererDefinition {
  readonly primitive: string;
  readonly interactive: boolean;
  readonly container: boolean;
}

export const nativeRenderers = {
  "text-field": { primitive: "TextInput", interactive: true, container: false },
  "search-field": { primitive: "Search", interactive: true, container: false },
  checkbox: { primitive: "Checkbox", interactive: true, container: false },
  switch: { primitive: "Toggle", interactive: true, container: false },
  slider: { primitive: "Slider", interactive: true, container: false },
  text: { primitive: "Text", interactive: false, container: false },
  button: { primitive: "Button", interactive: true, container: false },
  icon: { primitive: "SymbolGlyph", interactive: false, container: false },
  divider: { primitive: "Divider", interactive: false, container: false },
  badge: { primitive: "Badge", interactive: false, container: false },
  chip: { primitive: "Button", interactive: true, container: false },
  progress: { primitive: "Progress", interactive: false, container: false },
  "loading-indicator": {
    primitive: "LoadingProgress",
    interactive: false,
    container: false,
  },
  "floating-action-button": {
    primitive: "Button",
    interactive: true,
    container: false,
  },
  card: { primitive: "Column", interactive: true, container: true },
  image: { primitive: "Image", interactive: true, container: false },
  drawer: { primitive: "SideBarContainer", interactive: true, container: true },
  "radio-group": { primitive: "Radio", interactive: true, container: true },
  "range-slider": { primitive: "Slider", interactive: true, container: false },
  "date-picker": { primitive: "DatePicker", interactive: true, container: false },
  "time-picker": { primitive: "TimePicker", interactive: true, container: false },
  "file-picker": { primitive: "Button", interactive: true, container: false },
  row: { primitive: "Row", interactive: false, container: true },
  column: { primitive: "Column", interactive: false, container: true },
  box: { primitive: "Stack", interactive: false, container: true },
  surface: { primitive: "Stack", interactive: false, container: true },
  scroll: { primitive: "Scroll", interactive: true, container: true },
  scaffold: { primitive: "Stack", interactive: false, container: true },
  "app-bar": { primitive: "Navigation", interactive: true, container: true },
  "bottom-bar": { primitive: "Tabs", interactive: true, container: true },
  "navigation-rail": { primitive: "Navigation", interactive: true, container: true },
  tabs: { primitive: "Tabs", interactive: true, container: true },
  pager: { primitive: "Swiper", interactive: true, container: true },
  list: { primitive: "List", interactive: true, container: true },
  grid: { primitive: "Grid", interactive: true, container: true },
  "list-item": { primitive: "ListItem", interactive: true, container: true },
  "swipe-action": { primitive: "ListItem", interactive: true, container: true },
  "pull-to-refresh": { primitive: "Refresh", interactive: true, container: true },
  dialog: { primitive: "CustomDialog", interactive: true, container: true },
  "bottom-sheet": { primitive: "BindSheet", interactive: true, container: true },
  menu: { primitive: "Menu", interactive: true, container: true },
  snackbar: { primitive: "PromptAction", interactive: true, container: false },
  tooltip: { primitive: "Popup", interactive: true, container: false },
  map: { primitive: "MapComponent", interactive: true, container: false },
} as const satisfies Record<NativeElementName, NativeRendererDefinition>;
