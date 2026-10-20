import {
  normalizeNavigationLocation,
} from "./HarmonyNavigation.ts";
import type {
  NavigationEntry,
  NavigationTransition,
} from "./HarmonyNavigation.ts";

const RECOVERY_VERSION = 1;
const MAX_SCOPES = 4;
const MAX_ENTRIES = 32;
const MAX_LOCATION_LENGTH = 1024;
const MAX_SNAPSHOT_LENGTH = 40000;
const RECOVERY_KEY = /^[A-Za-z0-9._-]{1,64}$/u;
const RESOURCE_LOCATION = /^resource:\/\/[^\u0000-\u0020\\]+$/u;
const TRANSITIONS: readonly NavigationTransition[] = [
  "default",
  "none",
  "slide",
  "fade",
  "cover",
  "dive",
  "flip",
];

interface RecoveryEntry {
  readonly location: string;
  readonly modal: boolean;
  readonly transition: NavigationTransition;
  readonly nativeState: readonly RecoveryNativeNode[];
}

interface RecoveryNativeNode {
  readonly id: string;
  readonly name: "scroll" | "list" | "grid" | "pull-to-refresh";
  readonly state: Readonly<{ x: number; y: number }>;
}

interface RecoveryScope {
  readonly key: string;
  readonly entries: readonly RecoveryEntry[];
}

type NavigationEntriesProvider = () => readonly NavigationEntry[];
type NavigationNativeStateProvider = (
  entry: NavigationEntry,
) => readonly Readonly<{
  id: string;
  name: string;
  state: Readonly<Record<string, unknown>>;
}>[];

/** Coordinates bounded UIAbility state recovery for named navigation scopes. */
export class HarmonyNavigationRecovery {
  readonly #pending = new Map<string, readonly RecoveryEntry[]>();
  readonly #providers = new Map<string, NavigationEntriesProvider>();
  readonly #stateProviders = new Map<string, NavigationNativeStateProvider>();
  readonly #claimedState = new Map<string, readonly RecoveryNativeNode[]>();

  restore(value: unknown): void {
    this.#pending.clear();
    this.#claimedState.clear();
    if (typeof value !== "string" || value.length > MAX_SNAPSHOT_LENGTH) return;
    let decoded: unknown;
    try {
      decoded = JSON.parse(value);
    } catch {
      return;
    }
    if (!isRecord(decoded) || decoded.version !== RECOVERY_VERSION || !Array.isArray(decoded.scopes)) return;
    if (decoded.scopes.length > MAX_SCOPES) return;
    for (const valueScope of decoded.scopes) {
      const scope = recoveryScope(valueScope);
      if (scope === undefined || this.#pending.has(scope.key)) {
        this.#pending.clear();
        return;
      }
      this.#pending.set(scope.key, scope.entries);
    }
  }

  claim(key: string, root: NavigationEntry): readonly NavigationEntry[] {
    assertRecoveryKey(key);
    const entries = this.#pending.get(key);
    this.#pending.delete(key);
    if (entries === undefined || entries[0]?.location !== root.location) return [root];
    return entries.map((entry, index) => {
      const id = index === 0 ? root.id : `restored-${String(index)}`;
      if (entry.nativeState.length > 0) {
        this.#claimedState.set(`${key}\u0000${id}`, entry.nativeState);
      }
      return {
        id,
        location: entry.location,
        modal: entry.modal,
        transition: entry.transition,
        state: {},
      };
    });
  }

  takeNativeState(key: string, entryId: string): readonly RecoveryNativeNode[] {
    const stateKey = `${key}\u0000${entryId}`;
    const state = this.#claimedState.get(stateKey) ?? [];
    this.#claimedState.delete(stateKey);
    return state;
  }

  register(
    key: string,
    provider: NavigationEntriesProvider,
    stateProvider: NavigationNativeStateProvider = () => [],
  ): () => void {
    assertRecoveryKey(key);
    if (this.#providers.has(key)) {
      throw new Error(`HarmonyOS navigation recovery scope is already active: ${key}`);
    }
    this.#providers.set(key, provider);
    this.#stateProviders.set(key, stateProvider);
    return () => {
      if (this.#providers.get(key) === provider) {
        this.#providers.delete(key);
        this.#stateProviders.delete(key);
      }
    };
  }

  snapshot(): string | undefined {
    if (this.#providers.size === 0 || this.#providers.size > MAX_SCOPES) return undefined;
    const scopes: RecoveryScope[] = [];
    for (const [key, provider] of this.#providers) {
      const entries = provider();
      if (entries.length === 0 || entries.length > MAX_ENTRIES) return undefined;
      const recovered: RecoveryEntry[] = [];
      const stateProvider = this.#stateProviders.get(key) as NavigationNativeStateProvider;
      for (let index = 0; index < entries.length; index += 1) {
        const entry = recoveryEntry({
          ...entries[index],
          nativeState: stateProvider(entries[index] as NavigationEntry),
        }, index === 0);
        if (entry === undefined) return undefined;
        recovered.push(entry);
      }
      scopes.push({ key, entries: recovered });
    }
    const snapshot = JSON.stringify({ version: RECOVERY_VERSION, scopes });
    return snapshot.length <= MAX_SNAPSHOT_LENGTH ? snapshot : undefined;
  }
}

export const harmonyNavigationRecovery = new HarmonyNavigationRecovery();
export const HARMONY_NAVIGATION_RECOVERY_PARAMETER = "angularTs.navigation";

function recoveryScope(value: unknown): RecoveryScope | undefined {
  if (!isRecord(value) || typeof value.key !== "string" || !RECOVERY_KEY.test(value.key)) return undefined;
  if (!Array.isArray(value.entries) || value.entries.length === 0 || value.entries.length > MAX_ENTRIES) {
    return undefined;
  }
  const entries: RecoveryEntry[] = [];
  for (let index = 0; index < value.entries.length; index += 1) {
    const entry = recoveryEntry(value.entries[index], index === 0);
    if (entry === undefined) return undefined;
    entries.push(entry);
  }
  return { key: value.key, entries };
}

function recoveryEntry(value: unknown, root: boolean): RecoveryEntry | undefined {
  if (
    !isRecord(value) ||
    typeof value.location !== "string" ||
    value.location.length > MAX_LOCATION_LENGTH ||
    typeof value.modal !== "boolean" ||
    (root && value.modal) ||
    typeof value.transition !== "string" ||
    !TRANSITIONS.includes(value.transition as NavigationTransition) ||
    !isRecoveryLocation(value.location, root)
  ) {
    return undefined;
  }
  const nativeState = recoveryNativeState(value.nativeState);
  if (nativeState === undefined) return undefined;
  return {
    location: value.location,
    modal: value.modal,
    transition: value.transition as NavigationTransition,
    nativeState,
  };
}

function recoveryNativeState(value: unknown): readonly RecoveryNativeNode[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 128) return undefined;
  const ids = new Set<string>();
  const result: RecoveryNativeNode[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate.id !== "string" || typeof candidate.name !== "string") {
      return undefined;
    }
    if (
      !["scroll", "list", "grid", "pull-to-refresh"].includes(candidate.name) ||
      ids.has(candidate.id) ||
      !isRecord(candidate.state)
    ) {
      return undefined;
    }
    const x = candidate.state.x;
    const y = candidate.state.y;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      y < 0
    ) {
      return undefined;
    }
    ids.add(candidate.id);
    result.push({
      id: candidate.id,
      name: candidate.name as RecoveryNativeNode["name"],
      state: { x, y },
    });
  }
  return result;
}

function isRecoveryLocation(location: string, root: boolean): boolean {
  if (root && RESOURCE_LOCATION.test(location)) return true;
  try {
    return normalizeNavigationLocation(location, false) === location;
  } catch {
    return false;
  }
}

function assertRecoveryKey(key: string): void {
  if (!RECOVERY_KEY.test(key)) throw new TypeError("HarmonyOS navigation recovery key is invalid");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
