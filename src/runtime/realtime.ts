import type { RuntimeModule } from "../angular-runtime.ts";
import type { RuntimeComposition } from "../core/composition/runtime-composition.ts";
import { _sse, _websocket, _webTransport } from "../injection-tokens.ts";
import {
  createLogRuntimeConfiguration,
  createLogService,
} from "../services/log/log.ts";
import {
  applySseConfiguration,
  createSseRuntimeConfiguration,
  createSseService,
  destroySseRuntimeConfiguration,
  type SseConfig,
} from "../services/sse/sse.ts";
import {
  applyWebSocketConfiguration,
  createWebSocketRuntimeConfiguration,
  createWebSocketService,
  destroyWebSocketRuntimeConfiguration,
  type WebSocketConfig,
} from "../services/websocket/websocket.ts";
import {
  applyWebTransportConfiguration,
  createWebTransportRuntimeConfiguration,
  createWebTransportService,
  destroyWebTransportRuntimeConfiguration,
  type WebTransportConfig,
} from "../services/webtransport/webtransport.ts";

/**
 * Registers managed websocket, SSE, and WebTransport services in a custom
 * AngularTS runtime.
 */
export const realtimeModule: RuntimeModule = (angular) => {
  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
  const { configRegistry, platform } = runtime._composition;
  const websocket = createWebSocketRuntimeConfiguration();
  const sse = createSseRuntimeConfiguration();
  const webTransport = createWebTransportRuntimeConfiguration();
  const log = createLogService(
    createLogRuntimeConfiguration(),
    platform.console,
  );
  const runtimeWindow = platform.window as Window & {
    EventSource: typeof EventSource;
    WebSocket: typeof WebSocket;
    WebTransport?: new (
      url: string,
      options?: WebTransportOptions,
    ) => WebTransport;
  };

  configRegistry.register(_websocket, (value) => {
    applyWebSocketConfiguration(
      websocket,
      value as {
        defaults?: WebSocketConfig;
      },
    );
  });
  configRegistry.register(_sse, (value) => {
    applySseConfiguration(sse, value as { defaults?: SseConfig });
  });
  configRegistry.register(_webTransport, (value) => {
    applyWebTransportConfiguration(
      webTransport,
      value as {
        defaults?: WebTransportConfig;
      },
    );
  });
  platform.addDisposer(() => {
    destroyWebSocketRuntimeConfiguration(websocket);
    destroySseRuntimeConfiguration(sse);
    destroyWebTransportRuntimeConfiguration(webTransport);
  });

  return angular
    .module("ng.realtime", [])
    .factory(_websocket, () =>
      createWebSocketService(log, websocket, runtimeWindow.WebSocket),
    )
    .factory(_sse, () =>
      createSseService(log, sse, () => runtimeWindow.EventSource),
    )
    .factory(_webTransport, () =>
      createWebTransportService(
        log,
        webTransport,
        () => runtimeWindow.WebTransport,
        runtimeWindow.location.href,
      ),
    );
};
