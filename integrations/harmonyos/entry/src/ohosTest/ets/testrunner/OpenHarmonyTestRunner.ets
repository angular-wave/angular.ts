import { Want } from "@kit.AbilityKit";
import { BusinessError } from "@kit.BasicServicesKit";
import { hilog } from "@kit.PerformanceAnalysisKit";
import {
  TestRunner,
  abilityDelegatorRegistry,
} from "@kit.TestKit";

export default class OpenHarmonyTestRunner implements TestRunner {
  onPrepare(): void {
    hilog.info(0x0000, "AngularNativeTest", "Preparing AngularTS Native device tests");
  }

  async onRun(): Promise<void> {
    const delegator = abilityDelegatorRegistry.getAbilityDelegator();
    const argumentsValue = abilityDelegatorRegistry.getArguments();
    const moduleName = argumentsValue.parameters["-m"] ?? "entry_test";
    const monitor: abilityDelegatorRegistry.AbilityMonitor = {
      abilityName: "TestAbility",
      moduleName,
    };
    delegator.addAbilityMonitor(monitor, (error: BusinessError): void => {
      if (error.code !== 0) {
        hilog.error(
          0x0000,
          "AngularNativeTest",
          "Unable to monitor TestAbility: %{public}s",
          error.message,
        );
      }
    });
    const want: Want = {
      bundleName: argumentsValue.bundleName,
      moduleName,
      abilityName: "TestAbility",
    };
    try {
      await delegator.startAbility(want);
    } catch {
      delegator.finishTest(
        "Unable to start the AngularTS Native test ability",
        1,
        (): void => {},
      );
    }
  }
}
