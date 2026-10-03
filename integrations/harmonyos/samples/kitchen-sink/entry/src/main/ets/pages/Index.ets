import {
  AngularNativeDestination,
  AngularNativeWeb,
  HarmonySystemCapabilities,
} from "@angular-wave/angular-native-harmony-core";
import { common } from "@kit.AbilityKit";
import { harmonyMapControllerFactory } from "@angular-wave/angular-native-harmony-maps";

const KITCHEN_SINK_LOCATION = "resource://rawfile/kitchen-sink.html";

@Entry
@Component
struct Index {
  private readonly context = this.getUIContext().getHostContext() as common.UIAbilityContext;
  private readonly destination = new AngularNativeDestination(
    KITCHEN_SINK_LOCATION,
    new HarmonySystemCapabilities(this.context, KITCHEN_SINK_LOCATION),
    {
      source: $rawfile("kitchen-sink.html"),
      nativeControllerFactory: harmonyMapControllerFactory,
    },
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
