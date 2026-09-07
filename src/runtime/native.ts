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
  applyNativeConfiguration,
  createNativeRuntimeState,
  createNativeRuntimeService,
  type NativeConfig,
  type NativeService,
} from "../services/native/native.ts";

export { nativeCapabilities } from "./native-capabilities.ts";
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

  return angular
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
});
