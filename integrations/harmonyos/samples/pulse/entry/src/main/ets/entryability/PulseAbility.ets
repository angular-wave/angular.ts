import { AbilityConstant, Want } from "@kit.AbilityKit";
import { window } from "@kit.ArkUI";
import { loadAngularNativePage } from "@angular-wave/angular-native-harmony-core";
import { AngularNativeNavigationAbility } from "@angular-wave/angular-native-harmony-navigation";
import { pulseLocation } from "../PulseLocation.ts";

export default class PulseAbility extends AngularNativeNavigationAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    super.onCreate(want, launchParam);
    AppStorage.setOrCreate(
      "pulseLocation",
      pulseLocation(want.parameters?.pulseUrl),
    );
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    loadAngularNativePage(windowStage, "pages/Index");
  }
}
