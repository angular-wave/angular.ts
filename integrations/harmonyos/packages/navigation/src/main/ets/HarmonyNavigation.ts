export type NavigationTransition =
  | "default"
  | "none"
  | "slide"
  | "fade"
  | "cover"
  | "dive"
  | "flip";

export interface NavigationEntry {
  readonly id: string;
  readonly location: string;
  readonly modal: boolean;
  readonly transition: NavigationTransition;
  readonly state: Readonly<Record<string, unknown>>;
}

export interface NavigationPlatform {
  apply(
    operation: "push" | "replace" | "pop" | "modal",
    entries: readonly NavigationEntry[],
    transition: NavigationTransition,
  ): void | Promise<void>;
  openExternal(location: string): void | Promise<void>;
}

export type NavigationChangeSink = (
  data: Readonly<Record<string, unknown>>,
) => void;

export class HarmonyNavigation {
  private readonly platform: NavigationPlatform;
  private readonly emit: NavigationChangeSink;
  private readonly entries: NavigationEntry[] = [];
  private reducedMotion = false;
  private nextId = 1;
  private nextTransaction = 1;
  private pending: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(platform: NavigationPlatform, emit: NavigationChangeSink) {
    this.platform = platform;
    this.emit = emit;
  }

  async invoke(
    method: string,
    parameters: Readonly<Record<string, unknown>> | null,
  ): Promise<unknown> {
    this._assertActive();
    switch (method) {
      case "status":
        return this._transaction(async () => this._status());
      case "push":
        return this._transaction(() => this._open("push", "push", parameters, false));
      case "replace":
        return this._transaction(() => this._open("replace", "replace", parameters, false));
      case "modal":
        return this._transaction(() => this._open("modal", "modal", parameters, true));
      case "pop":
        return this._transaction(() => this._pop());
      case "deep-link":
        return this._transaction(() => this._open("push", "deep-link", parameters, false));
      case "external": {
        const location = safeLocation(parameters?.url, true);
        return this._transaction(async () => {
          await this.platform.openExternal(location);
          this._assertActive();
          return { location, external: true };
        });
      }
      default:
        throw navigationError("unknown_method", `Unsupported navigation method: ${method}`);
    }
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  systemPop(): void {
    if (this.closed) return;
    void this._transaction(async () => {
      if (this.entries.length <= 1) return;
      const from = (this.entries.pop() as NavigationEntry).location;
      this.emit({
        method: "pop",
        phase: "completed",
        source: "harmonyos",
        from,
        url: (this.entries[this.entries.length - 1] as NavigationEntry).location,
      });
    });
  }

  restore(entries: readonly NavigationEntry[]): void {
    this._assertActive();
    this.entries.splice(0, this.entries.length, ...entries.map(validateEntry));
  }

  close(): void {
    this.closed = true;
    this.entries.length = 0;
  }

  /** @internal */

  private _status(): Readonly<Record<string, unknown>> {
    const current = this.entries[this.entries.length - 1];
    return {
      location: current?.location ?? null,
      previousLocation: this.entries[this.entries.length - 2]?.location ?? null,
      canPop: this.entries.length > 1,
      modal: current?.modal ?? false,
    };
  }

  /** @internal */

  private async _open(
    operation: "push" | "replace" | "modal",
    method: "push" | "replace" | "modal" | "deep-link",
    parameters: Readonly<Record<string, unknown>> | null,
    modal: boolean,
  ): Promise<unknown> {
    const location = safeLocation(parameters?.url, false);
    const requested = transitionValue(parameters?.transition);
    const transition = this.reducedMotion && requested !== "none" ? "fade" : requested;
    const state = recordValue(parameters?.state);
    const entry: NavigationEntry = {
      id: `destination-${String(this.nextId++)}`,
      location,
      modal,
      transition,
      state,
    };
    const next = [...this.entries];
    if (operation === "replace" && next.length > 0) next.pop();
    const from = next[next.length - 1]?.location ?? null;
    next.push(entry);
    const transaction = this.nextTransaction++;
    await this.platform.apply(operation, next, transition);
    this._assertActive();
    this.entries.splice(0, this.entries.length, ...next);
    this.emit({ transaction, method, phase: "completed", source: "bridge", from, url: location });
    return {
      routed: true,
      method,
      phase: "accepted",
      transaction,
      url: location,
      action: operation === "replace" ? "replace" : "advance",
      transition,
    };
  }

  /** @internal */

  private async _pop(): Promise<unknown> {
    if (this.entries.length <= 1) return { ...this._status(), routed: false, method: "pop" };
    const next = [...this.entries];
    const removed = next.pop() as NavigationEntry;
    const transition = this.reducedMotion ? "fade" : removed.transition;
    const transaction = this.nextTransaction++;
    await this.platform.apply("pop", next, transition);
    this._assertActive();
    this.entries.splice(0, this.entries.length, ...next);
    const url = (next[next.length - 1] as NavigationEntry).location;
    this.emit({ transaction, method: "pop", phase: "completed", source: "bridge", from: removed.location, url });
    return {
      routed: true,
      method: "pop",
      phase: "accepted",
      transaction,
      from: removed.location,
      url,
    };
  }

  /** @internal */

  private _assertActive(): void {
    if (this.closed) throw navigationError("interrupted", "Navigation destination was removed");
  }

  /** @internal */

  private _transaction<Result>(operation: () => Promise<Result>): Promise<Result> {
    const result = this.pending.then(() => {
      this._assertActive();
      return operation();
    });
    this.pending = result.then(() => undefined, () => undefined);
    return result;
  }
}

function safeLocation(value: unknown, external: boolean): string {
  if (typeof value !== "string" || value.length === 0) {
    throw navigationError("invalid_params", "navigation requires params.url");
  }
  if (/[\u0000-\u0020\\]/u.test(value)) {
    throw navigationError("invalid_params", "navigation location is invalid");
  }
  if (!external && value.startsWith("/")) return value;
  const schemeBoundary = value.indexOf(":");
  if (schemeBoundary < 1) {
    throw navigationError("invalid_params", "navigation location is invalid");
  }
  const scheme = value.slice(0, schemeBoundary).toLowerCase();
  if (scheme !== "http" && scheme !== "https") {
    throw navigationError("unauthorized", "navigation scheme is not allowed");
  }
  if (value.slice(schemeBoundary, schemeBoundary + 3) !== "://") {
    throw navigationError("invalid_params", "navigation location is invalid");
  }
  const remainder = value.slice(schemeBoundary + 3);
  const pathBoundary = remainder.search(/[/?#]/u);
  const authority = pathBoundary < 0 ? remainder : remainder.slice(0, pathBoundary);
  const suffix = pathBoundary < 0 ? "" : remainder.slice(pathBoundary);
  if (authority.length === 0 || authority.includes("@")) {
    throw navigationError("unauthorized", "navigation origin is not allowed");
  }
  const parsedAuthority = parseHttpAuthority(authority);
  if (parsedAuthority === null) {
    throw navigationError("invalid_params", "navigation location is invalid");
  }
  const defaultPort = scheme === "https" ? 443 : 80;
  const port = parsedAuthority.port === null ? defaultPort : parsedAuthority.port;
  const serializedPort = port === defaultPort ? "" : `:${port}`;
  const path = suffix.length === 0 || suffix.startsWith("?") || suffix.startsWith("#")
    ? `/${suffix}`
    : suffix;
  return `${scheme}://${parsedAuthority.host}${serializedPort}${path}`;
}

function parseHttpAuthority(authority: string): { readonly host: string; readonly port: number | null } | null {
  if (authority.startsWith("[")) {
    const closingBracket = authority.indexOf("]");
    if (closingBracket < 2) return null;
    const address = authority.slice(1, closingBracket).toLowerCase();
    if (!/^[0-9a-f:.]+$/u.test(address) || !address.includes(":")) return null;
    const port = parsePort(authority.slice(closingBracket + 1));
    return port === undefined ? null : { host: `[${address}]`, port };
  }
  const separator = authority.lastIndexOf(":");
  const host = (separator < 0 ? authority : authority.slice(0, separator)).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(host) || host.includes("..")) {
    return null;
  }
  const port = parsePort(separator < 0 ? "" : authority.slice(separator));
  return port === undefined ? null : { host, port };
}

function parsePort(value: string): number | null | undefined {
  if (value.length === 0) return null;
  if (!/^:\d+$/u.test(value)) return undefined;
  const port = Number(value.slice(1));
  return port >= 1 && port <= 65535 ? port : undefined;
}

function transitionValue(value: unknown): NavigationTransition {
  const transition = value ?? "default";
  if (
    typeof transition !== "string" ||
    !new Set(["default", "none", "slide", "fade", "cover", "dive", "flip"]).has(transition)
  ) {
    throw navigationError("invalid_params", "navigation transition is invalid");
  }
  return transition as NavigationTransition;
}

function recordValue(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : {};
}

function validateEntry(entry: NavigationEntry): NavigationEntry {
  safeLocation(entry.location, false);
  transitionValue(entry.transition);
  return { ...entry, state: recordValue(entry.state) };
}

function navigationError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}
