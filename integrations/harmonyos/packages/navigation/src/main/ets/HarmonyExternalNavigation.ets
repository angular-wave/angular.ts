import { common } from "@kit.AbilityKit";

/** Opens an already validated HTTP or HTTPS URL through the HarmonyOS resolver. */
export async function openHarmonyExternalLocation(
  context: common.UIAbilityContext,
  location: string,
): Promise<void> {
  await context.startAbility({
    action: "ohos.want.action.viewData",
    uri: location,
  });
}
