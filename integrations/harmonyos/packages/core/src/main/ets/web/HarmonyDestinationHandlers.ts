import type { NativeBridgeHandler } from "../bridge/NativeBridgeDispatcher.ts";

export function destinationHandlers(
  capabilities: Readonly<Record<string, NativeBridgeHandler>>,
  custom: Readonly<Record<string, NativeBridgeHandler>> | undefined,
  component: NativeBridgeHandler,
): Record<string, NativeBridgeHandler> {
  return Object.assign({}, capabilities, custom, { component });
}
