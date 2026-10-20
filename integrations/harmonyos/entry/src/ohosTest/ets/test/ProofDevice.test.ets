import { Want } from "@kit.AbilityKit";
import {
  Driver,
  ON,
  abilityDelegatorRegistry,
} from "@kit.TestKit";
import {
  describe,
  expect,
  it,
} from "@ohos/hypium";

export default function proofDeviceTest(): void {
  describe("AngularNativeProof", (): void => {
    it("renders and updates native controls through the bridge", 0, async (): Promise<void> => {
      const delegator = abilityDelegatorRegistry.getAbilityDelegator();
      const argumentsValue = abilityDelegatorRegistry.getArguments();
      const want: Want = {
        bundleName: argumentsValue.bundleName,
        moduleName: "entry",
        abilityName: "EntryAbility",
      };
      await delegator.startAbility(want);

      const driver = Driver.create();
      const heading = await driver.waitForComponent(ON.text("AngularTS Native"), 15000);
      expect(await heading.getText()).assertEqual("AngularTS Native");

      const input = await driver.waitForComponent(ON.type("TextInput"), 5000);
      await input.inputText("Ada");
      const button = await driver.waitForComponent(ON.text("Greet"), 5000);
      await button.click();

      const greeting = await driver.waitForComponent(ON.text("Hello, Ada"), 5000);
      expect(await greeting.getText()).assertEqual("Hello, Ada");

      const ability = await delegator.getCurrentTopAbility();
      await delegator.doAbilityBackground(ability);
      await delegator.doAbilityForeground(ability);

      const resumedGreeting = await driver.waitForComponent(ON.text("Hello, Ada"), 5000);
      expect(await resumedGreeting.getText()).assertEqual("Hello, Ada");
    });
  });
}
