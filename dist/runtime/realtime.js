import { _sse, _webTransport, _websocket } from '../injection-tokens.js';
import { createLogService, createLogRuntimeConfiguration } from '../services/log/log.js';
import { applySseConfiguration, destroySseRuntimeConfiguration, createSseService, createSseRuntimeConfiguration } from '../services/sse/sse.js';
import { applyWebSocketConfiguration, destroyWebSocketRuntimeConfiguration, createWebSocketService, createWebSocketRuntimeConfiguration } from '../services/websocket/websocket.js';
import { applyWebTransportConfiguration, destroyWebTransportRuntimeConfiguration, createWebTransportService, createWebTransportRuntimeConfiguration } from '../services/webtransport/webtransport.js';
import { memoizeRuntimeModule, getRuntimeComposition } from './custom-ng.js';

function createRuntimeLog(angular) {
    const { platform } = getRuntimeComposition(angular);
    return createLogService(createLogRuntimeConfiguration(), platform.console);
}
/** Registers managed WebSocket connections in a custom runtime. */
const websocketModule = memoizeRuntimeModule((angular) => {
    const composition = getRuntimeComposition(angular);
    const { configRegistry, platform } = composition;
    const configuration = createWebSocketRuntimeConfiguration();
    const runtimeWindow = platform.window;
    configRegistry.register(_websocket, (value) => {
        applyWebSocketConfiguration(configuration, value);
    });
    platform.addDisposer(() => {
        destroyWebSocketRuntimeConfiguration(configuration);
    });
    return angular
        .module("ng.websocket", [])
        .factory(_websocket, () => createWebSocketService(createRuntimeLog(angular), configuration, runtimeWindow.WebSocket, composition.exceptionHandlerState.service));
});
/** Registers managed Server-Sent Events connections in a custom runtime. */
const sseModule = memoizeRuntimeModule((angular) => {
    const composition = getRuntimeComposition(angular);
    const { configRegistry, platform } = composition;
    const configuration = createSseRuntimeConfiguration();
    const runtimeWindow = platform.window;
    configRegistry.register(_sse, (value) => {
        applySseConfiguration(configuration, value);
    });
    platform.addDisposer(() => {
        destroySseRuntimeConfiguration(configuration);
    });
    return angular
        .module("ng.sse", [])
        .factory(_sse, () => createSseService(createRuntimeLog(angular), configuration, () => runtimeWindow.EventSource, composition.exceptionHandlerState.service));
});
/** Registers managed WebTransport sessions in a custom runtime. */
const webTransportModule = memoizeRuntimeModule((angular) => {
    const composition = getRuntimeComposition(angular);
    const { configRegistry, platform } = composition;
    const configuration = createWebTransportRuntimeConfiguration();
    const runtimeWindow = platform.window;
    configRegistry.register(_webTransport, (value) => {
        applyWebTransportConfiguration(configuration, value);
    });
    platform.addDisposer(() => {
        destroyWebTransportRuntimeConfiguration(configuration);
    });
    return angular
        .module("ng.webTransport", [])
        .factory(_webTransport, () => createWebTransportService(createRuntimeLog(angular), configuration, () => runtimeWindow.WebTransport, runtimeWindow.location.href, composition.exceptionHandlerState.service));
});
/**
 * Registers managed websocket, SSE, and WebTransport services in a custom
 * AngularTS runtime.
 */
const realtimeModule = memoizeRuntimeModule((angular) => angular.module("ng.realtime", [
    websocketModule(angular).name,
    sseModule(angular).name,
    webTransportModule(angular).name,
]));

export { realtimeModule, sseModule, webTransportModule, websocketModule };
