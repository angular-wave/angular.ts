import {
  NativeBridgeFailure,
} from "../bridge/NativeBridgeDispatcher.ts";
import type {
  NativeBridgeHandler,
  NativeBridgeInvocationContext,
} from "../bridge/NativeBridgeDispatcher.ts";

export interface NativeNodeRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface NativeNodeEvent {
  readonly target: "component";
  readonly event: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export type NativeNodeEventSink = (event: NativeNodeEvent) => void;

export interface NativeNodeAdapter<Node> {
  beginBatch(): void;
  endBatch(): void;
  create(
    id: string,
    name: string,
    embedId: string | null,
    emit: (event: string, data?: Readonly<Record<string, unknown>>) => void,
  ): Node;
  update(node: Node, properties: Readonly<Record<string, unknown>>): void;
  layout(node: Node, rect: NativeNodeRect): void;
  setVisible(node: Node, visible: boolean): void;
  invoke(
    node: Node,
    method: string,
    argumentsValue: Readonly<Record<string, unknown>>,
  ): unknown | Promise<unknown>;
  dispose(node: Node): void;
}

export interface NativeFrameScheduler {
  schedule(callback: () => void): void;
}

interface MountedNode<Node> {
  readonly id: string;
  readonly name: string;
  readonly node: Node;
}

export class NativeNodeRegistry<Node> implements NativeBridgeHandler {
  private readonly adapter: NativeNodeAdapter<Node>;
  private readonly queue: NativeMutationQueue;
  private readonly emit: NativeNodeEventSink;
  private readonly mounted = new Map<string, MountedNode<Node>>();
  private closed = false;

  constructor(
    adapter: NativeNodeAdapter<Node>,
    scheduler: NativeFrameScheduler,
    emit: NativeNodeEventSink,
  ) {
    this.adapter = adapter;
    this.emit = emit;
    this.queue = new NativeMutationQueue(adapter, scheduler);
  }

  invoke(
    method: string,
    parameters: Readonly<Record<string, unknown>> | null,
    context: NativeBridgeInvocationContext,
  ): unknown | Promise<unknown> {
    if (this.closed) throw new NativeBridgeFailure("interrupted", "Native destination was removed");
    const values = parameters ?? {};
    const id = stringValue(values, "id");
    if (id === null) throw new NativeBridgeFailure("invalid_params", "component calls require params.id");

    switch (method) {
      case "mount":
        return this._mount(id, values, context);
      case "update":
        return this._update(id, values, context);
      case "invoke":
        return this._invokeNode(id, values, context);
      case "unmount":
        return this._unmount(id, context);
      default:
        throw new NativeBridgeFailure("unknown_method", `Unsupported component method: ${method}`);
    }
  }

  close(): void {
    this.closed = true;
    this.queue.close();
    this.adapter.beginBatch();
    try {
      for (const mounted of this.mounted.values()) this.adapter.dispose(mounted.node);
      this.mounted.clear();
    } finally {
      this.adapter.endBatch();
    }
  }

  /** @internal */

  private _mount(
    id: string,
    parameters: Readonly<Record<string, unknown>>,
    context: NativeBridgeInvocationContext,
  ): Promise<unknown> {
    const name = requiredString(parameters, "name", "component.mount requires params.name");
    const embedId = optionalString(parameters, "embedId");
    const properties = recordValue(parameters, "props") ?? {};
    const rect = rectValue(parameters.rect);
    return this.queue.enqueue(context, () => {
      const existing = this.mounted.get(id);
      if (existing !== undefined && existing.name !== name) {
        throw new NativeBridgeFailure("invalid_params", `Native component ${id} cannot change type`);
      }
      const mounted = existing ?? this._createNode(id, name, embedId);
      this.adapter.setVisible(mounted.node, false);
      this.adapter.update(mounted.node, properties);
      if (rect !== null) this.adapter.layout(mounted.node, rect);
      this.adapter.setVisible(mounted.node, true);
      return { mounted: true, id, name };
    });
  }

  /** @internal */

  private _update(
    id: string,
    parameters: Readonly<Record<string, unknown>>,
    context: NativeBridgeInvocationContext,
  ): Promise<unknown> {
    const properties = recordValue(parameters, "props") ?? {};
    const rect = rectValue(parameters.rect);
    return this.queue.enqueue(context, () => {
      const mounted = this._requireNode(id);
      this.adapter.update(mounted.node, properties);
      if (rect !== null) this.adapter.layout(mounted.node, rect);
      return { mounted: true, id };
    });
  }

  /** @internal */

  private _invokeNode(
    id: string,
    parameters: Readonly<Record<string, unknown>>,
    context: NativeBridgeInvocationContext,
  ): Promise<unknown> {
    const method = requiredString(parameters, "method", "component.invoke requires params.method");
    const argumentsValue = recordValue(parameters, "args") ?? {};
    return this.queue.enqueue(context, async () => {
      const mounted = this._requireNode(id);
      const result = await this.adapter.invoke(mounted.node, method, argumentsValue);
      return { id, result };
    });
  }

  /** @internal */

  private _unmount(id: string, context: NativeBridgeInvocationContext): Promise<unknown> {
    return this.queue.enqueue(context, () => {
      const mounted = this.mounted.get(id);
      if (mounted !== undefined) {
        this.mounted.delete(id);
        this.adapter.dispose(mounted.node);
      }
      return { mounted: false, id };
    });
  }

  /** @internal */

  private _createNode(
    id: string,
    name: string,
    embedId: string | null,
  ): MountedNode<Node> {
    const node = this.adapter.create(id, name, embedId, (event, data = {}) => {
      if (this.closed || !this.mounted.has(id)) return;
      this.emit({ target: "component", event, data: { id, name, ...data } });
    });
    const mounted = { id, name, node };
    this.mounted.set(id, mounted);
    return mounted;
  }

  /** @internal */

  private _requireNode(id: string): MountedNode<Node> {
    const mounted = this.mounted.get(id);
    if (mounted === undefined) {
      throw new NativeBridgeFailure("unknown_instance", `Unknown native component instance: ${id}`);
    }
    return mounted;
  }
}

function optionalString(
  value: Readonly<Record<string, unknown>>,
  property: string,
): string | null {
  const candidate = value[property];
  if (candidate === undefined || candidate === null) return null;
  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new NativeBridgeFailure("invalid_params", `${property} must be a non-empty string`);
  }
  return candidate;
}

interface PendingMutation {
  readonly context: NativeBridgeInvocationContext;
  readonly operation: () => unknown | Promise<unknown>;
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: unknown) => void;
}

class NativeMutationQueue {
  private readonly adapter: Pick<NativeNodeAdapter<unknown>, "beginBatch" | "endBatch">;
  private readonly scheduler: NativeFrameScheduler;
  private readonly pending: PendingMutation[] = [];
  private scheduled = false;
  private closed = false;

  constructor(
    adapter: Pick<NativeNodeAdapter<unknown>, "beginBatch" | "endBatch">,
    scheduler: NativeFrameScheduler,
  ) {
    this.adapter = adapter;
    this.scheduler = scheduler;
  }

  enqueue(
    context: NativeBridgeInvocationContext,
    operation: () => unknown | Promise<unknown>,
  ): Promise<unknown> {
    const promise = new Promise<unknown>((resolve, reject) => {
      this.pending.push({ context, operation, resolve, reject });
    });
    if (!this.scheduled) {
      this.scheduled = true;
      this.scheduler.schedule(() => { void this._flush(); });
    }
    return promise;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    const error = new NativeBridgeFailure("interrupted", "Native destination was removed");
    for (const mutation of this.pending.splice(0)) mutation.reject(error);
  }

  /** @internal */

  private async _flush(): Promise<void> {
    this.scheduled = false;
    if (this.closed) return;
    const mutations = this.pending.splice(0);
    this.adapter.beginBatch();
    try {
      for (const mutation of mutations) {
        if (mutation.context.cancelled) {
          mutation.reject(new NativeBridgeFailure("cancelled", "Native request was cancelled"));
          continue;
        }
        try {
          mutation.resolve(await mutation.operation());
        } catch (error) {
          mutation.reject(error);
        }
      }
    } finally {
      this.adapter.endBatch();
    }
  }
}

function stringValue(parameters: Readonly<Record<string, unknown>> | null, name: string): string | null {
  const value = parameters?.[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function requiredString(
  parameters: Readonly<Record<string, unknown>>,
  name: string,
  message: string,
): string {
  const value = stringValue(parameters, name);
  if (value === null) throw new NativeBridgeFailure("invalid_params", message);
  return value;
}

function recordValue(
  parameters: Readonly<Record<string, unknown>>,
  name: string,
): Readonly<Record<string, unknown>> | null {
  const value = parameters[name];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function rectValue(value: unknown): NativeNodeRect | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const source = value as Readonly<Record<string, unknown>>;
  const x = finiteNumber(source.x);
  const y = finiteNumber(source.y);
  const width = finiteNumber(source.width);
  const height = finiteNumber(source.height);
  if (x === null || y === null || width === null || height === null || width < 0 || height < 0) {
    throw new NativeBridgeFailure("invalid_params", "component rect is invalid");
  }
  return { x, y, width, height };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
