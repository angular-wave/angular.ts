import { nativeCapabilities } from "../generated/NativeCapabilityCatalog.ts";
import type {
  NativeBridgeHandler,
  NativeBridgeInvocationContext,
} from "../bridge/NativeBridgeDispatcher.ts";

export type HarmonyCapabilityEventSink = (
  target: string,
  event: string,
  data: Readonly<Record<string, unknown>>,
) => void;

export interface HarmonyCapabilityPlatform {
  call(
    target: string,
    method: string,
    parameters: Readonly<Record<string, unknown>>,
    context: NativeBridgeInvocationContext,
    emit: (event: string, data: Readonly<Record<string, unknown>>) => void,
  ): unknown | Promise<unknown>;
  closeTarget?(target: string): void;
}

class HarmonyCapabilityHandler implements NativeBridgeHandler {
  private readonly target: string;
  private readonly platform: HarmonyCapabilityPlatform;
  private readonly eventSink: HarmonyCapabilityEventSink;
  private closed = false;

  constructor(
    target: string,
    platform: HarmonyCapabilityPlatform,
    eventSink: HarmonyCapabilityEventSink,
  ) {
    this.target = target;
    this.platform = platform;
    this.eventSink = eventSink;
  }

  invoke(
    method: string,
    parameters: Readonly<Record<string, unknown>> | null,
    context: NativeBridgeInvocationContext,
  ): unknown | Promise<unknown> {
    if (this.closed) throw Object.assign(new Error("Capability was disposed"), { code: "interrupted" });
    return this.platform.call(
      this.target,
      method,
      parameters ?? {},
      context,
      (event, data) => {
        if (!this.closed) this.eventSink(this.target, event, data);
      },
    );
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.platform.closeTarget?.(this.target);
  }
}

export function createHarmonyCapabilityHandlers(
  platform: HarmonyCapabilityPlatform,
  eventSink: HarmonyCapabilityEventSink,
): Readonly<Record<string, NativeBridgeHandler>> {
  const handlers: Record<string, NativeBridgeHandler> = {};
  for (const target of Object.keys(nativeCapabilities)) {
    handlers[target] = new HarmonyCapabilityHandler(target, platform, eventSink);
  }
  return handlers;
}
