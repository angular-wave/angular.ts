import { NativeBridgeFailure } from "../bridge/NativeBridgeDispatcher.ts";
import { nativeElements } from "../generated/NativeElementCatalog.ts";
import type { NativeElementContract } from "./NativeElementContractRegistry.ts";
import type { NativeElementName } from "./NativeRendererCatalog.ts";

export type NativeComponentEventEmitter = (
  event: string,
  data?: Readonly<Record<string, unknown>>,
) => void;

export interface NativeComponentSnapshot {
  readonly id: string;
  readonly name: string;
  readonly embedId: string | null;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly visible: boolean;
  readonly focused: boolean;
  readonly revision: number;
}

export class NativeComponentModel {
  private readonly id: string;
  private readonly name: string;
  private readonly contract: NativeElementContract;
  private readonly embedId: string | null;
  private readonly emitEvent: NativeComponentEventEmitter;
  private properties: Record<string, unknown>;
  private visible = false;
  private focused = false;
  private revision = 0;
  private disposed = false;

  constructor(
    id: string,
    name: string,
    embedId: string | null,
    emit: NativeComponentEventEmitter,
    contract: NativeElementContract = builtInContract(name),
  ) {
    this.id = id;
    this.name = name;
    this.embedId = embedId;
    this.emitEvent = emit;
    this.contract = contract;
    this.properties = defaultProperties(contract);
  }

  update(properties: Readonly<Record<string, unknown>>): void {
    this._assertActive();
    if (Object.keys(properties).length === 0) return;
    this.properties = { ...this.properties, ...properties };
    this.revision++;
  }

  setVisible(visible: boolean): void {
    this._assertActive();
    if (this.visible === visible) return;
    this.visible = visible;
    this.revision++;
  }

  invoke(
    method: string,
    argumentsValue: Readonly<Record<string, unknown>>,
  ): unknown {
    this._assertActive();
    switch (method) {
      case "focus":
        this.focused = true;
        this.revision++;
        this.emit("focus");
        return { focused: true };
      case "blur":
        this.focused = false;
        this.revision++;
        this.emit("blur");
        return { focused: false };
      case "show":
        this.setVisible(true);
        this._emitFirstAvailable("show", "open");
        return { visible: true };
      case "hide":
      case "dismiss":
        this.setVisible(false);
        this._emitFirstAvailable("dismiss", "close");
        return { visible: false };
      case "scrollTo":
      case "scrollToStart":
      case "scrollToEnd":
      case "move":
      case "animate":
      case "fitMarkers":
      case "open":
        return { accepted: true };
      default:
        throw new NativeBridgeFailure(
          "unknown_method",
          `Unsupported ${this.name} method: ${method}`,
        );
    }
  }

  /** @internal */

  private _emitFirstAvailable(...events: readonly string[]): void {
    const event = events.find((candidate) =>
      this.contract.events.some((entry) => entry.name === candidate)
    );
    if (event !== undefined) this.emit(event);
  }

  emit(event: string, data: Readonly<Record<string, unknown>> = {}): void {
    this._assertActive();
    if (!this.contract.events.some((candidate) => candidate.name === event)) {
      throw new NativeBridgeFailure(
        "unknown_method",
        `Unsupported ${this.name} event: ${event}`,
      );
    }
    this.emitEvent(event, data);
  }

  snapshot(): NativeComponentSnapshot {
    this._assertActive();
    return {
      id: this.id,
      name: this.name,
      embedId: this.embedId,
      properties: { ...this.properties },
      visible: this.visible,
      focused: this.focused,
      revision: this.revision,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.properties = {};
  }

  /** @internal */

  private _assertActive(): void {
    if (this.disposed) {
      throw new NativeBridgeFailure(
        "unknown_instance",
        `Native component instance was disposed: ${this.id}`,
      );
    }
  }
}

function defaultProperties(contract: NativeElementContract): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const property of contract.properties) {
    if ("default" in property) result[property.name] = property.default;
  }
  return result;
}

function builtInContract(name: string): NativeElementContract {
  const contract = nativeElements[name as NativeElementName];
  if (contract === undefined) {
    throw new NativeBridgeFailure(
      "unknown_element",
      `Unknown native element: ${name}`,
    );
  }
  return contract;
}
