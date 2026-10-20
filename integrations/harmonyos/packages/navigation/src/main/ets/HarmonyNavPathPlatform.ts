import type {
  NavigationEntry,
  NavigationPlatform,
  NavigationTransition,
} from "./HarmonyNavigation.ts";

export interface HarmonyNavPathInfo {
  readonly name: string;
  readonly param: HarmonyNavPathParameters;
}

export interface HarmonyNavPathParameters {
  readonly entry: NavigationEntry;
}

export interface HarmonyNavPathStack {
  pushPath(info: HarmonyNavPathInfo, animated?: boolean): void;
  replacePath(info: HarmonyNavPathInfo, animated?: boolean): void;
  pop(animated?: boolean): unknown;
}

export type HarmonyExternalNavigator = (location: string) => void | Promise<void>;

type HarmonyNavPathMutation = "push" | "replace" | "pop";

/** Applies AngularTS route transactions to an ArkUI NavPathStack. */
export class HarmonyNavPathPlatform implements NavigationPlatform {
  private readonly stack: HarmonyNavPathStack;
  private readonly destinationName: string;
  private readonly external: HarmonyExternalNavigator;
  private activeMutation: HarmonyNavPathMutation | undefined;

  constructor(
    stack: HarmonyNavPathStack,
    external: HarmonyExternalNavigator,
    destinationName = "angular-native",
  ) {
    if (destinationName.length === 0) throw new TypeError("destinationName is required");
    this.stack = stack;
    this.external = external;
    this.destinationName = destinationName;
  }

  apply(
    operation: "push" | "replace" | "pop" | "modal",
    entries: readonly NavigationEntry[],
    transition: NavigationTransition,
  ): void {
    const animated = transition !== "none";
    if (operation === "pop") {
      this._mutate("pop", () => this.stack.pop(animated));
      return;
    }
    const entry = entries[entries.length - 1];
    if (entry === undefined) throw new TypeError(`${operation} requires a destination`);
    const info: HarmonyNavPathInfo = {
      name: this.destinationName,
      param: { entry },
    };
    if (operation === "replace") {
      this._mutate("replace", () => this.stack.replacePath(info, animated));
    } else {
      this._mutate("push", () => this.stack.pushPath(info, animated));
    }
  }

  /** @internal */
  isApplying(operation: HarmonyNavPathMutation): boolean {
    return this.activeMutation === operation;
  }

  openExternal(location: string): void | Promise<void> {
    return this.external(location);
  }

  /** @internal */

  private _mutate(operation: HarmonyNavPathMutation, mutation: () => unknown): void {
    this.activeMutation = operation;
    try {
      mutation();
    } finally {
      this.activeMutation = undefined;
    }
  }
}

export function navigationEntry(value: unknown): NavigationEntry {
  if (typeof value !== "object" || value === null || !("entry" in value)) {
    throw new TypeError("NavDestination parameters do not contain an AngularTS entry");
  }
  const entry = value.entry;
  if (
    typeof entry !== "object" ||
    entry === null ||
    !("id" in entry) ||
    typeof entry.id !== "string" ||
    !("location" in entry) ||
    typeof entry.location !== "string"
  ) {
    throw new TypeError("NavDestination contains an invalid AngularTS entry");
  }
  return entry as NavigationEntry;
}
