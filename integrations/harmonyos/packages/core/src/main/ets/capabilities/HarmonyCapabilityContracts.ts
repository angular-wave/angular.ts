export interface HarmonyInsets {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export function permissionStatus(permission: string, granted: boolean, canRequest = true): Readonly<Record<string, unknown>> {
  return { permission, granted, canRequest: !granted && canRequest };
}

export function connectivityStatus(connected: boolean, validated = connected, metered = false): Readonly<Record<string, unknown>> {
  return { connected, validated: connected && validated, metered: connected && metered };
}

export function lifecycleStatus(state: "foreground" | "background" | "inactive"): Readonly<Record<string, unknown>> {
  if (state === "foreground") return { state: "resumed", active: true };
  if (state === "background") return { state: "started", active: false };
  return { state: "initialized", active: false };
}

export function windowStatus(
  width: number,
  height: number,
  safeArea: HarmonyInsets = { left: 0, top: 0, right: 0, bottom: 0 },
  displayFeatures: readonly Readonly<Record<string, unknown>>[] = [],
): Readonly<Record<string, unknown>> {
  return {
    width,
    height,
    widthClass: width < 600 ? "compact" : width < 840 ? "medium" : width < 1200 ? "expanded" : width < 1600 ? "large" : "extra-large",
    heightClass: height < 480 ? "compact" : height < 900 ? "medium" : "expanded",
    orientation: width > height ? "landscape" : "portrait",
    safeArea: { ...safeArea },
    displayFeatures: [...displayFeatures],
  };
}

export function geolocationPosition(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return {
    latitude: finite(value.latitude, 0),
    longitude: finite(value.longitude, 0),
    accuracy: finite(value.accuracy, 0),
    altitude: nullableFinite(value.altitude),
    altitudeAccuracy: nullableFinite(value.altitudeAccuracy),
    heading: nullableFinite(value.heading),
    speed: nullableFinite(value.speed),
    timestamp: finite(value.timestamp, Date.now()),
  };
}

export function fileStatus(available: boolean): Readonly<Record<string, unknown>> {
  return { available, contentUris: available, upload: available };
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
