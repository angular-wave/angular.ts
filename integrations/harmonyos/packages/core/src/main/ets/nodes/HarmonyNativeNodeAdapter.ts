import type { NativeElementName } from "../components/NativeRendererCatalog.ts";
import { nativeRenderers } from "../components/NativeRendererCatalog.ts";
import type { NativeElementContract } from "../components/NativeElementContractRegistry.ts";
import { nativeElements } from "../generated/NativeElementCatalog.ts";
import {
  NativeComponentModel,
} from "../components/NativeComponentModel.ts";
import type {
  NativeComponentEventEmitter,
  NativeComponentSnapshot,
} from "../components/NativeComponentModel.ts";
import type {
  NativeNodeAdapter,
  NativeNodeRect,
} from "./NativeNodeRegistry.ts";

export interface HarmonyNativeSurface {
  attach(
    snapshot: NativeComponentSnapshot,
    primitive: string,
    emit: NativeComponentEventEmitter,
  ): void;
  update(snapshot: NativeComponentSnapshot): void;
  layout(id: string, rect: NativeNodeRect): void;
  invoke(
    id: string,
    method: string,
    argumentsValue: Readonly<Record<string, unknown>>,
  ): unknown | Promise<unknown>;
  detach(id: string): void;
  beginBatch(): void;
  endBatch(): void;
}

export type NativeRendererResolver = (name: string) => string | undefined;
export type NativeContractResolver = (
  name: string,
) => NativeElementContract | undefined;

interface HarmonyNativeNode {
  readonly model: NativeComponentModel;
  readonly primitive: string;
}

export class HarmonyNativeNodeAdapter
  implements NativeNodeAdapter<HarmonyNativeNode>
{
  private readonly surface: HarmonyNativeSurface;
  private readonly resolveRenderer: NativeRendererResolver;
  private readonly resolveContract: NativeContractResolver;

  constructor(
    surface: HarmonyNativeSurface,
    resolveRenderer: NativeRendererResolver = defaultRenderer,
    resolveContract: NativeContractResolver = defaultContract,
  ) {
    this.surface = surface;
    this.resolveRenderer = resolveRenderer;
    this.resolveContract = resolveContract;
  }

  beginBatch(): void {
    this.surface.beginBatch();
  }

  endBatch(): void {
    this.surface.endBatch();
  }

  create(
    id: string,
    name: string,
    embedId: string | null,
    emit: NativeComponentEventEmitter,
  ): HarmonyNativeNode {
    const primitive = this.resolveRenderer(name);
    const contract = this.resolveContract(name);
    if (primitive === undefined) {
      throw new Error(`No HarmonyOS renderer is registered for ${name}`);
    }
    if (contract === undefined) {
      throw new Error(`No HarmonyOS contract is registered for ${name}`);
    }
    const node = {
      model: new NativeComponentModel(id, name, embedId, emit, contract),
      primitive,
    };
    this.surface.attach(
      node.model.snapshot(),
      node.primitive,
      (event, data) => node.model.emit(event, data),
    );
    return node;
  }

  update(
    node: HarmonyNativeNode,
    properties: Readonly<Record<string, unknown>>,
  ): void {
    node.model.update(properties);
    this.surface.update(node.model.snapshot());
  }

  layout(node: HarmonyNativeNode, rect: NativeNodeRect): void {
    this.surface.layout(node.model.snapshot().id, rect);
  }

  setVisible(node: HarmonyNativeNode, visible: boolean): void {
    node.model.setVisible(visible);
    this.surface.update(node.model.snapshot());
  }

  async invoke(
    node: HarmonyNativeNode,
    method: string,
    argumentsValue: Readonly<Record<string, unknown>>,
  ): Promise<unknown> {
    const modelResult = node.model.invoke(method, argumentsValue);
    this.surface.update(node.model.snapshot());
    const surfaceResult = await this.surface.invoke(
      node.model.snapshot().id,
      method,
      argumentsValue,
    );
    return surfaceResult === undefined ? modelResult : surfaceResult;
  }

  dispose(node: HarmonyNativeNode): void {
    const id = node.model.snapshot().id;
    this.surface.detach(id);
    node.model.dispose();
  }
}

function defaultRenderer(name: string): string | undefined {
  return nativeRenderers[name as NativeElementName]?.primitive;
}

function defaultContract(name: string): NativeElementContract | undefined {
  return nativeElements[name as NativeElementName];
}
