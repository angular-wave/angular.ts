import type { NativeBridgeHandler } from "../bridge/NativeBridgeDispatcher.ts";
import {
  createHarmonyCapabilityHandlers,
} from "../capabilities/HarmonyCapabilities.ts";
import type {
  HarmonyCapabilityPlatform,
} from "../capabilities/HarmonyCapabilities.ts";
import { HarmonyNativeNodeAdapter } from "../nodes/HarmonyNativeNodeAdapter.ts";
import { NativeNodeRegistry } from "../nodes/NativeNodeRegistry.ts";
import { ArkUISameLayerSurface } from "../nodes/ArkUISameLayerSurface.ets";
import type { ArkUISameLayerControllerFactory } from "../nodes/ArkUISameLayerSurface.ets";
import { ArkWebDestination } from "./ArkWebDestination.ets";
import { NativeElementContractRegistry } from "../components/NativeElementContractRegistry.ts";
import { nativeRenderers } from "../components/NativeRendererCatalog.ts";
import type { NativeElementName } from "../components/NativeRendererCatalog.ts";
import { destinationHandlers } from "./HarmonyDestinationHandlers.ts";

class TimeoutFrameScheduler {
  schedule(callback: () => void): void {
    setTimeout(callback);
  }
}

function rendererPrimitive(
  renderers: Readonly<Record<string, string>> | undefined,
  name: string,
): string | undefined {
  const custom: ESObject = renderers === undefined ? undefined : Reflect.get(renderers, name);
  if (typeof custom === "string") return custom;
  const renderer: ESObject = Reflect.get(nativeRenderers, name as NativeElementName);
  if (typeof renderer !== "object" || renderer === null) return undefined;
  const primitive: ESObject = Reflect.get(renderer, "primitive");
  return typeof primitive === "string" ? primitive : undefined;
}

export interface AngularNativeDestinationOptions {
  readonly handlers?: Readonly<Record<string, NativeBridgeHandler>>;
  readonly elements?: NativeElementContractRegistry;
  readonly renderers?: Readonly<Record<string, string>>;
  readonly nativeControllerFactory?: ArkUISameLayerControllerFactory;
  readonly source?: string | Resource;
  readonly routeDecision?: (location: string) => boolean;
}

export class AngularNativeDestination {
  readonly nativeSurface: ArkUISameLayerSurface;
  readonly web: ArkWebDestination;

  constructor(
    location: string,
    platform: HarmonyCapabilityPlatform,
    options: AngularNativeDestinationOptions = {},
  ) {
    this.nativeSurface = new ArkUISameLayerSurface(options.nativeControllerFactory);
    const elements = options.elements ?? new NativeElementContractRegistry();
    let destination: ArkWebDestination | undefined;
    const emit = (
      target: string,
      event: string,
      data: Readonly<Record<string, ESObject>>,
    ): void => destination?.host.emitEvent(target, event, data);
    const component = new NativeNodeRegistry(
      new HarmonyNativeNodeAdapter(
        this.nativeSurface.surface,
        (name) => rendererPrimitive(options.renderers, name),
        (name) => elements.get(name),
      ),
      new TimeoutFrameScheduler(),
      (message) => emit(message.target, message.event, message.data),
    );
    const handlers = destinationHandlers(
      createHarmonyCapabilityHandlers(platform, emit),
      options.handlers,
      component,
    );
    destination = new ArkWebDestination(
      location,
      handlers,
      elements,
      options.source ?? location,
      options.routeDecision ?? (() => false),
    );
    this.web = destination;
  }

  close(): void {
    this.web.close();
  }
}
