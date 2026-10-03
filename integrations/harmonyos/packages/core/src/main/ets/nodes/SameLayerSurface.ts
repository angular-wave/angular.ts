import type {
  NativeComponentEventEmitter,
  NativeComponentSnapshot,
} from "../components/NativeComponentModel.ts";
import type { NativeNodeRect } from "./NativeNodeRegistry.ts";
import type { HarmonyNativeSurface } from "./HarmonyNativeNodeAdapter.ts";

export interface SameLayerEmbed {
  readonly domId: string;
  readonly embedId: string;
  readonly surfaceId: string;
  readonly width: number;
  readonly height: number;
}

export interface SameLayerController {
  update(
    snapshot: NativeComponentSnapshot,
    primitive: string,
    emit: NativeComponentEventEmitter,
  ): void;
  layout(rect: NativeNodeRect): void;
  invoke(
    method: string,
    argumentsValue: Readonly<Record<string, unknown>>,
  ): unknown | Promise<unknown>;
  postTouchEvent(event: unknown): boolean;
  dispose(): void;
}

export type SameLayerControllerFactory = (
  embed: SameLayerEmbed,
) => SameLayerController;

interface ComponentEntry {
  snapshot: NativeComponentSnapshot;
  readonly primitive: string;
  readonly emit: NativeComponentEventEmitter;
  controller: SameLayerController | null;
  rect: NativeNodeRect | null;
}

export class SameLayerSurface implements HarmonyNativeSurface {
  private readonly createController: SameLayerControllerFactory;
  private readonly components = new Map<string, ComponentEntry>();
  private readonly componentByEmbed = new Map<string, string>();
  private readonly embeds = new Map<string, SameLayerEmbed>();
  private batchDepth = 0;
  private changed = false;
  private changeListener: (() => void) | undefined;

  constructor(createController: SameLayerControllerFactory) {
    this.createController = createController;
  }

  onChange(listener: () => void): () => void {
    this.changeListener = listener;
    return () => {
      if (this.changeListener === listener) this.changeListener = undefined;
    };
  }

  attach(
    snapshot: NativeComponentSnapshot,
    primitive: string,
    emit: NativeComponentEventEmitter,
  ): void {
    if (this.components.has(snapshot.id)) {
      throw new Error(`Native component is already attached: ${snapshot.id}`);
    }
    const entry: ComponentEntry = {
      snapshot,
      primitive,
      emit,
      controller: null,
      rect: null,
    };
    this.components.set(snapshot.id, entry);
    if (snapshot.embedId !== null) {
      this.componentByEmbed.set(snapshot.embedId, snapshot.id);
      const embed = this.embeds.get(snapshot.embedId);
      if (embed !== undefined) this.connect(entry, embed);
    }
    this.markChanged();
  }

  update(snapshot: NativeComponentSnapshot): void {
    const entry = this.requireComponent(snapshot.id);
    entry.snapshot = snapshot;
    entry.controller?.update(snapshot, entry.primitive, entry.emit);
  }

  layout(id: string, rect: NativeNodeRect): void {
    const entry = this.requireComponent(id);
    entry.rect = rect;
    entry.controller?.layout(rect);
  }

  invoke(
    id: string,
    method: string,
    argumentsValue: Readonly<Record<string, unknown>>,
  ): unknown | Promise<unknown> {
    const controller = this.requireComponent(id).controller;
    return controller?.invoke(method, argumentsValue);
  }

  detach(id: string): void {
    const entry = this.components.get(id);
    if (entry === undefined) return;
    entry.controller?.dispose();
    if (entry.snapshot.embedId !== null) {
      this.componentByEmbed.delete(entry.snapshot.embedId);
    }
    this.components.delete(id);
    this.markChanged();
  }

  beginBatch(): void {
    this.batchDepth++;
  }

  endBatch(): void {
    if (this.batchDepth === 0) throw new Error("Same-layer batch is not active");
    this.batchDepth--;
    if (this.batchDepth === 0 && this.changed) this.flushChange();
  }

  embedCreated(embed: SameLayerEmbed): void {
    this.embeds.set(embed.domId, embed);
    const componentId = this.componentByEmbed.get(embed.domId);
    if (componentId !== undefined) {
      this.connect(this.requireComponent(componentId), embed);
    }
    this.markChanged();
  }

  embedUpdated(embed: SameLayerEmbed): void {
    this.embeds.set(embed.domId, embed);
    const componentId = this.componentByEmbed.get(embed.domId);
    if (componentId === undefined) return;
    const entry = this.requireComponent(componentId);
    if (entry.controller === null) this.connect(entry, embed);
    entry.controller?.layout({ x: 0, y: 0, width: embed.width, height: embed.height });
  }

  embedDestroyed(domId: string): void {
    this.embeds.delete(domId);
    const componentId = this.componentByEmbed.get(domId);
    if (componentId === undefined) return;
    const entry = this.requireComponent(componentId);
    entry.controller?.dispose();
    entry.controller = null;
    this.markChanged();
  }

  postTouchEvent(embedId: string, event: unknown): boolean {
    for (const embed of this.embeds.values()) {
      if (embed.embedId !== embedId) continue;
      const componentId = this.componentByEmbed.get(embed.domId);
      if (componentId === undefined) return false;
      return (this.requireComponent(componentId).controller as SameLayerController).postTouchEvent(event);
    }
    return false;
  }

  activeComponentIds(): readonly string[] {
    return [...this.components]
      .filter(([, entry]) => entry.controller !== null)
      .map(([id]) => id);
  }

  controller(id: string): SameLayerController | null {
    return this.components.get(id)?.controller ?? null;
  }

  private connect(entry: ComponentEntry, embed: SameLayerEmbed): void {
    entry.controller?.dispose();
    entry.controller = this.createController(embed);
    entry.controller.update(entry.snapshot, entry.primitive, entry.emit);
    entry.controller.layout(
      entry.rect ?? { x: 0, y: 0, width: embed.width, height: embed.height },
    );
  }

  private requireComponent(id: string): ComponentEntry {
    const entry = this.components.get(id);
    if (entry === undefined) throw new Error(`Unknown native component: ${id}`);
    return entry;
  }

  private markChanged(): void {
    this.changed = true;
    if (this.batchDepth === 0) this.flushChange();
  }

  private flushChange(): void {
    this.changed = false;
    this.changeListener?.();
  }
}
