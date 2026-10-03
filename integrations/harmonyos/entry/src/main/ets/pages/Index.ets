import {
  AngularNativeDestination,
  AngularNativeWeb,
  HarmonySystemCapabilities,
} from "@angular-wave/angular-native-harmony-core";
import { common } from "@kit.AbilityKit";

const PROOF_LOCATION =
  "resource://rawfile/proof.html";

@Entry
@Component
struct Index {
  private readonly context = this.getUIContext().getHostContext() as common.UIAbilityContext;
  private readonly destination = new AngularNativeDestination(
    PROOF_LOCATION,
    new HarmonySystemCapabilities(this.context, PROOF_LOCATION),
    { source: $rawfile("proof.html") },
  );

  aboutToDisappear(): void {
    this.destination.close();
  }

  build() {
    Stack() {
      AngularNativeWeb({
        destination: this.destination.web,
        nativeSurface: this.destination.nativeSurface,
      })
    }
    .width("100%")
    .height("100%");
  }
}
