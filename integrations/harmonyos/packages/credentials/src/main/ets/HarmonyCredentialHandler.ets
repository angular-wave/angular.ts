import { common } from "@kit.AbilityKit";
import { HarmonyCredentials } from "./HarmonyCredentials.ts";
import { HarmonyPasskeys } from "./HarmonyPasskeys.ets";

/** Creates the destination-owned credentials bridge handler. */
export function createHarmonyCredentialHandler(
  context: common.UIAbilityContext,
): HarmonyCredentials {
  return new HarmonyCredentials(new HarmonyPasskeys(context));
}
