import { _native, _parse, _exceptionHandler, _window } from '../injection-tokens.js';
import { ngNativeDirective, ngNativeComponentDirective, ngNativeEventDirective } from '../directive/native/native.js';
import { nativeElementDirectiveName, nativeElementDirective } from '../directive/native/native-element.js';
import { nativeElements } from './native-elements.js';
import { applyNativeConfiguration, createNativeRuntimeService, createNativeRuntimeState } from '../services/native/native.js';
export { nativeCapabilities } from './native-capabilities.js';
import { memoizeRuntimeModule, getRuntimeComposition } from './custom-ng.js';

/** Registers the native-shell bridge and its three HTML directives. */
const nativeModule = memoizeRuntimeModule((angular) => {
    const composition = getRuntimeComposition(angular);
    const { configRegistry, platform } = composition;
    const state = createNativeRuntimeState();
    let service;
    configRegistry.register(_native, (value) => {
        applyNativeConfiguration(state, value);
    });
    platform.addDisposer(() => service?.dispose());
    const module = angular
        .createModule("ng.native", [])
        .factory(_native, () => {
        service ?? (service = createNativeRuntimeService(platform.window, state));
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
    for (const name of Object.keys(nativeElements)) {
        module.directive(nativeElementDirectiveName(name), [
            _native,
            _parse,
            _exceptionHandler,
            _window,
            (native, parse, exceptionHandler, runtimeWindow) => nativeElementDirective(name, native, parse, exceptionHandler, runtimeWindow),
        ]);
    }
    return module;
});

export { nativeElements, nativeModule };
