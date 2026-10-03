import {
  BuilderNode,
  FrameNode,
  NodeController,
  NodeRenderType,
} from "@kit.ArkUI";
import { map, mapCommon, MapComponent } from "@kit.MapKit";
import type {
  ArkUISameLayerControllerFactory,
  NativeComponentEventEmitter,
  NativeComponentSnapshot,
  NativeNodeRect,
  SameLayerController,
  SameLayerEmbed,
} from "@angular-wave/angular-native-harmony-core";
import { HarmonyMap } from "./HarmonyMap.ts";
import type { MapPlatform } from "./HarmonyMap.ts";

interface MapMarkerValue {
  readonly id?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly title?: string;
  readonly snippet?: string;
}

interface MapMethodResult {
  readonly accepted: boolean;
}

class HarmonyMapNodeParameters {
  snapshot: NativeComponentSnapshot;
  width: number;
  height: number;
  connect: (error: Error | undefined, controller: map.MapComponentController) => void;

  constructor(
    snapshot: NativeComponentSnapshot,
    width: number,
    height: number,
    connect: (error: Error | undefined, controller: map.MapComponentController) => void,
  ) {
    this.snapshot = snapshot;
    this.width = width;
    this.height = height;
    this.connect = connect;
  }
}

@Component
struct AngularNativeMapElement {
  @Prop params: HarmonyMapNodeParameters;

  build() {
    MapComponent({
      mapOptions: initialMapOptions(this.params.snapshot),
      mapCallback: (
        error: Error | undefined,
        controller: map.MapComponentController,
      ) => this.params.connect(error, controller),
    })
      .width(this.params.width)
      .height(this.params.height);
  }
}

@Builder
function harmonyMapBuilder(params: HarmonyMapNodeParameters) {
  AngularNativeMapElement({ params });
}

class HarmonyMapKitPlatform implements MapPlatform {
  private readonly controller: map.MapComponentController;
  private readonly emit: NativeComponentEventEmitter;
  private readonly events: map.MapEventManager;
  private markers: Array<map.Marker> = [];
  private markerIds = new Map<string, string>();
  private disposed = false;

  constructor(
    controller: map.MapComponentController,
    emit: NativeComponentEventEmitter,
  ) {
    this.controller = controller;
    this.emit = emit;
    this.events = controller.getEventManager();
    this.events.on("mapLoad", () => this.emit("ready"));
    this.events.on("mapClick", (position: mapCommon.LatLng) => {
      this.emit("mapClick", {
        latitude: position.latitude,
        longitude: position.longitude,
      });
    });
    this.events.on("cameraChange", () => {
      const position = this.controller.getCameraPosition();
      this.emit("cameraChange", {
        latitude: position.target.latitude,
        longitude: position.target.longitude,
        zoom: position.zoom,
      });
    });
    this.events.on("markerClick", (marker: map.Marker) => {
      this.emit("markerClick", {
        id: this.markerIds.get(marker.getId()) ?? marker.getId(),
      });
    });
  }

  update(properties: Readonly<Record<string, ESObject>>): void {
    this.assertActive();
    this.controller.moveCamera(cameraUpdate(properties));
    this.controller.setMapType(properties.mapType === "none" ? 0 : 1);
    this.controller.setTrafficEnabled(properties.traffic === true);
    this.controller.setMyLocationEnabled(properties.userLocation === true);
    void this.replaceMarkers(properties.markers as Array<MapMarkerValue>);
  }

  invoke(
    method: "move" | "animate" | "fitMarkers",
    parameters: Readonly<Record<string, ESObject>>,
  ): Object {
    this.assertActive();
    if (method === "move") {
      this.controller.moveCamera(cameraUpdate(parameters));
    } else if (method === "animate") {
      this.controller.animateCamera(cameraUpdate(parameters), 300);
    } else {
      const markers = this.currentMarkerValues(parameters);
      if (markers.length > 0) {
        this.controller.moveCamera(map.newLatLngBounds(markerBounds(markers), 24));
      }
    }
    const result: MapMethodResult = { accepted: true };
    return result;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.controller.clear();
    this.markers = [];
    this.markerIds.clear();
  }

  private async replaceMarkers(markers: Array<MapMarkerValue>): Promise<void> {
    if (this.disposed) return;
    for (const marker of this.markers) marker.remove();
    this.markers = [];
    this.markerIds.clear();
    for (const value of markers) {
      const options: mapCommon.MarkerOptions = {
        position: { latitude: value.latitude, longitude: value.longitude },
        clickable: true,
        title: value.title,
        snippet: value.snippet,
      };
      const marker = await this.controller.addMarker(options);
      if (this.disposed) {
        marker.remove();
        return;
      }
      this.markers.push(marker);
      if (value.id !== undefined) this.markerIds.set(marker.getId(), value.id);
    }
  }

  private currentMarkerValues(
    parameters: Readonly<Record<string, ESObject>>,
  ): Array<MapMarkerValue> {
    const values: ESObject = parameters.markers;
    if (Array.isArray(values)) return values as Array<MapMarkerValue>;
    return this.markers.map((marker): MapMarkerValue => {
      const position = marker.getPosition();
      return { latitude: position.latitude, longitude: position.longitude };
    });
  }

  private assertActive(): void {
    if (this.disposed) throw new Error("HarmonyOS map was disposed");
  }
}

export class HarmonyMapNodeController extends NodeController implements SameLayerController {
  private readonly embed: SameLayerEmbed;
  private rootNode: BuilderNode<[HarmonyMapNodeParameters]> | null = null;
  private parameters: HarmonyMapNodeParameters | null = null;
  private snapshot: NativeComponentSnapshot | null = null;
  private emit: NativeComponentEventEmitter | null = null;
  private platform: HarmonyMapKitPlatform | null = null;
  private mapValue: HarmonyMap | null = null;

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
      this.rootNode.build(wrapBuilder(harmonyMapBuilder), this.parameters);
    }
    return this.rootNode.getFrameNode();
  }

  update(
    snapshot: NativeComponentSnapshot,
    _primitive: string,
    emit: NativeComponentEventEmitter,
  ): void {
    this.snapshot = snapshot;
    this.emit = emit;
    this.parameters = new HarmonyMapNodeParameters(
      snapshot,
      this.parameters?.width ?? this.embed.width,
      this.parameters?.height ?? this.embed.height,
      (
        error: Error | undefined,
        controller: map.MapComponentController,
      ) => this.connect(error, controller),
    );
    this.rootNode?.update(this.parameters);
    this.rebuild();
    this.mapValue?.update(snapshot.properties);
  }

  layout(rect: NativeNodeRect): void {
    if (this.parameters === null) return;
    this.parameters = new HarmonyMapNodeParameters(
      this.parameters.snapshot,
      rect.width,
      rect.height,
      this.parameters.connect,
    );
    this.rootNode?.update(this.parameters);
  }

  invoke(
    method: string,
    argumentsValue: Readonly<Record<string, ESObject>>,
  ): Object | Promise<Object> {
    if (this.mapValue === null) throw new Error("HarmonyOS map is not ready");
    return this.mapValue.invoke(method, argumentsValue) as Object | Promise<Object>;
  }

  postTouchEvent(event: ESObject): boolean {
    return this.rootNode?.postTouchEvent(event as TouchEvent) as boolean;
  }

  dispose(): void {
    this.mapValue?.close();
    this.mapValue = null;
    this.platform = null;
    this.rootNode = null;
    this.rebuild();
  }

  private connect(
    error: Error | undefined,
    controller: map.MapComponentController,
  ): void {
    if (error || this.snapshot === null || this.emit === null) return;
    this.mapValue?.close();
    this.platform = new HarmonyMapKitPlatform(controller, this.emit);
    this.mapValue = new HarmonyMap(this.platform);
    this.mapValue.update(this.snapshot.properties);
  }
}

export const harmonyMapControllerFactory: ArkUISameLayerControllerFactory = (
  embed: SameLayerEmbed,
  snapshot: NativeComponentSnapshot,
) => snapshot.name === "map" ? new HarmonyMapNodeController(embed) : undefined;

function initialMapOptions(snapshot: NativeComponentSnapshot): mapCommon.MapOptions {
  return {
    position: {
      target: {
        latitude: numberProperty(snapshot.properties, "latitude", 0),
        longitude: numberProperty(snapshot.properties, "longitude", 0),
      },
      zoom: numberProperty(snapshot.properties, "zoom", 12),
    },
  };
}

function cameraUpdate(properties: Readonly<Record<string, ESObject>>): map.CameraUpdate {
  return map.newLatLng(
    {
      latitude: numberProperty(properties, "latitude", 0),
      longitude: numberProperty(properties, "longitude", 0),
    },
    numberProperty(properties, "zoom", 12),
  );
}

function markerBounds(markers: Array<MapMarkerValue>): mapCommon.LatLngBounds {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const marker of markers) {
    north = Math.max(north, marker.latitude);
    south = Math.min(south, marker.latitude);
    east = Math.max(east, marker.longitude);
    west = Math.min(west, marker.longitude);
  }
  return {
    northeast: { latitude: north, longitude: east },
    southwest: { latitude: south, longitude: west },
  };
}

function numberProperty(
  properties: Readonly<Record<string, ESObject>>,
  name: string,
  fallback: number,
): number {
  const value: ESObject = Reflect.get(properties, name);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
