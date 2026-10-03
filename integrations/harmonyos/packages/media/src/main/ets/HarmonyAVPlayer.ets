import { url } from "@kit.ArkTS";
import { media } from "@kit.MediaKit";
import type { MediaPlatform } from "./HarmonyMedia.ts";

interface HarmonyMediaStatus {
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
    return new HarmonyAVPlayer(await media.createAVPlayer());
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

  async load(parameters: Readonly<Record<string, ESObject>>): Promise<ESObject> {
    this.assertActive();
    const options = parameters as HarmonyMediaLoadParameters;
    const source = options.url;
    if (typeof source !== "string") throw new TypeError("media.load requires params.url");
    const mediaUrl = new url.URL(source);
    if (mediaUrl.protocol !== "https:" && mediaUrl.protocol !== "http:") {
      throw new TypeError("media.load only accepts HTTP or HTTPS URLs");
    }
    if (this.player.state !== "idle") await this.player.reset();
    this.player.url = mediaUrl.href;
    await this.player.prepare();
    if (options.autoplay === true) await this.player.play();
    return this.status();
  }

  async play(): Promise<ESObject> {
    this.assertActive();
    await this.player.play();
    return this.status();
  }

  async pause(): Promise<ESObject> {
    this.assertActive();
    await this.player.pause();
    return this.status();
  }

  async stop(): Promise<ESObject> {
    this.assertActive();
    await this.player.stop();
    return this.status();
  }

  seek(position: number): ESObject {
    this.assertActive();
    this.player.seek(position, media.SeekMode.SEEK_CLOSEST);
    return this.status();
  }

  async release(): Promise<ESObject> {
    if (this.released) return unavailableStatus();
    this.released = true;
    await this.player.release();
    return unavailableStatus();
  }

  private assertActive(): void {
    if (this.released || this.player.state === "released") {
      throw new Error("HarmonyOS media player was released");
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
