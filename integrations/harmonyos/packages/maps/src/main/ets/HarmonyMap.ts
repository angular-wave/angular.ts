export interface MapPlatform {
  update(properties: Readonly<Record<string, unknown>>): void;
  invoke(method: "move" | "animate" | "fitMarkers", parameters: Readonly<Record<string, unknown>>): unknown | Promise<unknown>;
  dispose(): void;
}

export class HarmonyMap {
  private readonly platform: MapPlatform;
  private closed = false;

  constructor(platform: MapPlatform) {
    this.platform = platform;
  }
  update(properties: Readonly<Record<string, unknown>>): void {
    this._assertActive();
    this.platform.update(mapProperties(properties));
  }

  invoke(method: string, parameters: Readonly<Record<string, unknown>>): unknown | Promise<unknown> {
    this._assertActive();
    if (method !== "move" && method !== "animate" && method !== "fitMarkers") {
      throw new Error(`Unsupported map method: ${method}`);
    }
    return this.platform.invoke(
      method,
      method === "fitMarkers" ? {} : cameraParameters(parameters),
    );
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.platform.dispose();
  }

  /** @internal */

  private _assertActive(): void {
    if (this.closed) throw new Error("HarmonyOS map was disposed");
  }
}

export function mapProperties(
  properties: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const mapType = optionalString(properties.mapType, "normal", "mapType");
  if (!["normal", "hybrid", "satellite", "terrain", "none"].includes(mapType)) {
    throw new TypeError("mapType is invalid");
  }
  const markers = properties.markers === undefined ? [] : markerList(properties.markers);
  return {
    ...properties,
    latitude: coordinate(properties.latitude, 0, -90, 90, "latitude"),
    longitude: coordinate(properties.longitude, 0, -180, 180, "longitude"),
    zoom: coordinate(properties.zoom, 12, 0, 30, "zoom"),
    mapType,
    traffic: optionalBoolean(properties.traffic, false, "traffic"),
    userLocation: optionalBoolean(properties.userLocation, false, "userLocation"),
    markers,
  };
}

export function cameraParameters(
  parameters: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return {
    latitude: coordinate(parameters.latitude, undefined, -90, 90, "latitude"),
    longitude: coordinate(parameters.longitude, undefined, -180, 180, "longitude"),
    ...(parameters.zoom === undefined
      ? {}
      : { zoom: coordinate(parameters.zoom, undefined, 0, 30, "zoom") }),
  };
}

function markerList(value: unknown): ReadonlyArray<Readonly<Record<string, unknown>>> {
  if (!Array.isArray(value)) throw new TypeError("markers must be an array");
  return value.map((candidate, index) => {
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
      throw new TypeError(`markers[${index}] must be an object`);
    }
    const marker = candidate as Readonly<Record<string, unknown>>;
    return {
      ...marker,
      latitude: coordinate(marker.latitude, undefined, -90, 90, `markers[${index}].latitude`),
      longitude: coordinate(marker.longitude, undefined, -180, 180, `markers[${index}].longitude`),
      ...(marker.id === undefined ? {} : { id: optionalString(marker.id, "", `markers[${index}].id`) }),
      ...(marker.title === undefined ? {} : { title: optionalString(marker.title, "", `markers[${index}].title`) }),
      ...(marker.snippet === undefined ? {} : { snippet: optionalString(marker.snippet, "", `markers[${index}].snippet`) }),
    };
  });
}

function coordinate(
  value: unknown,
  fallback: number | undefined,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be between ${minimum} and ${maximum}`);
  }
  return value;
}

function optionalString(value: unknown, fallback: string, name: string): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
  return value;
}

function optionalBoolean(value: unknown, fallback: boolean, name: string): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new TypeError(`${name} must be a boolean`);
  return value;
}
