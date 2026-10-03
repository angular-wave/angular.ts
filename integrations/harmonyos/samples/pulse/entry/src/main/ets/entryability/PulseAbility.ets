import { AbilityConstant, UIAbility, Want } from "@kit.AbilityKit";
import { window } from "@kit.ArkUI";
import { pulseLocation } from "../PulseLocation.ts";

export default class PulseAbility extends UIAbility {
  onCreate(want: Want, _launchParam: AbilityConstant.LaunchParam): void {
    AppStorage.setOrCreate(
      "pulseLocation",
      pulseLocation(want.parameters?.pulseUrl),
    );
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent("pages/Index");
  }
}
