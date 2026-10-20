import { AbilityConstant, UIAbility, Want } from "@kit.AbilityKit";
import {
  HARMONY_NAVIGATION_RECOVERY_PARAMETER,
  harmonyNavigationRecovery,
} from "./HarmonyNavigationRecovery.ts";

/** UIAbility base class that enables bounded AngularTS navigation recovery. */
export class AngularNativeNavigationAbility extends UIAbility {
  onCreate(want: Want, _launchParam: AbilityConstant.LaunchParam): void {
    try {
      this.context.setRestoreEnabled(true);
    } catch {
      // Recovery is unavailable on some device classes and mission configurations.
    }
    harmonyNavigationRecovery.restore(
      want.parameters?.[HARMONY_NAVIGATION_RECOVERY_PARAMETER],
    );
  }

  onSaveState(
    _reason: AbilityConstant.StateType,
    wantParameters: Record<string, Object>,
  ): AbilityConstant.OnSaveResult {
    const snapshot = harmonyNavigationRecovery.snapshot();
    if (snapshot !== undefined) {
      wantParameters[HARMONY_NAVIGATION_RECOVERY_PARAMETER] = snapshot;
    }
    return AbilityConstant.OnSaveResult.ALL_AGREE;
  }
}
