import {
  BuilderNode,
  FrameNode,
  NodeController,
  NodeRenderType,
} from "@kit.ArkUI";
import type {
  NativeComponentEventEmitter,
  NativeComponentSnapshot,
} from "../components/NativeComponentModel.ts";
import type { NativeNodeRect } from "./NativeNodeRegistry.ts";
import { SameLayerSurface } from "./SameLayerSurface.ts";
import type {
  SameLayerController,
  SameLayerEmbed,
} from "./SameLayerSurface.ts";

interface NativeChildEventPayload {
  readonly key: string;
  readonly event: string;
  readonly data: Readonly<Record<string, ESObject>>;
}

class AngularNativeNodeParameters {
  snapshot: NativeComponentSnapshot;
  primitive: string;
  width: number;
  height: number;
  emit: NativeComponentEventEmitter;

  constructor(
    snapshot: NativeComponentSnapshot,
    primitive: string,
    width: number,
    height: number,
    emit: NativeComponentEventEmitter,
  ) {
    this.snapshot = snapshot;
    this.primitive = primitive;
    this.width = width;
    this.height = height;
    this.emit = emit;
  }
}

@Component
struct AngularNativeElement {
  @Prop params: AngularNativeNodeParameters;

  @Builder
  renderChildren() {
    ForEach(nativeChildren(this.params.snapshot), (child: NativeChildDescriptor) => {
      AngularNativeElement({
        params: childParameters(this.params, child),
      });
    }, (child: NativeChildDescriptor) => child.key)
  }

  build() {
    if (this.params.snapshot.name === "text-field") {
      TextInput({
        text: stringProperty(this.params.snapshot, "value"),
        placeholder: stringProperty(this.params.snapshot, "placeholder"),
      })
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onChange((value: string) => this.params.emit("change", { value }))
        .onFocus(() => this.params.emit("focus"))
        .onBlur(() => this.params.emit("blur"));
    } else if (this.params.snapshot.name === "search-field") {
      Search({
        value: stringProperty(this.params.snapshot, "value"),
        placeholder: stringProperty(this.params.snapshot, "placeholder"),
      })
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onChange((value: string) => this.params.emit("change", { value }))
        .onSubmit((value: string) => this.params.emit("submit", { value }));
    } else if (this.params.snapshot.name === "checkbox") {
      Row() {
        Text(stringProperty(this.params.snapshot, "label") || stringProperty(this.params.snapshot, "text"));
        Toggle({
          type: ToggleType.Checkbox,
          isOn: booleanProperty(this.params.snapshot, "value", false) ||
            booleanProperty(this.params.snapshot, "checked", false),
        })
          .enabled(booleanProperty(this.params.snapshot, "enabled", true))
          .onChange((value: boolean) => this.params.emit("change", { value }));
      }
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "switch") {
      Row() {
        Text(stringProperty(this.params.snapshot, "label") || stringProperty(this.params.snapshot, "text"));
        Toggle({
          type: ToggleType.Switch,
          isOn: booleanProperty(this.params.snapshot, "value", false) ||
            booleanProperty(this.params.snapshot, "checked", false),
        })
          .enabled(booleanProperty(this.params.snapshot, "enabled", true))
          .onChange((value: boolean) => this.params.emit("change", { value }));
      }
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "slider") {
      Slider({
        value: numberProperty(this.params.snapshot, "value", 0),
        min: numberProperty(this.params.snapshot, "min", 0),
        max: numberProperty(this.params.snapshot, "max", 100),
        step: numberProperty(this.params.snapshot, "step", 1),
      })
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onChange((value: number) => this.params.emit("change", { value }));
    } else if (this.params.snapshot.name === "range-slider") {
      Row({ space: 8 }) {
        Slider({
          value: rangeValues(this.params.snapshot)[0],
          min: numberProperty(this.params.snapshot, "min", 0),
          max: numberProperty(this.params.snapshot, "max", 100),
          step: numberProperty(this.params.snapshot, "step", 1),
        })
          .layoutWeight(1)
          .onChange((value: number) => this.params.emit("change", {
            value: [Math.min(value, rangeValues(this.params.snapshot)[1]), rangeValues(this.params.snapshot)[1]],
          }));
        Slider({
          value: rangeValues(this.params.snapshot)[1],
          min: numberProperty(this.params.snapshot, "min", 0),
          max: numberProperty(this.params.snapshot, "max", 100),
          step: numberProperty(this.params.snapshot, "step", 1),
        })
          .layoutWeight(1)
          .onChange((value: number) => this.params.emit("change", {
            value: [rangeValues(this.params.snapshot)[0], Math.max(value, rangeValues(this.params.snapshot)[0])],
          }));
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "radio-group") {
      Column() {
        ForEach(radioOptions(this.params.snapshot), (option: NativeRadioOption) => {
          Row() {
            Radio({ value: option.value, group: this.params.snapshot.id })
              .checked(option.value === stringProperty(this.params.snapshot, "value"))
              .onChange((checked: boolean) => {
                if (checked) this.params.emit("change", { value: option.value });
              });
            Text(option.label);
          }
        }, (option: NativeRadioOption) => option.value)
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "date-picker") {
      DatePicker({ selected: dateValue(this.params.snapshot) })
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onDateChange((value: Date) => this.params.emit("change", {
          value: `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1, 2)}-${pad(value.getDate(), 2)}`,
        }));
    } else if (this.params.snapshot.name === "time-picker") {
      TimePicker({ selected: timeValue(this.params.snapshot) })
        .useMilitaryTime(true)
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onChange((value: TimePickerResult) => this.params.emit("change", {
          value: `${pad(value.hour, 2)}:${pad(value.minute, 2)}`,
        }));
    } else if (this.params.snapshot.name === "text") {
      Text(stringProperty(this.params.snapshot, "text"))
        .fontColor(stringProperty(this.params.snapshot, "color"))
        .fontSize(numberProperty(this.params.snapshot, "textSize", 16))
        .maxLines(numberProperty(this.params.snapshot, "maxLines", 2147483647))
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "button") {
      Button(booleanProperty(this.params.snapshot, "loading", false)
        ? stringProperty(this.params.snapshot, "loadingText")
        : stringProperty(this.params.snapshot, "text"))
        .enabled(booleanProperty(this.params.snapshot, "enabled", true) && !booleanProperty(this.params.snapshot, "loading", false))
        .width(this.params.width)
        .height(this.params.height)
        .onClick(() => this.params.emit("click"))
        .onFocus(() => this.params.emit("focus"))
        .onBlur(() => this.params.emit("blur"));
    } else if (this.params.snapshot.name === "file-picker") {
      Button(stringProperty(this.params.snapshot, "text") || stringProperty(this.params.snapshot, "label"))
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onClick(() => this.params.emit("request"))
        .onFocus(() => this.params.emit("focus"))
        .onBlur(() => this.params.emit("blur"));
    } else if (this.params.snapshot.name === "icon") {
      Image(stringProperty(this.params.snapshot, "resource"))
        .objectFit(ImageFit.Contain)
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "badge") {
      Text(stringProperty(this.params.snapshot, "text"))
        .fontColor(stringProperty(this.params.snapshot, "textColor"))
        .backgroundColor(stringProperty(this.params.snapshot, "backgroundColor"))
        .textAlign(TextAlign.Center)
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "chip") {
      Button(stringProperty(this.params.snapshot, "text"))
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .stateEffect(true)
        .width(this.params.width)
        .height(this.params.height)
        .onClick(() => {
          if (booleanProperty(this.params.snapshot, "checkable", false)) {
            this.params.emit("change", { value: !booleanProperty(this.params.snapshot, "checked", false) });
          } else {
            this.params.emit("click");
          }
        })
        .onFocus(() => this.params.emit("focus"))
        .onBlur(() => this.params.emit("blur"));
    } else if (this.params.snapshot.name === "floating-action-button") {
      Button() {
        Image(stringProperty(this.params.snapshot, "resource"))
          .objectFit(ImageFit.Contain);
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onClick(() => this.params.emit("click"))
        .onFocus(() => this.params.emit("focus"))
        .onBlur(() => this.params.emit("blur"));
    } else if (this.params.snapshot.name === "image") {
      Image(stringProperty(this.params.snapshot, "src"))
        .objectFit(ImageFit.Cover)
        .width(this.params.width)
        .height(this.params.height)
        .onComplete(() => this.params.emit("load"))
        .onError(() => this.params.emit("error"));
    } else if (this.params.snapshot.name === "progress") {
      Progress({
        value: numberProperty(this.params.snapshot, "value", 0),
        total: numberProperty(this.params.snapshot, "max", 100),
      })
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "loading-indicator") {
      LoadingProgress()
        .visibility(booleanProperty(this.params.snapshot, "visible", true) ? Visibility.Visible : Visibility.Hidden)
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "divider") {
      Divider()
        .strokeWidth(numberProperty(this.params.snapshot, "thickness", 1))
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "card") {
      Column({ space: numberProperty(this.params.snapshot, "spacing", 4) }) {
        if (stringProperty(this.params.snapshot, "title")) {
          Text(stringProperty(this.params.snapshot, "title"));
        }
        if (stringProperty(this.params.snapshot, "text")) {
          Text(stringProperty(this.params.snapshot, "text"));
        }
        this.renderChildren();
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onClick(() => this.params.emit("click"))
        .onFocus(() => this.params.emit("focus"))
        .onBlur(() => this.params.emit("blur"));
    } else if (this.params.snapshot.name === "list-item") {
      Column({ space: 2 }) {
        Text(stringProperty(this.params.snapshot, "text"));
        if (stringProperty(this.params.snapshot, "supportingText")) {
          Text(stringProperty(this.params.snapshot, "supportingText"));
        }
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onClick(() => this.params.emit("click"));
    } else if (this.params.snapshot.name === "row") {
      Row({ space: numberProperty(this.params.snapshot, "spacing", 0) }) {
        this.renderChildren();
      }
        .width(this.params.width)
        .height(this.params.height);
    } else if (
      this.params.snapshot.name === "box" ||
      this.params.snapshot.name === "surface" ||
      this.params.snapshot.name === "scaffold"
    ) {
      Stack() {
        this.renderChildren();
      }
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "scroll") {
      Scroll() {
        Column({ space: numberProperty(this.params.snapshot, "spacing", 0) }) {
          this.renderChildren();
        }
      }
        .width(this.params.width)
        .height(this.params.height)
        .onDidScroll((xOffset: number, yOffset: number) => {
          this.params.emit("scroll", { x: xOffset, y: yOffset });
        });
    } else if (this.params.snapshot.name === "list") {
      List() {
        ForEach(nativeChildren(this.params.snapshot), (child: NativeChildDescriptor) => {
          ListItem() {
            AngularNativeElement({ params: childParameters(this.params, child) });
          }
        }, (child: NativeChildDescriptor) => child.key)
      }
        .width(this.params.width)
        .height(this.params.height)
        .onReachEnd(() => this.params.emit("loadMore"));
    } else if (this.params.snapshot.name === "grid") {
      Grid() {
        ForEach(nativeChildren(this.params.snapshot), (child: NativeChildDescriptor) => {
          GridItem() {
            AngularNativeElement({ params: childParameters(this.params, child) });
          }
        }, (child: NativeChildDescriptor) => child.key)
      }
        .columnsTemplate(gridColumns(this.params.snapshot))
        .width(this.params.width)
        .height(this.params.height)
        .onReachEnd(() => this.params.emit("loadMore"));
    } else if (this.params.snapshot.name === "drawer") {
      Stack({ alignContent: Alignment.TopStart }) {
        Button(stringProperty(this.params.snapshot, "text"))
          .onClick(() => this.params.emit("open"));
        if (this.params.snapshot.visible) {
          Column() {
            ForEach(navigationItems(this.params.snapshot), (item: NativeNavigationItem) => {
              Button(item.label)
                .onClick(() => this.params.emit("select", { key: item.key }));
            }, (item: NativeNavigationItem) => item.key)
          }
            .width("80%")
            .height("100%");
        }
      }
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "app-bar") {
      Row({ space: numberProperty(this.params.snapshot, "spacing", 8) }) {
        this.renderChildren();
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "bottom-bar") {
      Row() {
        ForEach(navigationItems(this.params.snapshot), (item: NativeNavigationItem) => {
          Button(item.label)
            .layoutWeight(1)
            .enabled(booleanProperty(this.params.snapshot, "enabled", true))
            .onClick(() => this.params.emit(
              item.key === stringProperty(this.params.snapshot, "selectedKey") ? "reselect" : "select",
              { key: item.key },
            ));
        }, (item: NativeNavigationItem) => item.key)
      }
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "navigation-rail") {
      Column({ space: numberProperty(this.params.snapshot, "spacing", 8) }) {
        this.renderChildren();
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "tabs") {
      Tabs({ index: integerProperty(this.params.snapshot, "value", 0) }) {
        ForEach(nativeChildren(this.params.snapshot), (child: NativeChildDescriptor) => {
          TabContent() {
            AngularNativeElement({ params: childParameters(this.params, child) });
          }
            .tabBar(childLabel(child));
        }, (child: NativeChildDescriptor) => child.key)
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onChange((value: number) => this.params.emit("change", { value }));
    } else if (this.params.snapshot.name === "pager") {
      Swiper() {
        ForEach(nativeChildren(this.params.snapshot), (child: NativeChildDescriptor) => {
          AngularNativeElement({ params: childParameters(this.params, child) });
        }, (child: NativeChildDescriptor) => child.key)
      }
        .index(integerProperty(this.params.snapshot, "value", 0))
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onChange((value: number) => this.params.emit("change", { value }));
    } else if (this.params.snapshot.name === "pull-to-refresh") {
      Refresh({ refreshing: booleanProperty(this.params.snapshot, "refreshing", false) }) {
        Scroll() {
          Column() {
            this.renderChildren();
          }
        }
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onRefreshing(() => this.params.emit("refresh"));
    } else if (this.params.snapshot.name === "swipe-action") {
      Button(stringProperty(this.params.snapshot, "text"))
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onClick(() => this.params.emit("action"));
    } else if (this.params.snapshot.name === "dialog") {
      Stack({ alignContent: Alignment.Center }) {
        if (this.params.snapshot.visible) {
          Column({ space: 12 }) {
            Text(stringProperty(this.params.snapshot, "title"));
            Text(stringProperty(this.params.snapshot, "message"));
            Row({ space: 8 }) {
              Button(stringProperty(this.params.snapshot, "cancelText"))
                .onClick(() => this.params.emit("cancel"));
              Button(stringProperty(this.params.snapshot, "confirmText"))
                .onClick(() => this.params.emit("confirm"));
            }
          }
        }
      }
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "bottom-sheet") {
      Stack({ alignContent: Alignment.Bottom }) {
        if (this.params.snapshot.visible) {
          Column({ space: 8 }) {
            Text(stringProperty(this.params.snapshot, "title"));
            Text(stringProperty(this.params.snapshot, "message"));
          }
        }
      }
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "menu") {
      Column() {
        if (this.params.snapshot.visible) {
          ForEach(navigationItems(this.params.snapshot), (item: NativeNavigationItem) => {
            Button(item.label)
              .onClick(() => this.params.emit("select", { key: item.key }));
          }, (item: NativeNavigationItem) => item.key)
        }
      }
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "snackbar") {
      Row({ space: 8 }) {
        Text(stringProperty(this.params.snapshot, "message") || stringProperty(this.params.snapshot, "text"));
        if (stringProperty(this.params.snapshot, "actionText")) {
          Button(stringProperty(this.params.snapshot, "actionText"))
            .onClick(() => this.params.emit("action"));
        }
      }
        .visibility(this.params.snapshot.visible ? Visibility.Visible : Visibility.Hidden)
        .width(this.params.width)
        .height(this.params.height);
    } else if (this.params.snapshot.name === "tooltip") {
      Text(stringProperty(this.params.snapshot, "message") || stringProperty(this.params.snapshot, "text"))
        .visibility(this.params.snapshot.visible ? Visibility.Visible : Visibility.Hidden)
        .width(this.params.width)
        .height(this.params.height);
    } else if (
      this.params.snapshot.name === "column"
    ) {
      Column({ space: numberProperty(this.params.snapshot, "spacing", 0) }) {
        this.renderChildren();
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .width(this.params.width)
        .height(this.params.height)
        .onClick(() => emitClick(this.params.snapshot, this.params.emit));
    } else {
      Column() {
        Text(displayText(this.params.snapshot))
          .maxLines(numberProperty(this.params.snapshot, "maxLines", 2147483647))
          .fontSize(numberProperty(this.params.snapshot, "textSize", 16));
      }
        .enabled(booleanProperty(this.params.snapshot, "enabled", true))
        .justifyContent(FlexAlign.Center)
        .width(this.params.width)
        .height(this.params.height)
        .onClick(() => emitClick(this.params.snapshot, this.params.emit));
    }
  }
}

class NativeChildDescriptor {
  key: string;
  name: string;
  props: Readonly<Record<string, ESObject>>;

  constructor(
    key: string,
    name: string,
    props: Readonly<Record<string, ESObject>>,
  ) {
    this.key = key;
    this.name = name;
    this.props = props;
  }
}

class NativeRadioOption {
  label: string;
  value: string;

  constructor(label: string, value: string) {
    this.label = label;
    this.value = value;
  }
}

class NativeNavigationItem {
  key: string;
  label: string;

  constructor(key: string, label: string) {
    this.key = key;
    this.label = label;
  }
}

@Builder
function angularNativeElementBuilder(params: AngularNativeNodeParameters) {
  AngularNativeElement({ params });
}

export class ArkUISameLayerNodeController extends NodeController implements SameLayerController {
  private rootNode: BuilderNode<[AngularNativeNodeParameters]> | null = null;
  private readonly embed: SameLayerEmbed;
  private parameters: AngularNativeNodeParameters | null = null;

  constructor(embed: SameLayerEmbed) {
    super();
    this.embed = embed;
  }

  makeNode(uiContext: UIContext): FrameNode | null {
    this.rootNode = new BuilderNode(uiContext, {
      surfaceId: this.embed.surfaceId,
      type: NodeRenderType.RENDER_TYPE_TEXTURE,
    });
    if (this.parameters !== null) {
      this.rootNode.build(wrapBuilder(angularNativeElementBuilder), this.parameters);
    }
    return this.rootNode.getFrameNode();
  }

  update(
    snapshot: NativeComponentSnapshot,
    primitive: string,
    emit: NativeComponentEventEmitter,
  ): void {
    const width = this.parameters?.width ?? this.embed.width;
    const height = this.parameters?.height ?? this.embed.height;
    this.parameters = new AngularNativeNodeParameters(snapshot, primitive, width, height, emit);
    this.rootNode?.update(this.parameters);
    this.rebuild();
  }

  layout(rect: NativeNodeRect): void {
    if (this.parameters === null) return;
    this.parameters = new AngularNativeNodeParameters(
      this.parameters.snapshot,
      this.parameters.primitive,
      rect.width,
      rect.height,
      this.parameters.emit,
    );
    this.rootNode?.update(this.parameters);
  }

  invoke(_method: string, _argumentsValue: Readonly<Record<string, ESObject>>): ESObject {
    return undefined;
  }

  postTouchEvent(event: ESObject): boolean {
    return this.rootNode?.postTouchEvent(event as TouchEvent) as boolean;
  }

  dispose(): void {
    this.rootNode = null;
    this.rebuild();
  }
}

export type ArkUISameLayerControllerFactory = (
  embed: SameLayerEmbed,
  snapshot: NativeComponentSnapshot,
  primitive: string,
  emit: NativeComponentEventEmitter,
) => SameLayerController | undefined;

export class ArkUISameLayerSurface {
  readonly surface: SameLayerSurface;

  constructor(factory?: ArkUISameLayerControllerFactory) {
    this.surface = new SameLayerSurface(
      (
        embed: SameLayerEmbed,
        snapshot: NativeComponentSnapshot,
        primitive: string,
        emit: NativeComponentEventEmitter,
      ) => factory?.(embed, snapshot, primitive, emit) ??
        new ArkUISameLayerNodeController(embed),
    );
  }

  controller(id: string): ArkUISameLayerNodeController | null {
    return this.surface.controller(id) as ArkUISameLayerNodeController | null;
  }
}

function stringProperty(snapshot: NativeComponentSnapshot, name: string): string {
  const value: ESObject = Reflect.get(snapshot.properties, name);
  return typeof value === "string" ? value : "";
}

function numberProperty(snapshot: NativeComponentSnapshot, name: string, fallback: number): number {
  const value: ESObject = Reflect.get(snapshot.properties, name);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function integerProperty(snapshot: NativeComponentSnapshot, name: string, fallback: number): number {
  return Math.trunc(numberProperty(snapshot, name, fallback));
}

function booleanProperty(snapshot: NativeComponentSnapshot, name: string, fallback: boolean): boolean {
  const value: ESObject = Reflect.get(snapshot.properties, name);
  return typeof value === "boolean" ? value : fallback;
}

function displayText(snapshot: NativeComponentSnapshot): string {
  return stringProperty(snapshot, "text") ||
    stringProperty(snapshot, "title") ||
    stringProperty(snapshot, "label") ||
    snapshot.name;
}

function emitClick(snapshot: NativeComponentSnapshot, emit: NativeComponentEventEmitter): void {
  if (["card", "list-item", "floating-action-button"].includes(snapshot.name)) emit("click");
}

function nativeChildren(snapshot: NativeComponentSnapshot): Array<NativeChildDescriptor> {
  const value: ESObject = Reflect.get(snapshot.properties, "children");
  if (!Array.isArray(value)) return [];
  const result: Array<NativeChildDescriptor> = [];
  value.forEach((candidate: ESObject) => {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return;
    const child = candidate as Record<string, ESObject>;
    if (
      typeof child.key === "string" &&
      typeof child.name === "string" &&
      typeof child.props === "object" &&
      child.props !== null &&
      !Array.isArray(child.props)
    ) {
      result.push(new NativeChildDescriptor(
        child.key,
        child.name,
        child.props as Readonly<Record<string, ESObject>>,
      ));
    }
  });
  return result;
}

function childLabel(child: NativeChildDescriptor): string {
  const label: ESObject = Reflect.get(child.props, "label") ??
    Reflect.get(child.props, "title") ??
    Reflect.get(child.props, "text");
  return typeof label === "string" && label.length > 0 ? label : child.key;
}

function navigationItems(snapshot: NativeComponentSnapshot): Array<NativeNavigationItem> {
  const value: ESObject = Reflect.get(snapshot.properties, "items");
  if (!Array.isArray(value)) return [];
  const result: Array<NativeNavigationItem> = [];
  value.forEach((candidate: ESObject, index: number) => {
    if (typeof candidate === "string") {
      result.push(new NativeNavigationItem(candidate, candidate));
      return;
    }
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return;
    const item = candidate as Record<string, ESObject>;
    const key = typeof item.key === "string" ? item.key : String(index);
    const label = typeof item.label === "string"
      ? item.label
      : typeof item.text === "string" ? item.text : key;
    result.push(new NativeNavigationItem(key, label));
  });
  return result;
}

function childParameters(
  parent: AngularNativeNodeParameters,
  child: NativeChildDescriptor,
): AngularNativeNodeParameters {
  const snapshot: NativeComponentSnapshot = {
    id: `${parent.snapshot.id}:${child.key}`,
    name: child.name,
    embedId: parent.snapshot.embedId,
    properties: child.props,
    visible: parent.snapshot.visible,
    focused: false,
    revision: parent.snapshot.revision,
  };
  return new AngularNativeNodeParameters(
    snapshot,
    child.name,
    numberProperty(snapshot, "width", parent.width),
    numberProperty(snapshot, "height", 48),
    (event: string, data?: Readonly<Record<string, ESObject>>) => {
      const payload: NativeChildEventPayload = {
        key: child.key,
        event,
        data: data ?? {},
      };
      parent.emit("childEvent", payload as Readonly<Record<string, ESObject>>);
    },
  );
}

function gridColumns(snapshot: NativeComponentSnapshot): string {
  const count = Math.max(1, Math.trunc(numberProperty(snapshot, "columns", 1)));
  return new Array<string>(count).fill("1fr").join(" ");
}

function rangeValues(snapshot: NativeComponentSnapshot): [number, number] {
  const value: ESObject = Reflect.get(snapshot.properties, "value");
  const minimum = numberProperty(snapshot, "min", 0);
  const maximum = numberProperty(snapshot, "max", 100);
  if (!Array.isArray(value) || value.length !== 2 ||
    typeof value[0] !== "number" || typeof value[1] !== "number") {
    return [minimum, maximum];
  }
  return [Math.max(minimum, Math.min(value[0], maximum)), Math.max(minimum, Math.min(value[1], maximum))].sort((left, right) => left - right) as [number, number];
}

function radioOptions(snapshot: NativeComponentSnapshot): Array<NativeRadioOption> {
  const value: ESObject = Reflect.get(snapshot.properties, "options");
  if (!Array.isArray(value)) return [];
  const options: Array<NativeRadioOption> = [];
  value.forEach((candidate: ESObject) => {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return;
    const option = candidate as Record<string, ESObject>;
    const optionValue: ESObject = Reflect.get(option, "value");
    const optionLabel: ESObject = Reflect.get(option, "label");
    const value: ESObject = typeof optionValue === "string" ? optionValue : optionLabel;
    if (typeof value !== "string" || value.length === 0) return;
    options.push(new NativeRadioOption(typeof optionLabel === "string" ? optionLabel : value, value));
  });
  return options;
}

function dateValue(snapshot: NativeComponentSnapshot): Date {
  const value = stringProperty(snapshot, "value");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return new Date();
  const result = new Date(`${value}T00:00:00`);
  return Number.isNaN(result.getTime()) ? new Date() : result;
}

function timeValue(snapshot: NativeComponentSnapshot): Date {
  const result = new Date();
  const value = stringProperty(snapshot, "value").match(/^(\d{2}):(\d{2})$/u);
  if (value === null) return result;
  const hour = Number(value[1]);
  const minute = Number(value[2]);
  if (hour > 23 || minute > 59) return result;
  result.setHours(hour, minute, 0, 0);
  return result;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}
