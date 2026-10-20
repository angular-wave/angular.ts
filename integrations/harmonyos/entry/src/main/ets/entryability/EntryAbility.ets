import { window } from "@kit.ArkUI";
import { loadAngularNativePage } from "@angular-wave/angular-native-harmony-core";
import { AngularNativeNavigationAbility } from "@angular-wave/angular-native-harmony-navigation";

export default class EntryAbility extends AngularNativeNavigationAbility {
  onWindowStageCreate(windowStage: window.WindowStage): void {
    loadAngularNativePage(windowStage, "pages/Index");
  }
}
