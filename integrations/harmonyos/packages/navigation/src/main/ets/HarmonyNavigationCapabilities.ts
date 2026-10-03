import type {
  NativeBridgeInvocationContext,
} from "../../../../core/src/main/ets/bridge/NativeBridgeDispatcher.ts";
import type {
  HarmonyCapabilityPlatform,
} from "../../../../core/src/main/ets/capabilities/HarmonyCapabilities.ts";
export interface HarmonyNavigationInvoker {
  invoke(
    method: string,
    parameters: Readonly<Record<string, unknown>> | null,
  ): Promise<unknown>;
}

type CapabilityEmitter = (
  event: string,
  data: Readonly<Record<string, unknown>>,
) => void;

/** Adds one shared navigator to a destination-local capability provider. */
export class HarmonyNavigationCapabilities implements HarmonyCapabilityPlatform {
  private readonly platform: HarmonyCapabilityPlatform;
  private readonly navigation: HarmonyNavigationInvoker;

  constructor(
    platform: HarmonyCapabilityPlatform,
    navigation: HarmonyNavigationInvoker,
  ) {
    this.platform = platform;
    this.navigation = navigation;
  }

  call(
    target: string,
    method: string,
    parameters: Readonly<Record<string, unknown>>,
    context: NativeBridgeInvocationContext,
    emit: CapabilityEmitter,
  ): unknown | Promise<unknown> {
    if (target === "navigation") return this.navigation.invoke(method, parameters);
    return this.platform.call(target, method, parameters, context, emit);
  }

  closeTarget(target: string): void {
    if (target !== "navigation") this.platform.closeTarget?.(target);
  }
}
