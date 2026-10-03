export interface MediaPlatform {
  status(): unknown;
  load(parameters: Readonly<Record<string, unknown>>): unknown | Promise<unknown>;
  play(): unknown | Promise<unknown>;
  pause(): unknown | Promise<unknown>;
  stop(): unknown | Promise<unknown>;
  seek(position: number): unknown | Promise<unknown>;
  release(): unknown | Promise<unknown>;
}

export class HarmonyMedia {
  private readonly platform: MediaPlatform;
  private closed = false;

  constructor(platform: MediaPlatform) {
    this.platform = platform;
  }
  invoke(method: string, parameters: Readonly<Record<string, unknown>> | null): unknown | Promise<unknown> {
    if (this.closed) throw new Error("HarmonyOS media handler was disposed");
    switch (method) {
      case "status": return this.platform.status();
      case "load": return this.platform.load(parameters ?? {});
      case "play": return this.platform.play();
      case "pause": return this.platform.pause();
      case "stop": return this.platform.stop();
      case "seek": {
        const position = parameters?.position;
        if (typeof position !== "number" || position < 0) throw new TypeError("media.seek requires a non-negative position");
        return this.platform.seek(position);
      }
      case "release": return this.platform.release();
      default: throw new Error(`Unsupported media method: ${method}`);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    void Promise.resolve(this.platform.release());
  }
}
