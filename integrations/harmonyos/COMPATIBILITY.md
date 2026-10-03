# HarmonyOS Compatibility

| Surface | Supported baseline |
| --- | --- |
| HarmonyOS | HarmonyOS NEXT |
| Application model | Stage model |
| Compile and target SDK | API 26 |
| Minimum SDK | API 20 (HarmonyOS 6.0.0) |
| Native UI | ArkUI |
| Web runtime | ArkWeb |
| Bridge protocol | Version 1 |
| AngularTS | Exactly the same package version as the HARs |

CI must cover the evidence-based minimum and API 26. Emulator tests do not
replace real-device or Huawei cloud tests for ArkWeb, permissions, credentials,
biometrics, camera, files, maps, media, and process recreation.

The device matrix includes phone, tablet, foldable, RTL, 1.5x and 2x font
scale, dark mode, reduced motion, keyboard insets, rotation, multi-window, and
safe areas.

API 20 is required by Online Authentication Kit passkeys. The ArkWeb same-layer
and ArkUI APIs used by core have lower minimums, so credentials set the baseline.
