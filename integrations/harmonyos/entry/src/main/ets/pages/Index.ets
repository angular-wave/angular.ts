import { AngularNativeNavigation } from "@angular-wave/angular-native-harmony-navigation";

const PROOF_LOCATION =
  "resource://rawfile/proof.html";

@Entry
@Component
struct Index {
  build() {
    Stack() {
      AngularNativeNavigation({
        initialLocation: PROOF_LOCATION,
        source: $rawfile("proof.html"),
      })
    }
    .width("100%")
    .height("100%");
  }
}
