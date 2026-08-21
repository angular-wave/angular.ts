// Generated from the Player AngularTS Wasm contract for AssemblyScript. Do not edit.
/** Reactive player state shared between AngularTS and WebAssembly runtimes. */
export class PlayerContract {
  /** Horizontal world position. */
  static readonly PositionXPath: string = "position.x";
  declare PositionXValue: f64;
  /** Vertical world position. */
  static readonly PositionYPath: string = "position.y";
  declare PositionYValue: f64;
  /** Current player health. */
  static readonly HealthPath: string = "health";
  declare HealthValue: u32;
  /** Player display name. */
  static readonly NamePath: string = "name";
  declare NameValue: string;
  /** Optional binary frame payload. */
  static readonly FramePath: string = "frame";
  declare FrameValue: Uint8Array;
}
