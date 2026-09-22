import type { RuntimeModule } from "../angular-runtime.ts";
import {
  _exceptionHandler,
  _native,
  _parse,
  _window,
} from "../injection-tokens.ts";
import {
  ngNativeComponentDirective,
  ngNativeDirective,
  ngNativeEventDirective,
} from "../directive/native/native.ts";
import {
  nativeElementDirective,
  nativeElementDirectiveName,
} from "../directive/native/native-element.ts";
import { nativeElements, type NativeElementName } from "./native-elements.ts";
import {
  applyNativeConfiguration,
  createNativeRuntimeState,
  createNativeRuntimeService,
  type NativeConfig,
  type NativeService,
} from "../services/native/native.ts";

export { nativeCapabilities } from "./native-capabilities.ts";
export type {
  NativeBiometricStatus,
  NativeCameraCaptureResult,
  NativeCameraStatus,
  NativeClipboardContent,
  NativeClipboardWriteParameters,
  NativeClipboardWriteResult,
  NativeConnectivityStatus,
  NativeCredentialClearResult,
  NativeCredentialCreatePasskeyParameters,
  NativeCredentialCreatePasskeyResult,
  NativeCredentialCreatePasswordParameters,
  NativeCredentialCreatePasswordResult,
  NativeCredentialGetParameters,
  NativeCredentialResult,
  NativeCredentialStatus,
  NativeFileDescriptor,
  NativeFileOpenParameters,
  NativeFileOpenResult,
  NativeFileStatus,
  NativeFileUploadParameters,
  NativeFileUploadProgress,
  NativeFileUploadResult,
  NativeGeolocationPosition,
  NativeGeolocationStatus,
  NativeHapticParameters,
  NativeHapticResult,
  NativeIntentParameters,
  NativeJsonObject,
  NativeJsonPrimitive,
  NativeJsonValue,
  NativeLifecycleStatus,
  NativeMediaLoadParameters,
  NativeMediaSeekParameters,
  NativeMediaStatus,
  NativeNavigationAndroidChange,
  NativeNavigationBridgeChange,
  NativeNavigationChange,
  NativeNavigationPopResult,
  NativeNavigationRouteParameters,
  NativeNavigationRouteResult,
  NativeNavigationStatus,
  NativeNavigationTransition,
  NativeNotificationStatus,
  NativeOpenResult,
  NativePermissionParameters,
  NativePermissionStatus,
  NativePlatformStatus,
  NativeShareParameters,
  NativeWindowBounds,
  NativeWindowDisplayFeature,
  NativeWindowInsets,
  NativeWindowStatus,
} from "./native-capability-contracts.ts";
export type {
  NativeCapabilityEventMap,
  NativeCapabilityEventName,
  NativeCapabilityEventPayload,
  NativeCapabilityMethodContract,
  NativeCapabilityMethodMap,
  NativeCapabilityMethodName,
  NativeCapabilityName,
  NativeCapabilityParameters,
  NativeCapabilityResult,
} from "./native-capabilities.ts";
import { getRuntimeComposition, memoizeRuntimeModule } from "./custom-ng.ts";

export * from "./native-elements.ts";

/** Registers the native-shell bridge and its three HTML directives. */
export const nativeModule: RuntimeModule = memoizeRuntimeModule((angular) => {
  const composition = getRuntimeComposition(angular);
  const { configRegistry, platform } = composition;
  const state = createNativeRuntimeState();
  let service: NativeService | undefined;

  configRegistry.register(_native, (value) => {
    applyNativeConfiguration(state, value as NativeConfig);
  });
  platform.addDisposer(() => service?.dispose());

  const module = angular
    .createModule("ng.native", [])
    .factory(_native, () => {
      service ??= createNativeRuntimeService(platform.window, state);
      return service;
    })
    .directive("ngNative", ngNativeDirective)
    .directive("ngNativeComponent", [
      _native,
      _parse,
      _exceptionHandler,
      _window,
      ngNativeComponentDirective,
    ])
    .directive("ngNativeEvent", ngNativeEventDirective);

  for (const name of Object.keys(nativeElements) as NativeElementName[]) {
    module.directive(nativeElementDirectiveName(name), [
      _native,
      _parse,
      _exceptionHandler,
      _window,
      (
        native: NativeService,
        parse: ng.ParseService,
        exceptionHandler: ng.ExceptionHandlerService,
        runtimeWindow: Window,
      ) =>
        nativeElementDirective(
          name,
          native,
          parse,
          exceptionHandler,
          runtimeWindow,
        ),
    ]);
  }

  return module;
});
