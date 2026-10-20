import { HarmonyAVPlayer } from "./HarmonyAVPlayer.ets";
import type { HarmonyMediaStatus } from "./HarmonyAVPlayer.ets";
import { HarmonyMedia } from "./HarmonyMedia.ts";
import type { MediaPlatform } from "./HarmonyMedia.ts";

class LazyHarmonyAVPlayer implements MediaPlatform {
  private player: Promise<HarmonyAVPlayer> | undefined;

  status(): HarmonyMediaStatus | Promise<HarmonyMediaStatus> {
    return this.player === undefined
      ? {
        available: true,
        loaded: false,
        playing: false,
        position: 0,
        duration: null,
        state: "idle",
      }
      : this.withPlayer((value) => value.status());
  }

  load(parameters: Readonly<Record<string, ESObject>>): Promise<HarmonyMediaStatus> {
    return this.withPlayer((value) => value.load(parameters));
  }

  play(): Promise<HarmonyMediaStatus> {
    return this.withPlayer((value) => value.play());
  }

  pause(): Promise<HarmonyMediaStatus> {
    return this.withPlayer((value) => value.pause());
  }

  stop(): Promise<HarmonyMediaStatus> {
    return this.withPlayer((value) => value.stop());
  }

  seek(position: number): Promise<HarmonyMediaStatus> {
    return this.withPlayer((value): HarmonyMediaStatus => value.seek(position));
  }

  async release(): Promise<HarmonyMediaStatus> {
    if (this.player === undefined) {
      return {
        available: false,
        loaded: false,
        playing: false,
        position: 0,
        duration: null,
        state: "idle",
      };
    }
    const player = this.player;
    this.player = undefined;
    return (await player).release();
  }

  private withPlayer<Result>(
    operation: (player: HarmonyAVPlayer) => Result | Promise<Result>,
  ): Promise<Result> {
    this.player ??= HarmonyAVPlayer.create();
    return this.player.then(operation);
  }
}

/** Creates a destination-owned media handler without allocating a player until it is used. */
export function createHarmonyMediaHandler(): HarmonyMedia {
  return new HarmonyMedia(new LazyHarmonyAVPlayer());
}
