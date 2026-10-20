import { AbilityConstant, UIAbility, Want } from "@kit.AbilityKit";
import { window } from "@kit.ArkUI";
import { abilityDelegatorRegistry } from "@kit.TestKit";
import { Hypium } from "@ohos/hypium";
import { loadAngularNativePage } from "@angular-wave/angular-native-harmony-core";
import testsuite from "../test/List.test";

export default class TestAbility extends UIAbility {
  onCreate(_want: Want, _launchParam: AbilityConstant.LaunchParam): void {}

  onWindowStageCreate(windowStage: window.WindowStage): void {
    loadAngularNativePage(
      windowStage,
      "testability/pages/Index",
      {
        onFailure: (message: string): void => {
          abilityDelegatorRegistry.getAbilityDelegator().finishTest(
            message,
            1,
            (): void => {},
          );
        },
        onLoaded: (): void => {
          Hypium.hypiumTest(
            abilityDelegatorRegistry.getAbilityDelegator(),
            abilityDelegatorRegistry.getArguments(),
            testsuite,
          );
        },
      },
    );
  }
}
