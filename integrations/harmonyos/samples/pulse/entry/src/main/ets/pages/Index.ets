import {
  AngularNativeNavigation,
} from "@angular-wave/angular-native-harmony-navigation";
import { DEFAULT_PULSE_LOCATION } from "../PulseLocation.ts";

@Entry
@Component
struct Index {
  private readonly location = AppStorage.get<string>("pulseLocation") ??
    DEFAULT_PULSE_LOCATION;

  build() {
    Stack() {
      AngularNativeNavigation({ initialLocation: this.location })
    }
    .width("100%")
    .height("100%");
  }
}
