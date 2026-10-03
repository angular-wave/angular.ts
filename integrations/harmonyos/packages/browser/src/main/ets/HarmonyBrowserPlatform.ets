import { common } from "@kit.AbilityKit";
import type { BrowserPlatform } from "./HarmonyBrowserRoute.ts";

export class HarmonyBrowserPlatform implements BrowserPlatform {
  private readonly context: common.UIAbilityContext;

  constructor(context: common.UIAbilityContext) {
    this.context = context;
  }

  async open(location: string): Promise<void> {
    await this.context.openLink(location);
  }
}
