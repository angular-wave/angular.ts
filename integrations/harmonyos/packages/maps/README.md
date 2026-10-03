# AngularTS Native HarmonyOS Maps

Render the AngularTS Native map contract with Huawei Map Kit.

## Install

```sh
ohpm install @angular-wave/angular-native-harmony-maps@0.36.0
```

## Use

```ts
import { harmonyMapControllerFactory } from "@angular-wave/angular-native-harmony-maps";

new AngularNativeDestination({
  ...options,
  nativeControllerFactory: harmonyMapControllerFactory,
});
```

This package requires Huawei Map Kit and the HarmonyOS API 26 SDK. It is not included in the public OpenHarmony API 23 compatibility build.

This package is part of [AngularTS](https://github.com/angular-wave/angular.ts). The [HarmonyOS integration guide](https://github.com/angular-wave/angular.ts/tree/master/integrations/harmonyos) covers project setup, security, compatibility, and release checks.
