import { HarmonyAVPlayer } from "./HarmonyAVPlayer.ets";
import { HarmonyMedia } from "./HarmonyMedia.ts";
import type { MediaPlatform } from "./HarmonyMedia.ts";

class LazyHarmonyAVPlayer implements MediaPlatform {
  private player: Promise<HarmonyAVPlayer> | undefined;

  status(): ESObject {
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

  load(parameters: Readonly<Record<string, ESObject>>): Promise<ESObject> {
    return this.withPlayer((value) => value.load(parameters));
  }

  play(): Promise<ESObject> {
    return this.withPlayer((value) => value.play());
  }

  pause(): Promise<ESObject> {
    return this.withPlayer((value) => value.pause());
  }

  stop(): Promise<ESObject> {
    return this.withPlayer((value) => value.stop());
  }

  seek(position: number): Promise<ESObject> {
    return this.withPlayer((value): ESObject => value.seek(position));
  }

  async release(): Promise<ESObject> {
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
