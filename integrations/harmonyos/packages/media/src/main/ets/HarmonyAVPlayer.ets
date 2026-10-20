import { url } from "@kit.ArkTS";
import { media } from "@kit.MediaKit";
import type { MediaPlatform } from "./HarmonyMedia.ts";

export interface HarmonyMediaStatus {
  readonly available: boolean;
  readonly loaded: boolean;
  readonly playing: boolean;
  readonly position: number;
  readonly duration: number | null;
  readonly state: string;
}

interface HarmonyMediaLoadParameters {
  readonly url?: string;
  readonly autoplay?: boolean;
}

export class HarmonyAVPlayer implements MediaPlatform {
  private readonly player: media.AVPlayer;
  private released = false;

  private constructor(player: media.AVPlayer) {
    this.player = player;
  }

  static async create(): Promise<HarmonyAVPlayer> {
    try {
      return new HarmonyAVPlayer(await media.createAVPlayer());
    } catch {
      throw new Error("HarmonyOS could not create a media player");
    }
  }

  status(): HarmonyMediaStatus {
    const state = this.player.state;
    return {
      available: !this.released && state !== "released" && state !== "error",
      loaded: !["idle", "initialized", "released", "error"].includes(state),
      playing: state === "playing",
      position: this.player.currentTime,
      duration: this.player.duration >= 0 ? this.player.duration : null,
      state: normalizedState(state),
    };
  }

  async load(parameters: Readonly<Record<string, ESObject>>): Promise<HarmonyMediaStatus> {
    this.assertActive();
    const options = parameters as HarmonyMediaLoadParameters;
    const source = options.url;
    if (typeof source !== "string") throw new TypeError("media.load requires params.url");
    const mediaUrl = new url.URL(source);
    if (mediaUrl.protocol !== "https:" && mediaUrl.protocol !== "http:") {
      throw new TypeError("media.load only accepts HTTP or HTTPS URLs");
    }
    if (this.player.state !== "idle") await this._run("reset");
    this.player.url = mediaUrl.href;
    await this._run("prepare");
    if (options.autoplay === true) await this._run("play");
    return this.status();
  }

  async play(): Promise<HarmonyMediaStatus> {
    this.assertActive();
    await this._run("play");
    return this.status();
  }

  async pause(): Promise<HarmonyMediaStatus> {
    this.assertActive();
    await this._run("pause");
    return this.status();
  }

  async stop(): Promise<HarmonyMediaStatus> {
    this.assertActive();
    await this._run("stop");
    return this.status();
  }

  seek(position: number): HarmonyMediaStatus {
    this.assertActive();
    try {
      this.player.seek(position, media.SeekMode.SEEK_CLOSEST);
    } catch {
      throw new Error("HarmonyOS media seek failed");
    }
    return this.status();
  }

  async release(): Promise<HarmonyMediaStatus> {
    if (this.released) return unavailableStatus();
    this.released = true;
    await this._run("release");
    return unavailableStatus();
  }

  private assertActive(): void {
    if (this.released || this.player.state === "released") {
      throw new Error("HarmonyOS media player was released");
    }
  }

  /** @internal */

  private async _run(operation: string): Promise<void> {
    try {
      switch (operation) {
        case "reset": await this.player.reset(); return;
        case "prepare": await this.player.prepare(); return;
        case "play": await this.player.play(); return;
        case "pause": await this.player.pause(); return;
        case "stop": await this.player.stop(); return;
        case "release": await this.player.release(); return;
        default: throw new Error(`Unsupported media operation: ${operation}`);
      }
    } catch {
      throw new Error(`HarmonyOS media ${operation} failed`);
    }
  }
}

function normalizedState(state: media.AVPlayerState): "idle" | "buffering" | "ready" | "ended" {
  if (state === "completed") return "ended";
  if (state === "prepared" || state === "playing" || state === "paused" || state === "stopped") return "ready";
  if (state === "initialized") return "buffering";
  return "idle";
}

function unavailableStatus(): HarmonyMediaStatus {
  return {
    available: false,
    loaded: false,
    playing: false,
    position: 0,
    duration: null,
    state: "idle",
  };
}
