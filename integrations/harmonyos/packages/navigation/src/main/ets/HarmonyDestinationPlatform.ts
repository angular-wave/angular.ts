import {
  HarmonyDestinationStore,
} from "./HarmonyDestinationStore.ts";
import type {
  HarmonyStoredDestination,
} from "./HarmonyDestinationStore.ts";
import type {
  NavigationEntry,
  NavigationPlatform,
  NavigationTransition,
} from "./HarmonyNavigation.ts";

export type HarmonyDestinationFactory<T extends HarmonyStoredDestination> = (
  entry: NavigationEntry,
) => T;

/** Keeps destination ownership atomic with navigation platform mutations. */
export class HarmonyDestinationPlatform<T extends HarmonyStoredDestination>
implements NavigationPlatform {
  readonly #platform: NavigationPlatform;
  readonly #store: HarmonyDestinationStore<T>;
  readonly #create: HarmonyDestinationFactory<T>;
  readonly #entries: NavigationEntry[];
  #closed = false;

  constructor(
    root: NavigationEntry,
    rootDestination: T,
    platform: NavigationPlatform,
    create: HarmonyDestinationFactory<T>,
  ) {
    this.#platform = platform;
    this.#store = new HarmonyDestinationStore(root.id, rootDestination);
    this.#create = create;
    this.#entries = [root];
  }

  get entries(): readonly NavigationEntry[] {
    return [...this.#entries];
  }

  get current(): NavigationEntry {
    this.#assertOpen();
    return this.#entries[this.#entries.length - 1] as NavigationEntry;
  }

  resolve(id: string): T {
    this.#assertOpen();
    return this.#store.resolve(id);
  }

  async apply(
    operation: "push" | "replace" | "pop" | "modal",
    entries: readonly NavigationEntry[],
    transition: NavigationTransition,
  ): Promise<void> {
    this.#assertOpen();
    this.#assertMutation(operation, entries);
    if (operation === "pop") {
      const removed = this.current;
      await this.#platform.apply(operation, entries, transition);
      this.#assertOpen();
      this.#store.commitPop(removed.id);
      this.#replaceEntries(entries);
      return;
    }

    const incoming = entries[entries.length - 1] as NavigationEntry;
    this.#store.stage(incoming.id, () => this.#create(incoming));
    try {
      await this.#platform.apply(operation, entries, transition);
      this.#assertOpen();
    } catch (error) {
      if (!this.#closed) this.#store.abort(incoming.id);
      throw error;
    }

    if (operation === "replace") {
      this.#store.commitReplace(this.current.id, incoming.id);
    } else {
      this.#store.commitPush(incoming.id);
    }
    this.#replaceEntries(entries);
  }

  async openExternal(location: string): Promise<void> {
    this.#assertOpen();
    await this.#platform.openExternal(location);
    this.#assertOpen();
  }

  systemPop(): boolean {
    this.#assertOpen();
    if (this.#entries.length === 1) return false;
    const removed = this.#entries.pop() as NavigationEntry;
    this.#store.commitPop(removed.id);
    return true;
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#entries.length = 0;
    this.#store.close();
  }

  #assertMutation(
    operation: "push" | "replace" | "pop" | "modal",
    entries: readonly NavigationEntry[],
  ): void {
    const previous = this.#entries;
    const prefix = operation === "replace" ? previous.length - 1 : entries.length - 1;
    const expectedLength = operation === "pop"
      ? previous.length - 1
      : operation === "replace"
        ? previous.length
        : previous.length + 1;
    if (
      expectedLength < 1 ||
      entries.length !== expectedLength ||
      !entries.slice(0, prefix).every((entry, index) => entry.id === previous[index]?.id)
    ) {
      throw new Error(`Invalid HarmonyOS ${operation} destination transaction`);
    }
    const incoming = entries[entries.length - 1];
    if (
      operation !== "pop" &&
      (incoming === undefined || incoming.modal !== (operation === "modal"))
    ) {
      throw new Error(`Invalid HarmonyOS ${operation} destination mode`);
    }
  }

  #replaceEntries(entries: readonly NavigationEntry[]): void {
    this.#entries.splice(0, this.#entries.length, ...entries);
  }

  #assertOpen(): void {
    if (this.#closed) throw new Error("HarmonyOS destination platform is closed");
  }
}
