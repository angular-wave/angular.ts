// Generated from the Player AngularTS Wasm contract for TypeScript. Do not edit.
/** Reactive player state shared between AngularTS and WebAssembly runtimes. */
export interface PlayerValues {
  /** Horizontal world position. */
  readonly "position.x": number;
  /** Vertical world position. */
  readonly "position.y": number;
  /** Current player health. */
  readonly "health": number;
  /** Player display name. */
  readonly "name": string;
  /** Optional binary frame payload. */
  readonly "frame"?: Uint8Array;
}

export const PlayerPaths = Object.freeze({
  PositionX: "position.x",
  PositionY: "position.y",
  Health: "health",
  Name: "name",
  Frame: "frame",
} as const);
