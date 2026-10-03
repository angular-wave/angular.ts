export interface HarmonyStoredDestination {
  close(): void;
}

/** @internal */
export class HarmonyDestinationStore<T extends HarmonyStoredDestination> {
  readonly #active = new Map<string, T>();
  readonly #staged = new Map<string, T>();
  #root: string;
  #closed = false;

  constructor(root: string, destination: T) {
    this._assertKey(root);
    this.#root = root;
    this.#active.set(root, destination);
  }

  get root(): string {
    return this.#root;
  }

  get size(): number {
    return this.#active.size;
  }

  resolve(key: string): T {
    this._assertOpen();
    const destination = this.#active.get(key) ?? this.#staged.get(key);
    if (!destination) throw new Error(`Unknown HarmonyOS destination: ${key}`);
    return destination;
  }

  stage(key: string, create: () => T): T {
    this._assertOpen();
    this._assertKey(key);
    const current = this.#active.get(key) ?? this.#staged.get(key);
    if (current) return current;
    const destination = create();
    this.#staged.set(key, destination);
    return destination;
  }

  commitPush(key: string): void {
    this._assertOpen();
    this._activate(key);
  }

  commitReplace(removed: string, replacement: string): void {
    this._assertOpen();
    if (!this.#active.has(removed)) {
      throw new Error(`Cannot replace unknown HarmonyOS destination: ${removed}`);
    }
    const destination = this._activate(replacement);
    if (removed === replacement) return;
    const previous = this.#active.get(removed);
    this.#active.delete(removed);
    if (this.#root === removed) this.#root = replacement;
    if (previous !== destination) previous?.close();
  }

  commitPop(key: string): void {
    this._assertOpen();
    if (key === this.#root) throw new Error("Cannot pop the HarmonyOS root destination");
    const destination = this.#active.get(key);
    if (!destination) throw new Error(`Cannot pop unknown HarmonyOS destination: ${key}`);
    this.#active.delete(key);
    destination.close();
  }

  commitReset(root: string): void {
    this._assertOpen();
    const destination = this._activate(root);
    for (const [key, current] of this.#active) {
      if (key !== root && current !== destination) current.close();
    }
    this.#active.clear();
    this.#active.set(root, destination);
    this.#root = root;
  }

  abort(key: string): void {
    this._assertOpen();
    const destination = this.#staged.get(key);
    if (!destination) return;
    this.#staged.delete(key);
    destination.close();
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    const destinations = new Set([...this.#active.values(), ...this.#staged.values()]);
    this.#active.clear();
    this.#staged.clear();
    for (const destination of destinations) destination.close();
  }

  /** @internal */

  private _activate(key: string): T {
    const active = this.#active.get(key);
    if (active) return active;
    const staged = this.#staged.get(key);
    if (!staged) throw new Error(`HarmonyOS destination was not staged: ${key}`);
    this.#staged.delete(key);
    this.#active.set(key, staged);
    return staged;
  }

  /** @internal */

  private _assertOpen(): void {
    if (this.#closed) throw new Error("HarmonyOS destination store is closed");
  }

  /** @internal */

  private _assertKey(key: string): void {
    if (!key.trim()) throw new Error("HarmonyOS destination keys must not be empty");
  }
}
