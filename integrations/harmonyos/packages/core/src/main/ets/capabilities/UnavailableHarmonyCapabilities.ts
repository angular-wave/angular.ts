import { NativeBridgeFailure } from "../bridge/NativeBridgeDispatcher.ts";
import type { NativeBridgeInvocationContext } from "../bridge/NativeBridgeDispatcher.ts";
import type { HarmonyCapabilityPlatform } from "./HarmonyCapabilities.ts";

export class UnavailableHarmonyCapabilities implements HarmonyCapabilityPlatform {
  call(
    target: string,
    method: string,
    _parameters: Readonly<Record<string, unknown>>,
    _context: NativeBridgeInvocationContext,
    _emit: (event: string, data: Readonly<Record<string, unknown>>) => void,
  ): unknown {
    if (method === "status") {
      return {
        available: target === "platform",
        platform: "harmonyos",
        reason: target === "platform" ? undefined : "provider-not-installed",
      };
    }
    throw new NativeBridgeFailure(
      "unavailable",
      `HarmonyOS capability provider is unavailable: ${target}`,
    );
  }
}
