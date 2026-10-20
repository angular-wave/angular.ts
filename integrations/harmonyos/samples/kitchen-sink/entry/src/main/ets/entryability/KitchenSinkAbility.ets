import { AbilityConstant, UIAbility, Want } from "@kit.AbilityKit";
import { window } from "@kit.ArkUI";
import { loadAngularNativePage } from "@angular-wave/angular-native-harmony-core";

export default class KitchenSinkAbility extends UIAbility {
  onCreate(_want: Want, _launchParam: AbilityConstant.LaunchParam): void {}

  onWindowStageCreate(windowStage: window.WindowStage): void {
    loadAngularNativePage(windowStage, "pages/Index");
  }
}
