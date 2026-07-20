import { _websocket, _sse, _webTransport } from '../injection-tokens.js';
import { createLogService, createLogRuntimeConfiguration } from '../services/log/log.js';
import { applySseConfiguration, destroySseRuntimeConfiguration, createSseService, createSseRuntimeConfiguration } from '../services/sse/sse.js';
import { applyWebSocketConfiguration, destroyWebSocketRuntimeConfiguration, createWebSocketService, createWebSocketRuntimeConfiguration } from '../services/websocket/websocket.js';
import { applyWebTransportConfiguration, destroyWebTransportRuntimeConfiguration, createWebTransportService, createWebTransportRuntimeConfiguration } from '../services/webtransport/webtransport.js';

/**
 * Registers managed websocket, SSE, and WebTransport services in a custom
 * AngularTS runtime.
 */
const realtimeModule = (angular) => {
    const runtime = angular;
    const { configRegistry, platform } = runtime._composition;
    const websocket = createWebSocketRuntimeConfiguration();
    const sse = createSseRuntimeConfiguration();
    const webTransport = createWebTransportRuntimeConfiguration();
    const log = createLogService(createLogRuntimeConfiguration(), platform.console);
    const runtimeWindow = platform.window;
    configRegistry.register(_websocket, (value) => {
        applyWebSocketConfiguration(websocket, value);
    });
    configRegistry.register(_sse, (value) => {
        applySseConfiguration(sse, value);
    });
    configRegistry.register(_webTransport, (value) => {
        applyWebTransportConfiguration(webTransport, value);
    });
    platform.addDisposer(() => {
        destroyWebSocketRuntimeConfiguration(websocket);
        destroySseRuntimeConfiguration(sse);
        destroyWebTransportRuntimeConfiguration(webTransport);
    });
    return angular
        .module("ng.realtime", [])
        .factory(_websocket, () => createWebSocketService(log, websocket, runtimeWindow.WebSocket))
        .factory(_sse, () => createSseService(log, sse, () => runtimeWindow.EventSource))
        .factory(_webTransport, () => createWebTransportService(log, webTransport, () => runtimeWindow.WebTransport, runtimeWindow.location.href));
};

export { realtimeModule };
