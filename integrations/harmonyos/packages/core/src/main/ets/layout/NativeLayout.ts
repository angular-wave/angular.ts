import type { NativeNodeRect } from "../nodes/NativeNodeRegistry.ts";

export interface NativeLayoutEnvironment {
  readonly density: number;
  readonly viewportOffsetX: number;
  readonly viewportOffsetY: number;
  readonly safeAreaTop: number;
  readonly safeAreaEnd: number;
  readonly safeAreaBottom: number;
  readonly safeAreaStart: number;
  readonly rightToLeft: boolean;
}

export interface NativeLayoutFrame extends NativeNodeRect {
  readonly safeArea: Readonly<{
    top: number;
    end: number;
    bottom: number;
    start: number;
  }>;
  readonly rightToLeft: boolean;
}

export function nativeLayoutFrame(
  source: NativeNodeRect,
  environment: NativeLayoutEnvironment,
): NativeLayoutFrame {
  if (!Number.isFinite(environment.density) || environment.density <= 0) {
    throw new RangeError("density must be a positive finite number");
  }
  for (const [name, value] of Object.entries(source)) {
    if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
  }
  const toVp = (value: number): number => value / environment.density;
  return {
    x: toVp(source.x - environment.viewportOffsetX),
    y: toVp(source.y - environment.viewportOffsetY),
    width: Math.max(0, toVp(source.width)),
    height: Math.max(0, toVp(source.height)),
    safeArea: {
      top: toVp(environment.safeAreaTop),
      end: toVp(environment.safeAreaEnd),
      bottom: toVp(environment.safeAreaBottom),
      start: toVp(environment.safeAreaStart),
    },
    rightToLeft: environment.rightToLeft,
  };
}
