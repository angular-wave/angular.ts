export interface NativeStyleEnvironment {
  readonly darkMode: boolean;
  readonly reducedMotion: boolean;
  readonly fontScale: number;
}

export interface NativeStyle {
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly opacity?: number;
  readonly padding?: number;
  readonly margin?: number;
  readonly borderRadius?: number;
  readonly elevation?: number;
  readonly width?: number;
  readonly height?: number;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly gap?: number;
  readonly fontSize?: number;
  readonly fontWeight?: number;
  readonly textAlign?: string;
  readonly visible: boolean;
  readonly clip: boolean;
  readonly zIndex: number;
  readonly animate: boolean;
}

export function nativeStyle(
  source: unknown,
  environment: NativeStyleEnvironment,
): NativeStyle {
  const value = isRecord(source) ? source : {};
  const fontScale = finite(environment.fontScale, 1);
  if (fontScale <= 0) throw new RangeError("fontScale must be positive");
  return {
    ...optionalColor("color", value.color),
    ...optionalColor("backgroundColor", value.backgroundColor),
    ...optionalNumber("opacity", value.opacity, 0, 1),
    ...optionalNumber("padding", value.padding, 0),
    ...optionalNumber("margin", value.margin),
    ...optionalNumber("borderRadius", value.borderRadius, 0),
    ...optionalNumber("elevation", value.elevation, 0),
    ...optionalNumber("width", value.width, 0),
    ...optionalNumber("height", value.height, 0),
    ...optionalNumber("minWidth", value.minWidth, 0),
    ...optionalNumber("minHeight", value.minHeight, 0),
    ...optionalNumber("gap", value.gap, 0),
    ...(typeof value.fontSize === "number"
      ? { fontSize: finite(value.fontSize, 16) * fontScale }
      : {}),
    ...optionalNumber("fontWeight", value.fontWeight, 1, 1000),
    ...(typeof value.textAlign === "string" ? { textAlign: value.textAlign } : {}),
    visible: value.display !== "none" && value.visibility !== "hidden",
    clip: value.overflow === "hidden" || value.overflow === "clip",
    zIndex: finite(value.zIndex, 0),
    animate: !environment.reducedMotion,
  };
}

function optionalColor(
  property: "color" | "backgroundColor",
  value: unknown,
): Partial<NativeStyle> {
  return typeof value === "string" && /^#[\da-f]{6}(?:[\da-f]{2})?$/iu.test(value)
    ? { [property]: value }
    : {};
}

function optionalNumber(
  property: keyof NativeStyle,
  value: unknown,
  minimum = -Number.MAX_VALUE,
  maximum = Number.MAX_VALUE,
): Partial<NativeStyle> {
  if (typeof value !== "number" || !Number.isFinite(value)) return {};
  return { [property]: Math.min(maximum, Math.max(minimum, value)) };
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
